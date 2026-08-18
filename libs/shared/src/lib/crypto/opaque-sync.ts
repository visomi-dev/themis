import { parseEncryptedEnvelope, serializeEncryptedEnvelope, type EncryptedEnvelope } from './encrypted-envelope';

type StoredOpaqueEnvelope = {
  accountId: string;
  cursor: number;
  expiresAt: number;
  envelope: EncryptedEnvelope;
  workspaceId: string;
};

type AppendResult = { cursor: number; duplicate: boolean; envelope: EncryptedEnvelope };

class OpaqueSyncStore {
  private readonly records: StoredOpaqueEnvelope[] = [];
  private readonly latestByEnvelope = new Map<string, StoredOpaqueEnvelope>();
  private highWaterCursor = 0;

  constructor(private readonly retentionMs = 30 * 24 * 60 * 60 * 1000) {}

  append(accountId: string, workspaceId: string, input: unknown, now = Date.now()): AppendResult {
    const envelope = parseEncryptedEnvelope(input);

    if (envelope.kind !== 'sync-object' || envelope.workspaceId !== workspaceId) {
      throw new Error('Envelope is not authorized for this workspace.');
    }

    this.prune(now);
    const existing = this.latestByEnvelope.get(this.envelopeKey(accountId, workspaceId, envelope.envelopeId));

    if (existing) {
      if (envelope.revision <= existing.envelope.revision) {
        if (serializeEncryptedEnvelope(existing.envelope) === serializeEncryptedEnvelope(envelope)) {
          return { cursor: existing.cursor, duplicate: true, envelope: existing.envelope };
        }

        throw new Error('Envelope revision is a replay.');
      }
    }

    const cursor = this.highWaterCursor + 1;
    const record = { accountId, cursor, expiresAt: now + this.retentionMs, envelope, workspaceId };

    this.records.push(record);
    this.latestByEnvelope.set(this.envelopeKey(accountId, workspaceId, envelope.envelopeId), record);
    this.highWaterCursor = cursor;

    return { cursor, duplicate: false, envelope };
  }

  list(accountId: string, workspaceId: string, afterCursor = 0, limit = 100, now = Date.now()) {
    this.prune(now);

    return this.records
      .filter(
        (record) => record.accountId === accountId && record.workspaceId === workspaceId && record.cursor > afterCursor,
      )
      .slice(0, limit)
      .map(({ cursor, envelope }) => ({ cursor, envelope }));
  }

  clear() {
    this.records.length = 0;
    this.latestByEnvelope.clear();
    this.highWaterCursor = 0;
  }

  private prune(now: number) {
    const retained = this.records.filter(({ expiresAt }) => expiresAt > now);

    this.records.length = 0;
    this.records.push(...retained);
  }

  private envelopeKey(accountId: string, workspaceId: string, envelopeId: string) {
    return `${accountId}\u0000${workspaceId}\u0000${envelopeId}`;
  }
}

const opaqueSyncStore = new OpaqueSyncStore();

export { OpaqueSyncStore, opaqueSyncStore };
export type { AppendResult, StoredOpaqueEnvelope };
