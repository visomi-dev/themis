import { createHash } from 'node:crypto';

import { parseEncryptedEnvelope, type EncryptedEnvelope } from './encrypted-envelope';

type LegacyProjectRecord = {
  activity?: unknown;
  context?: unknown;
  id: string;
  projectId: string;
  updatedAt?: string;
};

type MigrationDecision =
  | { kind: 'migrated'; envelope: EncryptedEnvelope }
  | { kind: 'duplicate'; fingerprint: string }
  | { kind: 'deferred'; reason: 'unavailable' | 'partial' }
  | { kind: 'rejected'; reason: 'malformed' };

type AgentEncrypt = (payload: string) => {
  authTag: string;
  ciphertext: string;
  nonce: string;
};

type MigrationInput = {
  accountId: string;
  envelopeId: string;
  record: LegacyProjectRecord;
  workspaceId: string;
  now?: Date;
  encrypt: AgentEncrypt;
};

type MigrationLedgerPersistence = {
  load: () => Readonly<Record<string, string>>;
  save: (fingerprints: Readonly<Record<string, string>>) => void;
};

const MAX_MIGRATION_PAYLOAD_BYTES = 256 * 1024;

function isPlainJsonValue(value: unknown): boolean {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return true;
  }
  if (typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.every(isPlainJsonValue);
  const prototype = Object.getPrototypeOf(value);

  return (prototype === Object.prototype || prototype === null) && Object.values(value).every(isPlainJsonValue);
}

function fingerprint(envelope: EncryptedEnvelope): string {
  return createHash('sha256')
    .update(`${envelope.envelopeId}:${envelope.revision}:${envelope.ciphertext}:${envelope.authTag}`)
    .digest('hex');
}

/**
 * Converts one legacy row only after the local agent has supplied ciphertext.
 * The server may coordinate this function's result, but must not construct it
 * from plaintext or use the legacy fields as a fallback response.
 */
function migrateProjectRecord(input: MigrationInput): MigrationDecision {
  const { record } = input;

  if (!record.id || !record.projectId || record.projectId !== input.workspaceId) {
    return { kind: 'rejected', reason: 'malformed' };
  }

  const hasContext = record.context !== undefined && record.context !== null;
  const hasActivity = record.activity !== undefined && record.activity !== null;

  if (!hasContext && !hasActivity) {
    return { kind: 'deferred', reason: 'unavailable' };
  }

  if (hasContext !== hasActivity) {
    return { kind: 'deferred', reason: 'partial' };
  }

  if (
    !isPlainJsonValue(record.context) ||
    !isPlainJsonValue(record.activity) ||
    typeof record.context !== 'object' ||
    record.context === null ||
    Array.isArray(record.context) ||
    !Array.isArray(record.activity)
  ) {
    return { kind: 'rejected', reason: 'malformed' };
  }

  let payload: string;

  try {
    payload = JSON.stringify({ activity: record.activity, context: record.context });
  } catch {
    return { kind: 'rejected', reason: 'malformed' };
  }
  if (Buffer.byteLength(payload, 'utf8') > MAX_MIGRATION_PAYLOAD_BYTES) {
    return { kind: 'rejected', reason: 'malformed' };
  }

  let envelope: EncryptedEnvelope;

  try {
    const encrypted = input.encrypt(payload);

    envelope = parseEncryptedEnvelope({
      associatedData: { accountId: input.accountId, migration: 'project-context-activity-v1' },
      authTag: encrypted.authTag,
      ciphertext: encrypted.ciphertext,
      createdAt: input.now?.toISOString() ?? new Date().toISOString(),
      envelopeId: input.envelopeId,
      format: 'themis.encrypted-envelope',
      kind: 'sync-object',
      metadata: { source: 'local-agent-migration' },
      nonce: encrypted.nonce,
      recordType: 'project-context-activity',
      revision: 1,
      version: 1,
      workspaceId: input.workspaceId,
    });
  } catch {
    return { kind: 'rejected', reason: 'malformed' };
  }

  return { kind: 'migrated', envelope };
}

class MigrationLedger {
  private readonly fingerprints: Map<string, string>;

  constructor(private readonly persistence?: MigrationLedgerPersistence) {
    this.fingerprints = new Map(Object.entries(persistence?.load() ?? {}));
  }

  accept(decision: MigrationDecision): MigrationDecision {
    if (decision.kind !== 'migrated') {
      return decision;
    }

    const value = fingerprint(decision.envelope);
    const previous = this.fingerprints.get(decision.envelope.envelopeId);

    if (previous !== undefined) {
      return previous === value ? { kind: 'duplicate', fingerprint: value } : { kind: 'rejected', reason: 'malformed' };
    }

    this.fingerprints.set(decision.envelope.envelopeId, value);
    this.persistence?.save(Object.fromEntries(this.fingerprints));

    return decision;
  }
}

export { MigrationLedger, migrateProjectRecord };
export type { AgentEncrypt, LegacyProjectRecord, MigrationDecision, MigrationInput, MigrationLedgerPersistence };
