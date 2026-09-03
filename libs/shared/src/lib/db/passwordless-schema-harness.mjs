import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PGlite } from '@electric-sql/pglite';

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const migrationsRoot = resolve(currentDirectory, '../../../../../drizzle');
const client = new PGlite();
const checks = [];

async function rejects(operation) {
  await assert.rejects(operation);
}

try {
  const migrationFiles = readdirSync(migrationsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => resolve(migrationsRoot, entry.name, 'migration.sql'))
    .filter(existsSync)
    .sort();

  for (const path of migrationFiles) {
    for (const statement of readFileSync(path, 'utf8').split('--> statement-breakpoint')) {
      if (statement.trim()) await client.exec(statement);
    }
  }

  const userColumns = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'users'`,
  );
  const tables = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
  const columnNames = userColumns.rows.map(({ column_name }) => column_name);
  const tableNames = tables.rows.map(({ table_name }) => table_name);

  assert(!columnNames.includes('password_hash'));
  assert(!columnNames.includes('password_configured'));
  assert(!tableNames.includes('user_devices'));
  assert(!tableNames.includes('auth_verification_challenges'));
  assert(!tableNames.includes('account_passkey_enrollments'));
  assert(tableNames.includes('auth_email_challenges'));
  assert(tableNames.includes('auth_webauthn_challenges'));
  checks.push('migration-history');

  const createdAt = new Date('2026-08-31T06:00:00.000Z');
  const emailExpiresAt = new Date('2026-08-31T06:10:00.000Z');

  await client.query(
    `INSERT INTO auth_email_challenges
       (id, flow_id, normalized_email, pin_hash, client_context_hash, expires_at, last_sent_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $7)`,
    ['email-1', 'flow-1', 'new@example.com', 'pin-hash-1', 'context-hash-1', emailExpiresAt, createdAt],
  );
  await rejects(
    client.query(
      `INSERT INTO auth_email_challenges
         (id, flow_id, normalized_email, pin_hash, client_context_hash, expires_at, last_sent_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $7)`,
      ['email-2', 'flow-1', 'new@example.com', 'pin-hash-2', 'context-hash-1', emailExpiresAt, createdAt],
    ),
  );
  await client.query(`UPDATE auth_email_challenges SET superseded_at = $1 WHERE id = 'email-1'`, [createdAt]);
  await client.query(
    `INSERT INTO auth_email_challenges
       (id, flow_id, normalized_email, pin_hash, client_context_hash, expires_at, last_sent_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $7)`,
    ['email-2', 'flow-1', 'new@example.com', 'pin-hash-2', 'context-hash-1', emailExpiresAt, createdAt],
  );
  await rejects(client.query(`UPDATE auth_email_challenges SET attempt_count = 6 WHERE id = 'email-2'`));
  await rejects(
    client.query(
      `INSERT INTO auth_email_challenges
         (id, flow_id, normalized_email, purpose, pin_hash, client_context_hash, expires_at, last_sent_at, created_at, updated_at)
       VALUES ($1, $2, $3, 'sign_up', $4, $5, $6, $7, $7, $7)`,
      [
        'email-legacy',
        'flow-legacy',
        'new@example.com',
        'pin-hash-legacy',
        'context-hash-1',
        emailExpiresAt,
        createdAt,
      ],
    ),
  );
  checks.push('pre-user-email-challenge');

  const consumedAt = new Date('2026-08-31T06:01:00.000Z');
  const consume = () =>
    client.query(
      `UPDATE auth_email_challenges
       SET consumed_at = $1, updated_at = $1
       WHERE id = 'email-2' AND consumed_at IS NULL AND superseded_at IS NULL AND expires_at > $1 AND attempt_count < 5
       RETURNING id`,
      [consumedAt],
    );
  const consumptionResults = await Promise.all([consume(), consume()]);

  assert.deepEqual(
    consumptionResults.flatMap(({ rows }) => rows),
    [{ id: 'email-2' }],
  );
  checks.push('single-use-consumption');

  const insertUser = (id) => client.query(`INSERT INTO users (id, email) VALUES ($1, 'identity@example.com')`, [id]);
  const identityResults = await Promise.allSettled([insertUser('user-jit-1'), insertUser('user-jit-2')]);

  assert.equal(identityResults.filter(({ status }) => status === 'fulfilled').length, 1);
  assert.equal(identityResults.filter(({ status }) => status === 'rejected').length, 1);
  checks.push('concurrent-identity');

  const webauthnExpiresAt = new Date('2026-08-31T06:05:00.000Z');

  await client.query(
    `INSERT INTO auth_webauthn_challenges
       (id, challenge_hash, purpose, ceremony_type, session_binding, rp_id, origin, user_verification, expires_at, created_at, updated_at)
     VALUES ($1, $2, 'discoverable_authentication', 'authentication', $3, $4, $5, 'required', $6, $7, $7)`,
    [
      'webauthn-discoverable',
      'challenge-hash-1',
      'anonymous-session',
      'localhost',
      'http://localhost:4200',
      webauthnExpiresAt,
      createdAt,
    ],
  );
  await client.query(
    `INSERT INTO auth_webauthn_challenges
       (id, challenge_hash, purpose, ceremony_type, session_binding, flow_id, credential_id, allow_credential_ids, rp_id, origin, user_verification, expires_at, created_at, updated_at)
     VALUES ($1, $2, 'restricted_authentication', 'authentication', $3, $4, $5, $6, $7, $8, 'required', $9, $10, $10)`,
    [
      'webauthn-restricted',
      'challenge-hash-2',
      'restricted-session',
      'flow-1',
      'credential-1',
      JSON.stringify(['credential-1']),
      'localhost',
      'http://localhost:4200',
      webauthnExpiresAt,
      createdAt,
    ],
  );
  await rejects(
    client.query(
      `INSERT INTO auth_webauthn_challenges
         (id, account_id, challenge_hash, purpose, ceremony_type, session_binding, rp_id, origin, user_verification, expires_at, created_at, updated_at)
       VALUES ($1, $2, $3, 'discoverable_authentication', 'authentication', $4, $5, $6, 'required', $7, $8, $8)`,
      [
        'webauthn-invalid',
        'account-not-allowed',
        'challenge-hash-3',
        'anonymous-session',
        'localhost',
        'http://localhost:4200',
        webauthnExpiresAt,
        createdAt,
      ],
    ),
  );
  checks.push('webauthn-context');

  await client.query(
    `INSERT INTO accounts (id, name, slug, owner_user_id)
     VALUES ('account-jit', 'JIT account', 'jit-account', 'user-jit-1')`,
  );
  const insertCredential = (id) =>
    client.query(
      `INSERT INTO account_passkey_credentials
         (id, account_id, user_id, credential_id, public_key, rp_id, label, enrollment_flow_id)
       VALUES ($1, 'account-jit', 'user-jit-1', 'credential-unique', 'public-key', 'localhost', $2, 'flow-1')`,
      [id, id],
    );

  await insertCredential('passkey-1');
  await rejects(insertCredential('passkey-2'));
  checks.push('credential-uniqueness');

  const indexes = await client.query(
    `SELECT indexname FROM pg_indexes
     WHERE tablename IN ('auth_email_challenges', 'auth_webauthn_challenges', 'account_passkey_credentials')`,
  );
  const indexNames = indexes.rows.map(({ indexname }) => indexname);

  for (const indexName of [
    'auth_email_challenges_flow_active_idx',
    'auth_email_challenges_expiry_idx',
    'auth_email_challenges_attempt_idx',
    'auth_email_challenges_cooldown_idx',
    'auth_webauthn_challenges_hash_idx',
    'auth_webauthn_challenges_expiry_idx',
    'account_passkey_credentials_credential_idx',
  ]) {
    assert(indexNames.includes(indexName), `Missing index ${indexName}`);
  }
  checks.push('required-indexes');

  process.stdout.write(JSON.stringify({ checks }));
} finally {
  await client.close();
}
