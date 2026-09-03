import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { basename, join } from 'node:path';

type ProjectStoreManifest = {
  schemaVersion: 1;
  projectId: string;
  generation: number;
  stateChecksum: string;
  eventsChecksum: string;
  entityCounts: Record<string, number>;
};

type ProjectStoreTransaction = {
  schemaVersion: 1;
  id: string;
  previous: { stateChecksum: string; eventsChecksum: string; manifestChecksum: string };
  next: { stateChecksum: string; eventsChecksum: string; manifestChecksum: string };
};

type CommitStep = 'prepared' | 'state-installed' | 'events-installed' | 'manifest-installed';
type CommitOptions = { allowInvalidCurrent?: boolean; observe?: (step: CommitStep) => void };

const stableJson = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;
const checksum = (value: string): string => createHash('sha256').update(value).digest('hex');
const files = (directory: string) => ({
  state: join(directory, 'state.json'),
  events: join(directory, 'events.ndjson'),
  manifest: join(directory, 'manifest.json'),
  transaction: join(directory, '.project-transaction.json'),
  transactions: join(directory, '.project-transactions'),
});

const atomicWriteText = (location: string, text: string): void => {
  const temporary = `${location}.${randomUUID()}.tmp`;
  writeFileSync(temporary, text, 'utf8');
  renameSync(temporary, location);
};

const parseManifest = (text: string): ProjectStoreManifest => {
  const value = JSON.parse(text) as Partial<ProjectStoreManifest>;
  if (
    value.schemaVersion !== 1 ||
    typeof value.projectId !== 'string' ||
    !Number.isInteger(value.generation) ||
    typeof value.stateChecksum !== 'string' ||
    typeof value.eventsChecksum !== 'string' ||
    !value.entityCounts ||
    typeof value.entityCounts !== 'object'
  ) {
    throw new Error('Malformed project store manifest');
  }
  return value as ProjectStoreManifest;
};

const entityCounts = (stateText: string): Record<string, number> => {
  const state = JSON.parse(stateText) as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(state)
      .filter(([, value]) => Array.isArray(value))
      .map(([key, value]) => [key, (value as unknown[]).length]),
  );
};

const assertCurrentMatchesManifest = (directory: string): ProjectStoreManifest => {
  const location = files(directory);
  const manifest = parseManifest(readFileSync(location.manifest, 'utf8'));
  const stateText = readFileSync(location.state, 'utf8');
  const eventsText = readFileSync(location.events, 'utf8');
  if (manifest.projectId !== basename(directory)) throw new Error('Project store identity mismatch');
  if (checksum(stateText) !== manifest.stateChecksum || checksum(eventsText) !== manifest.eventsChecksum) {
    throw new Error('Project store checksum mismatch');
  }
  if (JSON.stringify(entityCounts(stateText)) !== JSON.stringify(manifest.entityCounts)) {
    throw new Error('Project store entity count mismatch');
  }
  return manifest;
};

const recoverProjectStoreTransaction = (directory: string): void => {
  const location = files(directory);
  if (!existsSync(location.transaction)) return;
  const transaction = JSON.parse(readFileSync(location.transaction, 'utf8')) as ProjectStoreTransaction;
  if (transaction.schemaVersion !== 1 || !/^[a-f0-9-]{36}$/.test(transaction.id)) {
    throw new Error('Malformed project store transaction');
  }
  const stage = join(location.transactions, transaction.id);
  const staged = {
    state: readFileSync(join(stage, 'state.json'), 'utf8'),
    events: readFileSync(join(stage, 'events.ndjson'), 'utf8'),
    manifest: readFileSync(join(stage, 'manifest.json'), 'utf8'),
  };
  if (
    checksum(staged.state) !== transaction.next.stateChecksum ||
    checksum(staged.events) !== transaction.next.eventsChecksum ||
    checksum(staged.manifest) !== transaction.next.manifestChecksum
  ) {
    throw new Error('Project store recovery payload mismatch');
  }
  for (const [kind, path] of [
    ['state', location.state],
    ['events', location.events],
    ['manifest', location.manifest],
  ] as const) {
    const currentChecksum = existsSync(path) ? checksum(readFileSync(path, 'utf8')) : '';
    const previousChecksum =
      kind === 'state'
        ? transaction.previous.stateChecksum
        : kind === 'events'
          ? transaction.previous.eventsChecksum
          : transaction.previous.manifestChecksum;
    const nextChecksum =
      kind === 'state'
        ? transaction.next.stateChecksum
        : kind === 'events'
          ? transaction.next.eventsChecksum
          : transaction.next.manifestChecksum;
    if (currentChecksum !== previousChecksum && currentChecksum !== nextChecksum) {
      throw new Error(`Project store recovery ${kind} mismatch`);
    }
  }
  atomicWriteText(location.state, staged.state);
  atomicWriteText(location.events, staged.events);
  atomicWriteText(location.manifest, staged.manifest);
  rmSync(location.transaction, { force: true });
  rmSync(stage, { recursive: true, force: true });
};

