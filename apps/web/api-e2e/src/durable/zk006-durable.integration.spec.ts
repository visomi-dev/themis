import { randomUUID } from 'node:crypto';

import { Pool } from 'pg';

import { PostgresOpaqueSyncRepository, RailwayS3ObjectStore, serializeEncryptedEnvelope, sha256 } from 'shared';

const databaseUrl = process.env['DATABASE_URL'] ?? 'postgresql://postgres@127.0.0.1:5432/themis';
const endpoint = process.env['OPAQUE_SYNC_S3_ENDPOINT'] ?? 'http://127.0.0.1:9000';
const bucket = process.env['OPAQUE_SYNC_S3_BUCKET'] ?? 'themis-opaque-sync';
const accessKey = process.env['OPAQUE_SYNC_S3_ACCESS_KEY'] ?? 'minioadmin';
const secretKey = process.env['OPAQUE_SYNC_S3_SECRET_KEY'] ?? 'minioadmin';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function syntheticEnvelope(workspaceId: string, envelopeId: string, revision: number) {
  return {
    format: 'themis.encrypted-envelope' as const,
    version: 1 as const,
    kind: 'sync-object' as const,
    envelopeId,
    workspaceId,
    recordType: 'synthetic-integration-test',
    revision,
    createdAt: new Date().toISOString(),
    associatedData: { fixture: 'zk006-durable-integration' },
    metadata: { revision: String(revision) },
    nonce: Buffer.from(`nonce-${revision}`).toString('base64url'),
    ciphertext: Buffer.from(`synthetic-ciphertext-${revision}-${randomUUID()}`).toString('base64url'),
    authTag: Buffer.from(`auth-tag-${revision}`).toString('base64url'),
  };
}

describe('ZK-006 durable opaque sync integration', () => {
  it('persists ciphertext in MinIO and metadata/tombstones in PostgreSQL', async () => {
    const pool = new Pool({ connectionString: databaseUrl });
    const objects = new RailwayS3ObjectStore({ endpoint, bucket, accessKey, secretKey });
    const repository = new PostgresOpaqueSyncRepository(pool, objects);
    const recoveryPool = new Pool({ connectionString: databaseUrl });
    const accountId = `zk006-it-account-${randomUUID()}`;
    const workspaceId = `zk006-it-workspace-${randomUUID()}`;
    const userId = `zk006-it-user-${randomUUID()}`;
    const envelopeId = `zk006-it-envelope-${randomUUID()}`;
    const plaintextMarker = 'zk006-plaintext-must-never-be-persisted';

    try {
      await objects.ensureBucket();
      const migrationTables = await pool.query(`
      SELECT tablename AS table_name
      FROM pg_catalog.pg_tables
      WHERE tablename IN ('opaque_sync_cursors', 'opaque_sync_envelopes', 'opaque_sync_tombstones')
        AND schemaname = 'public'
    `);
      const connectionIdentity = await pool.query<{ current_user: string; current_database: string }>(
        'SELECT current_user, current_database()',
      );

      assert(
        migrationTables.rows.length === 3,
        `Required opaque-sync migrations are not applied (found ${migrationTables.rows.length} at ${databaseUrl} as ${connectionIdentity.rows[0].current_user}/${connectionIdentity.rows[0].current_database}).`,
      );

      await pool.query('INSERT INTO users (id, email, password_hash) VALUES ($1, $2, $3)', [
        userId,
        `${userId}@invalid.test`,
        'synthetic-password-hash',
      ]);
      await pool.query('INSERT INTO accounts (id, name, slug, owner_user_id) VALUES ($1, $2, $3, $4)', [
        accountId,
        'Synthetic ZK006 account',
        accountId,
        userId,
      ]);
      await pool.query(
        'INSERT INTO projects (id, account_id, name, slug, status, source_type, created_by_user_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [workspaceId, accountId, 'Synthetic ZK006 workspace', workspaceId, 'active', 'manual', userId],
      );

      const first = syntheticEnvelope(workspaceId, envelopeId, 1);
      const second = syntheticEnvelope(workspaceId, envelopeId, 2);
      const firstResult = await repository.append(accountId, workspaceId, first);
      const secondResult = await repository.append(accountId, workspaceId, second);

      assert(firstResult.cursor === 1 && secondResult.cursor === 2, 'Cursor ordering is not durable.');

      const rows = await pool.query<{
        object_key: string;
        ciphertext_sha256: string;
        revision: number;
        tombstoned_at: Date | null;
      }>(
        'SELECT object_key, ciphertext_sha256, revision, tombstoned_at FROM opaque_sync_envelopes WHERE account_id = $1 AND workspace_id = $2 ORDER BY revision',
        [accountId, workspaceId],
      );

      assert(rows.rows.length === 2, 'Expected two metadata-only envelope rows.');
      assert(
        rows.rows.every((row) => row.tombstoned_at === null),
        'Unexpected tombstone before deletion test.',
      );

      const storedCiphertext = await objects.get(rows.rows[1].object_key);

      assert(storedCiphertext !== undefined, 'Ciphertext object was not persisted in MinIO.');
      assert(
        new TextDecoder().decode(storedCiphertext) === serializeEncryptedEnvelope(second),
        'MinIO GET differs from PUT.',
      );
      assert(
        rows.rows[1].ciphertext_sha256 === sha256(storedCiphertext),
        'Object hash does not match PostgreSQL metadata.',
      );
      assert(!JSON.stringify(rows.rows).includes(plaintextMarker), 'Plaintext marker appeared in PostgreSQL metadata.');

      const columns = await pool.query<{ column_name: string }>(
        `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'opaque_sync_envelopes' AND column_name IN ('plaintext', 'payload', 'encryption_key', 'secret_key')`,
      );

      assert(columns.rows.length === 0, 'PostgreSQL durable envelope table contains a protected payload column.');

      await repository.tombstone(accountId, workspaceId, envelopeId, 2, 'synthetic-recovery-denial');
      const recoveredRepository = new PostgresOpaqueSyncRepository(
        recoveryPool,
        new RailwayS3ObjectStore({ endpoint, bucket, accessKey, secretKey }),
      );
      const recovered = await recoveredRepository.list(accountId, workspaceId);

      assert(recovered.length === 0, 'A fresh repository recovered a tombstoned envelope.');

      const tombstone = await pool.query(
        'SELECT revision, reason FROM opaque_sync_tombstones WHERE account_id = $1 AND workspace_id = $2 AND envelope_id = $3',
        [accountId, workspaceId, envelopeId],
      );

      assert(tombstone.rows.length === 1 && tombstone.rows[0].revision === 2, 'Tombstone is not durable.');

      expect({
        database: 'PostgreSQL metadata-only',
        objectStore: 'MinIO ciphertext PUT/GET',
        bucket,
        cursors: [firstResult.cursor, secondResult.cursor],
        hashAndReference: 'PASS',
        tombstoneRecoveryDenial: 'PASS',
        plaintextPersisted: false,
      }).toEqual(expect.objectContaining({ plaintextPersisted: false }));
    } finally {
      await pool.query('DELETE FROM accounts WHERE id = $1', [accountId]).catch(() => undefined);
      await recoveryPool.end();
      await pool.end();
    }
  });
});
