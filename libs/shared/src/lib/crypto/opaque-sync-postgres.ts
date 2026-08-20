import { randomUUID } from 'node:crypto';

import type { Pool, PoolClient } from 'pg';

import { env } from '../env';
import { getPool } from '../db/pool';

import { parseEncryptedEnvelope, serializeEncryptedEnvelope, type EncryptedEnvelope } from './encrypted-envelope';
import { RailwayS3ObjectStore, sha256, type OpaqueObjectStore } from './opaque-sync-object-store';

type DurableAppendResult = { cursor: number; duplicate: boolean; envelope: EncryptedEnvelope };
type DurableOpaqueSyncConfig = {
  bucket: string;
  endpoint: string;
  accessKey: string;
  secretKey: string;
};

class PostgresOpaqueSyncRepository {
  constructor(
    private readonly pool: Pool,
    private readonly objects: OpaqueObjectStore,
    private readonly retentionMs = 30 * 24 * 60 * 60 * 1000,
  ) {}

  static fromConfig(pool: Pool, config: DurableOpaqueSyncConfig): PostgresOpaqueSyncRepository {
    return new PostgresOpaqueSyncRepository(pool, new RailwayS3ObjectStore(config));
  }

  async append(accountId: string, workspaceId: string, input: unknown, now = new Date()): Promise<DurableAppendResult> {
    const envelope = parseEncryptedEnvelope(input);

    if (envelope.kind !== 'sync-object' || envelope.workspaceId !== workspaceId) {
      throw new Error('Envelope is not authorized for this workspace.');
    }

    const key = `${accountId}/${workspaceId}/${envelope.envelopeId}/${envelope.revision}-${randomUUID()}.json`;
    const body = Buffer.from(serializeEncryptedEnvelope(envelope));
    const client = await this.pool.connect();
    let uploaded = false;

    try {
      await client.query('BEGIN');
      const existing = await client.query<{
        cursor: number;
        revision: number;
        object_key: string;
        ciphertext_sha256: string;
      }>(
        `SELECT cursor, revision, object_key, ciphertext_sha256
         FROM opaque_sync_envelopes
         WHERE account_id = $1 AND workspace_id = $2 AND envelope_id = $3
         ORDER BY revision DESC LIMIT 1 FOR UPDATE`,
        [accountId, workspaceId, envelope.envelopeId],
      );
      const current = existing.rows[0];

      if (current && envelope.revision <= current.revision) {
        if (current.ciphertext_sha256 === sha256(body)) {
          await client.query('ROLLBACK');
          const existingBody = await this.objects.get(current.object_key);

          if (!existingBody) throw new Error('Opaque object reference is missing.');

          return {
            cursor: current.cursor,
            duplicate: true,
            envelope: parseEncryptedEnvelope(new TextDecoder().decode(existingBody)),
          };
        }
        throw new Error('Envelope revision is a replay.');
      }

      const cursorResult = await client.query<{ high_water_cursor: number }>(
        `INSERT INTO opaque_sync_cursors (account_id, workspace_id, high_water_cursor)
         VALUES ($1, $2, 1)
         ON CONFLICT (account_id, workspace_id) DO UPDATE
         SET high_water_cursor = opaque_sync_cursors.high_water_cursor + 1
         RETURNING high_water_cursor`,
        [accountId, workspaceId],
      );
      const cursor = cursorResult.rows[0].high_water_cursor;

      await this.objects.put(key, body);
      uploaded = true;
      await client.query(
        `INSERT INTO opaque_sync_envelopes
          (account_id, workspace_id, envelope_id, revision, cursor, object_key, ciphertext_sha256,
           record_type, created_at, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          accountId,
          workspaceId,
          envelope.envelopeId,
          envelope.revision,
          cursor,
          key,
          sha256(body),
          envelope.recordType,
          now,
          new Date(now.getTime() + this.retentionMs),
        ],
      );
      await client.query('COMMIT');

      return { cursor, duplicate: false, envelope };
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      if (uploaded) await this.objects.delete(key).catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async list(
    accountId: string,
    workspaceId: string,
    afterCursor = 0,
    limit = 100,
  ): Promise<Array<{ cursor: number; envelope: EncryptedEnvelope }>> {
    const result = await this.pool.query<{ cursor: number; object_key: string }>(
      `SELECT cursor, object_key FROM opaque_sync_envelopes
       WHERE account_id = $1 AND workspace_id = $2 AND cursor > $3 AND expires_at > now() AND tombstoned_at IS NULL
       ORDER BY cursor ASC LIMIT $4`,
      [accountId, workspaceId, afterCursor, limit],
    );
    const envelopes = await Promise.all(
      result.rows.map(async ({ cursor, object_key }) => {
        const body = await this.objects.get(object_key);

        if (!body) throw new Error('Opaque object reference is missing.');

        return { cursor, envelope: parseEncryptedEnvelope(new TextDecoder().decode(body)) };
      }),
    );

    return envelopes;
  }

  async tombstone(
    accountId: string,
    workspaceId: string,
    envelopeId: string,
    revision: number,
    reason = 'retention',
  ): Promise<void> {
    await this.pool.query(
      `UPDATE opaque_sync_envelopes SET tombstoned_at = now()
       WHERE account_id = $1 AND workspace_id = $2 AND envelope_id = $3 AND revision <= $4`,
      [accountId, workspaceId, envelopeId, revision],
    );
    await this.pool.query(
      `INSERT INTO opaque_sync_tombstones (account_id, workspace_id, envelope_id, revision, reason)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING`,
      [accountId, workspaceId, envelopeId, revision, reason],
    );
  }

  async withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');
      const result = await callback(client);

      await client.query('COMMIT');

      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

let configuredRepository: PostgresOpaqueSyncRepository | undefined;

function getConfiguredOpaqueSyncRepository(): PostgresOpaqueSyncRepository {
  if (env.OPAQUE_SYNC_STORAGE !== 'durable') throw new Error('Durable opaque sync storage is not enabled.');
  if (!env.OPAQUE_SYNC_S3_ENDPOINT || !env.OPAQUE_SYNC_S3_ACCESS_KEY || !env.OPAQUE_SYNC_S3_SECRET_KEY) {
    throw new Error('Durable opaque sync storage is missing object-store configuration.');
  }
  configuredRepository ??= PostgresOpaqueSyncRepository.fromConfig(getPool(), {
    endpoint: env.OPAQUE_SYNC_S3_ENDPOINT,
    bucket: env.OPAQUE_SYNC_S3_BUCKET,
    accessKey: env.OPAQUE_SYNC_S3_ACCESS_KEY,
    secretKey: env.OPAQUE_SYNC_S3_SECRET_KEY,
  });

  return configuredRepository;
}

export { PostgresOpaqueSyncRepository, getConfiguredOpaqueSyncRepository };
export type { DurableAppendResult, DurableOpaqueSyncConfig };