const commitProjectStore = (
  directory: string,
  projectId: string,
  stateText: string,
  eventsText: string,
  options: CommitOptions = {},
): void => {
  mkdirSync(directory, { recursive: true });
  const location = files(directory);
  recoverProjectStoreTransaction(directory);
  const manifestExists = existsSync(location.manifest);
  const currentManifest = manifestExists
    ? options.allowInvalidCurrent
      ? parseManifest(readFileSync(location.manifest, 'utf8'))
      : assertCurrentMatchesManifest(directory)
    : undefined;
  if (currentManifest && currentManifest.projectId !== projectId) throw new Error('Project store identity mismatch');

  const nextManifestText = stableJson({
    schemaVersion: 1,
    projectId,
    generation: (currentManifest?.generation ?? 0) + 1,
    stateChecksum: checksum(stateText),
    eventsChecksum: checksum(eventsText),
    entityCounts: entityCounts(stateText),
  } satisfies ProjectStoreManifest);
  const id = randomUUID();
  const stage = join(location.transactions, id);
  mkdirSync(stage, { recursive: true });
  writeFileSync(join(stage, 'state.json'), stateText, 'utf8');
  writeFileSync(join(stage, 'events.ndjson'), eventsText, 'utf8');
  writeFileSync(join(stage, 'manifest.json'), nextManifestText, 'utf8');

  const previousStateChecksum = existsSync(location.state) ? checksum(readFileSync(location.state, 'utf8')) : '';
  const previousEventsChecksum = existsSync(location.events) ? checksum(readFileSync(location.events, 'utf8')) : '';
  const previousManifestChecksum = existsSync(location.manifest)
    ? checksum(readFileSync(location.manifest, 'utf8'))
    : '';
  const transaction: ProjectStoreTransaction = {
    schemaVersion: 1,
    id,
    previous: {
      stateChecksum: previousStateChecksum,
      eventsChecksum: previousEventsChecksum,
      manifestChecksum: previousManifestChecksum,
    },
    next: {
      stateChecksum: checksum(stateText),
      eventsChecksum: checksum(eventsText),
      manifestChecksum: checksum(nextManifestText),
    },
  };
  atomicWriteText(location.transaction, stableJson(transaction));
  options.observe?.('prepared');
  atomicWriteText(location.state, stateText);
  options.observe?.('state-installed');
  atomicWriteText(location.events, eventsText);
  options.observe?.('events-installed');
  atomicWriteText(location.manifest, nextManifestText);
  options.observe?.('manifest-installed');
  rmSync(location.transaction, { force: true });
  rmSync(stage, { recursive: true, force: true });
};

const initializeProjectStore = (directory: string, projectId: string, state: unknown): void => {
  const location = files(directory);
  if (existsSync(location.manifest) || existsSync(location.state) || existsSync(location.events)) return;
  commitProjectStore(directory, projectId, stableJson(state), '');
};

export {
  assertCurrentMatchesManifest,
  checksum,
  commitProjectStore,
  initializeProjectStore,
  recoverProjectStoreTransaction,
  stableJson,
};
export type { CommitOptions, CommitStep, ProjectStoreManifest };
