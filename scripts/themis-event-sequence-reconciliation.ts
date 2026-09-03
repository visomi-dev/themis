import { createHash, randomUUID } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { basename, join, relative } from 'node:path';

import {
  assertCurrentMatchesManifest,
  commitProjectStore,
  recoverProjectStoreTransaction,
  type CommitStep,
} from '../libs/themis-workflow/src/lib/project-store-persistence.ts';

type JsonRecord = Record<string, unknown>;
type SequenceEvent = JsonRecord & {
  schemaVersion: 1;
  sequence: number;
  timestamp: string;
  actor: string;
  type: string;
  aggregateType: string;
  aggregateId: string;
  payload: JsonRecord;
};
type SequenceAnomaly = {
  duplicate: Array<{ position: number; sequence: number }>;
  missing: Array<{ position: number; after: number; before: number; count: number }>;
  outOfOrder: Array<{ position: number; previous: number; sequence: number }>;
};
type ReconciliationChecksums = { state: string; events: string; manifest: string };
type RemappingEntry = {
  position: number;
  legacySequence: number;
  canonicalSequence: number;
  eventFingerprint: string;
};
type ReconciliationLedger = {
  schemaVersion: 1;
  strategy: 'position-preserving-remapping-ledger';
  reconciliationId: string;
  projectId: string;
  phase: 'prepared' | 'reconciled' | 'rolled-back';
  backupId: string;
  eventCount: number;
  before: ReconciliationChecksums;
  after: ReconciliationChecksums;
  anomalies: SequenceAnomaly;
  remapping: RemappingEntry[];
};
type ReconciliationReport = {
  reconciliationId: string;
  projectId: string;
  dryRun: boolean;
  status: 'planned' | 'reconciled' | 'already-reconciled' | 'rolled-back';
  strategy: ReconciliationLedger['strategy'];
  eventCount: number;
  anomalies: SequenceAnomaly;
  backupId?: string;
  checksums: { before: ReconciliationChecksums; after: ReconciliationChecksums };
  artifacts?: { ledger: string; backupManifest: string };
};
type ReconciliationOptions = {
  dryRun?: boolean;
  observeCommit?: (step: CommitStep) => void;
};

const checksum = (value: string): string => createHash('sha256').update(value).digest('hex');
const stableJson = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;
const projectIdPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

const paths = (root: string, projectId: string) => {
  const project = join(root, '.themis', 'projects', projectId);
  const reconciliation = join(root, '.themis', 'reconciliation', projectId);
  return {
    project,
    state: join(project, 'state.json'),
    events: join(project, 'events.ndjson'),
    manifest: join(project, 'manifest.json'),
    reconciliation,
    ledger: join(reconciliation, 'ledger.json'),
    backups: join(reconciliation, 'backups'),
  };
};

const atomicWrite = (location: string, value: unknown): void => {
  mkdirSync(join(location, '..'), { recursive: true });
  const temporary = `${location}.${randomUUID()}.tmp`;
  writeFileSync(temporary, typeof value === 'string' ? value : stableJson(value), 'utf8');
  renameSync(temporary, location);
};

const assertProjectId = (projectId: string): void => {
  if (!projectIdPattern.test(projectId) || basename(projectId) !== projectId) {
    throw new Error('Sequence reconciliation requires a safe explicit target project');
  }
};

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.length > 0;
const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string');
const isOneOf = (value: unknown, allowed: readonly string[]): value is string =>
  typeof value === 'string' && allowed.includes(value);

const workItemStatuses = [
  'draft',
  'ready',
  'planned',
  'claimed',
  'in_progress',
  'review',
  'rework',
  'done',
  'blocked',
  'rejected',
  'cancelled',
] as const;
const sprintStatuses = ['draft', 'proposed', 'approved', 'active', 'closed'] as const;
const eventContracts: Record<string, { aggregateType: string; requiredPayload: string[] }> = {
  'project.created': { aggregateType: 'project', requiredPayload: ['projectId', 'status'] },
  'epic.created': { aggregateType: 'epic', requiredPayload: ['epicId', 'projectId', 'status'] },
  'workitem.created': { aggregateType: 'work_item', requiredPayload: ['id', 'title', 'status'] },
  'workitem.updated': { aggregateType: 'work_item', requiredPayload: ['previousStatus', 'status', 'changedFields'] },
  'workitem.transitioned': { aggregateType: 'work_item', requiredPayload: ['previousStatus', 'status'] },
  'workitem.claimed': { aggregateType: 'work_item', requiredPayload: ['agent', 'status'] },
  'dependency.added': { aggregateType: 'work_item', requiredPayload: ['from', 'to', 'relation'] },
  'sprint.proposed': { aggregateType: 'sprint', requiredPayload: ['sprintId', 'revisionId', 'version'] },
  'sprint.approved': { aggregateType: 'sprint', requiredPayload: ['revisionId', 'status'] },
  'sprint.activated': { aggregateType: 'sprint', requiredPayload: ['sprintId', 'revisionId', 'status'] },
  'sprint.evidence.added': { aggregateType: 'sprint', requiredPayload: ['sprintId', 'evidenceId', 'kind'] },
  'sprint.closed': { aggregateType: 'sprint', requiredPayload: ['projectId', 'sprintId', 'status'] },
  'sprints.removed': { aggregateType: 'project', requiredPayload: ['removedSprintIds', 'removedRevisionIds'] },
  'run.started': { aggregateType: 'work_item', requiredPayload: ['runId', 'workItemId', 'status'] },
  'run.finished': { aggregateType: 'run', requiredPayload: ['workItemId', 'status', 'terminationReason'] },
  'evidence.added': { aggregateType: 'run', requiredPayload: ['evidenceId', 'kind'] },
  'review.requested': { aggregateType: 'work_item', requiredPayload: ['reviewId', 'workItemId', 'reviewer'] },
  'review.submitted': { aggregateType: 'review', requiredPayload: ['verdict', 'workItemId', 'feedback'] },
};

const parseEvents = (eventsText: string): SequenceEvent[] =>
  eventsText
    .split('\n')
    .filter(Boolean)
    .map((line, index) => {
      let value: unknown;
      try {
        value = JSON.parse(line);
      } catch {
        throw new Error(`Malformed project event at position ${index + 1}`);
      }
      if (
        !isRecord(value) ||
        value.schemaVersion !== 1 ||
        !Number.isInteger(value.sequence) ||
        (value.sequence as number) < 1 ||
        typeof value.timestamp !== 'string' ||
        typeof value.actor !== 'string' ||
        typeof value.type !== 'string' ||
        typeof value.aggregateType !== 'string' ||
        typeof value.aggregateId !== 'string' ||
        !isRecord(value.payload)
      ) {
        throw new Error(`Malformed project event at position ${index + 1}`);
      }
      return value as SequenceEvent;
    });

const inventorySequences = (events: SequenceEvent[]): SequenceAnomaly => {
  const duplicate: SequenceAnomaly['duplicate'] = [];
  const missing: SequenceAnomaly['missing'] = [];
  const outOfOrder: SequenceAnomaly['outOfOrder'] = [];
  const seen = new Set<number>();
  events.forEach((event, index) => {
    const position = index + 1;
    if (seen.has(event.sequence)) duplicate.push({ position, sequence: event.sequence });
    seen.add(event.sequence);
    if (index === 0) {
      if (event.sequence > 1) missing.push({ position, after: 0, before: event.sequence, count: event.sequence - 1 });
      return;
    }
    const previous = events[index - 1]!.sequence;
    if (event.sequence < previous) outOfOrder.push({ position, previous, sequence: event.sequence });
    if (event.sequence > previous + 1) {
      missing.push({ position, after: previous, before: event.sequence, count: event.sequence - previous - 1 });
    }
  });
  return { duplicate, missing, outOfOrder };
};

const eventFingerprint = (event: SequenceEvent): string => {
  const { sequence: _sequence, ...preserved } = event;
  return checksum(JSON.stringify(preserved));
};

const validateStateAndReferences = (projectId: string, stateText: string, events: SequenceEvent[]): void => {
  let state: unknown;
  try {
    state = JSON.parse(stateText);
  } catch {
    throw new Error('Malformed project state');
  }
  if (!isRecord(state) || state.schemaVersion !== 2 || state.projectId !== projectId) {
    throw new Error('Project state identity or schema mismatch');
  }
  const collections = [
    'projects',
    'epics',
    'workItems',
    'dependencies',
    'sprints',
    'sprintItems',
    'revisions',
    'runs',
    'evidence',
    'sprintEvidence',
    'reviews',
  ] as const;
  for (const name of collections) {
    if (!Array.isArray(state[name]) || !(state[name] as unknown[]).every(isRecord)) {
      throw new Error(`Malformed project state collection: ${name}`);
    }
  }
  const projects = state.projects as JsonRecord[];
  const malformed = (kind: string): never => {
    throw new Error(`Malformed project state ${kind}`);
  };
  const hasStrings = (record: JsonRecord, keys: string[]): boolean =>
    keys.every((key) => isNonEmptyString(record[key]));
  const hasStringArrays = (record: JsonRecord, keys: string[]): boolean =>
    keys.every((key) => isStringArray(record[key]));
  if (
    projects.length !== 1 ||
    projects[0]?.id !== projectId ||
    !hasStrings(projects[0], ['id', 'name', 'summary', 'status', 'createdAt']) ||
    !isOneOf(projects[0].status, ['active', 'archived'])
  )
    malformed('project');

  const epics = state.epics as JsonRecord[];
  if (
    epics.some(
      (record) =>
        record.projectId !== projectId ||
        !hasStrings(record, ['id', 'projectId', 'title', 'summary', 'goal', 'status', 'createdAt']) ||
        !isOneOf(record.status, ['draft', 'active', 'done', 'cancelled']),
    )
  )
    malformed('epic');
  const epicIds = new Set(epics.map((record) => record.id as string));

  const workItems = state.workItems as JsonRecord[];
  if (
    workItems.some(
      (record) =>
        record.projectId !== projectId ||
        !hasStrings(record, ['id', 'projectId', 'title', 'summary', 'status']) ||
        !hasStringArrays(record, ['acceptanceCriteria', 'scopeIn', 'scopeOut', 'verificationStrategy']) ||
        !isOneOf(record.status, workItemStatuses) ||
        (record.epicId !== undefined && (!isNonEmptyString(record.epicId) || !epicIds.has(record.epicId))),
    )
  )
    malformed('work item');
  const workItemIds = new Set(workItems.map((record) => record.id as string));

  const sprints = state.sprints as JsonRecord[];
  if (
    sprints.some(
      (record) =>
        record.projectId !== projectId ||
        !hasStrings(record, ['id', 'projectId', 'goal', 'status', 'createdAt']) ||
        !isOneOf(record.status, sprintStatuses),
    )
  )
    malformed('sprint');
  const sprintIds = new Set(sprints.map((record) => record.id as string));

  const revisions = state.revisions as JsonRecord[];
  if (
    revisions.some(
      (record) =>
        record.projectId !== projectId ||
        !hasStrings(record, ['id', 'sprintId', 'projectId', 'status', 'why', 'what', 'how', 'createdAt']) ||
        !hasStringArrays(record, ['workItemIds', 'epicIds', 'nonGoals', 'definitionOfDone', 'verificationStrategy']) ||
        !Number.isInteger(record.version) ||
        (record.version as number) < 1 ||
        !isOneOf(record.status, ['proposed', 'approved']) ||
        !sprintIds.has(record.sprintId as string) ||
        !(record.workItemIds as string[]).every((id) => workItemIds.has(id)) ||
        !(record.epicIds as string[]).every((id) => epicIds.has(id)),
    )
  )
    malformed('revision');

  if (
    (state.dependencies as JsonRecord[]).some(
      (record) =>
        !hasStrings(record, ['from', 'to', 'relation']) ||
        record.relation !== 'blocks' ||
        !workItemIds.has(record.from as string) ||
        !workItemIds.has(record.to as string),
    )
  )
    malformed('dependency');
  if (
    (state.sprintItems as JsonRecord[]).some(
      (record) =>
        !hasStrings(record, ['sprintId', 'workItemId', 'addedAt']) ||
        !sprintIds.has(record.sprintId as string) ||
        !workItemIds.has(record.workItemId as string),
    )
  )
    malformed('sprint membership');

  const runs = state.runs as JsonRecord[];
  if (
    runs.some(
      (record) =>
        !hasStrings(record, ['id', 'workItemId', 'agent', 'status', 'startedAt']) ||
        !isOneOf(record.status, ['running', 'completed', 'failed']) ||
        !workItemIds.has(record.workItemId as string) ||
        (record.finishedAt !== undefined && !isNonEmptyString(record.finishedAt)) ||
        (record.terminationReason !== undefined && !isNonEmptyString(record.terminationReason)),
    )
  )
    malformed('run');
  const runIds = new Set(runs.map((record) => record.id as string));

  const evidence = state.evidence as JsonRecord[];
  if (
    evidence.some(
      (record) =>
        !hasStrings(record, ['id', 'runId', 'kind', 'summary', 'value', 'createdAt']) ||
        !isOneOf(record.kind, ['verification', 'implementation-diff', 'command', 'observation']) ||
        !runIds.has(record.runId as string),
    )
  )
    malformed('evidence');
  const sprintEvidence = state.sprintEvidence as JsonRecord[];
  if (
    sprintEvidence.some(
      (record) =>
        !hasStrings(record, ['id', 'sprintId', 'kind', 'summary', 'value', 'createdAt']) ||
        !isOneOf(record.kind, ['verification', 'command', 'observation']) ||
        !sprintIds.has(record.sprintId as string),
    )
  )
    malformed('sprint evidence');
  const reviews = state.reviews as JsonRecord[];
  if (
    reviews.some(
      (record) =>
        !hasStrings(record, ['id', 'workItemId', 'runId', 'reviewer', 'createdAt']) ||
        !workItemIds.has(record.workItemId as string) ||
        !runIds.has(record.runId as string) ||
        (record.verdict !== undefined && !isOneOf(record.verdict, ['accepted', 'rejected'])) ||
        (record.feedback !== undefined && !isNonEmptyString(record.feedback)) ||
        (record.decidedAt !== undefined && !isNonEmptyString(record.decidedAt)),
    )
  )
    malformed('review');
  const reviewIds = new Set(reviews.map((record) => record.id as string));

  const ids = new Set<string>();
  for (const name of collections) {
    for (const record of state[name] as JsonRecord[]) {
      if (typeof record.id !== 'string') continue;
      if (ids.has(record.id)) throw new Error('Ambiguous aggregate identity');
      ids.add(record.id);
    }
  }
  ids.add(projectId);
  const referenceKeys = new Set([
    'id',
    'projectId',
    'epicId',
    'workItemId',
    'sprintId',
    'revisionId',
    'runId',
    'evidenceId',
    'reviewId',
    'from',
    'to',
  ]);
  const validateReference = (key: string, value: unknown, location: string): void => {
    if (referenceKeys.has(key) && typeof value === 'string' && !ids.has(value)) {
      throw new Error(`Foreign or dangling reference in ${location}`);
    }
    if (
      key.endsWith('Ids') &&
      Array.isArray(value) &&
      value.some((entry) => typeof entry !== 'string' || !ids.has(entry))
    ) {
      throw new Error(`Foreign or dangling reference in ${location}`);
    }
  };
  for (const name of collections) {
    for (const record of state[name] as JsonRecord[]) {
      if ('projectId' in record && record.projectId !== projectId) throw new Error(`Foreign ${name} record`);
      for (const [key, value] of Object.entries(record)) validateReference(key, value, `state ${name}`);
    }
  }
  events.forEach((event, index) => {
    if ('projectId' in event && event.projectId !== projectId) {
      throw new Error(`Foreign project event at position ${index + 1}`);
    }
    const contract = eventContracts[event.type];
    const aggregateIds: Record<string, Set<string>> = {
      project: new Set([projectId]),
      epic: epicIds,
      work_item: workItemIds,
      sprint: sprintIds,
      run: runIds,
      review: reviewIds,
    };
    if (
      !contract ||
      event.aggregateType !== contract.aggregateType ||
      !aggregateIds[event.aggregateType]?.has(event.aggregateId)
    ) {
      throw new Error(`Malformed or foreign event aggregate at position ${index + 1}`);
    }
    if (
      contract.requiredPayload.some((key) => {
        const value = event.payload[key];
        if (key === 'version') return !Number.isInteger(value) || (value as number) < 1;
        if (key === 'changedFields' || key.endsWith('Ids')) return !isStringArray(value);
        return !isNonEmptyString(value);
      })
    ) {
      throw new Error(`Malformed project event payload at position ${index + 1}`);
    }
    if (
      (event.type.startsWith('workitem.') &&
        'status' in event.payload &&
        !isOneOf(event.payload.status, workItemStatuses)) ||
      (event.type.startsWith('sprint.') &&
        'status' in event.payload &&
        !isOneOf(event.payload.status, sprintStatuses)) ||
      (event.type.startsWith('run.') &&
        'status' in event.payload &&
        !isOneOf(event.payload.status, ['running', 'completed', 'failed'])) ||
      (event.type === 'project.created' && !isOneOf(event.payload.status, ['active', 'archived'])) ||
      (event.type === 'epic.created' && !isOneOf(event.payload.status, ['draft', 'active', 'done', 'cancelled'])) ||
      (event.type === 'sprint.evidence.added' &&
        !isOneOf(event.payload.kind, ['verification', 'command', 'observation'])) ||
      (event.type === 'evidence.added' &&
        !isOneOf(event.payload.kind, ['verification', 'implementation-diff', 'command', 'observation'])) ||
      ('verdict' in event.payload && !isOneOf(event.payload.verdict, ['accepted', 'rejected'])) ||
      ('relation' in event.payload && event.payload.relation !== 'blocks')
    ) {
      throw new Error(`Malformed project event payload at position ${index + 1}`);
    }
    for (const [key, value] of Object.entries(event.payload as JsonRecord)) {
      if ((key === 'id' || key.endsWith('Id') || key === 'from' || key === 'to') && !isNonEmptyString(value)) {
        throw new Error(`Malformed project event payload at position ${index + 1}`);
      }
      validateReference(key, value, `event position ${index + 1}`);
    }
  });
};

const validateSourceManifest = (projectId: string, manifestText: string): void => {
  let manifest: unknown;
  try {
    manifest = JSON.parse(manifestText);
  } catch {
    throw new Error('Malformed project store manifest');
  }
  if (
    !isRecord(manifest) ||
    manifest.schemaVersion !== 1 ||
    manifest.projectId !== projectId ||
    !Number.isInteger(manifest.generation) ||
    typeof manifest.stateChecksum !== 'string' ||
    typeof manifest.eventsChecksum !== 'string' ||
    !isRecord(manifest.entityCounts)
  ) {
    throw new Error('Project store manifest identity or schema mismatch');
  }
};

const readChecksums = (location: ReturnType<typeof paths>): ReconciliationChecksums => ({
  state: checksum(readFileSync(location.state, 'utf8')),
  events: checksum(readFileSync(location.events, 'utf8')),
  manifest: checksum(readFileSync(location.manifest, 'utf8')),
});

const readLedger = (location: ReturnType<typeof paths>): ReconciliationLedger | undefined => {
  if (!existsSync(location.ledger)) return undefined;
  const ledger = JSON.parse(readFileSync(location.ledger, 'utf8')) as Partial<ReconciliationLedger>;
  if (
    ledger.schemaVersion !== 1 ||
    ledger.strategy !== 'position-preserving-remapping-ledger' ||
    typeof ledger.projectId !== 'string' ||
    !Array.isArray(ledger.remapping)
  ) {
    throw new Error('Malformed sequence reconciliation ledger');
  }
  return ledger as ReconciliationLedger;
};

const validateExistingLedgerPrefix = (ledger: ReconciliationLedger, events: SequenceEvent[]): boolean => {
  if (events.length < ledger.eventCount) return false;
  for (let index = 0; index < ledger.eventCount; index += 1) {
    const event = events[index]!;
    const mapping = ledger.remapping[index]!;
    if (
      mapping.position !== index + 1 ||
      event.sequence !== index + 1 ||
      mapping.canonicalSequence !== event.sequence ||
      mapping.eventFingerprint !== eventFingerprint(event)
    ) {
      return false;
    }
  }
  return events.every((event, index) => event.sequence === index + 1);
};

const backupStore = (
  root: string,
  location: ReturnType<typeof paths>,
  reconciliationId: string,
  projectId: string,
  before: ReconciliationChecksums,
): { backupId: string; manifestPath: string } => {
  const backupId = `sequence-${reconciliationId}`;
  const directory = join(location.backups, backupId);
  mkdirSync(directory, { recursive: true });
  copyFileSync(location.state, join(directory, 'state.json'));
  copyFileSync(location.events, join(directory, 'events.ndjson'));
  copyFileSync(location.manifest, join(directory, 'manifest.json'));
  const manifestPath = join(directory, 'backup-manifest.json');
  atomicWrite(manifestPath, {
    schemaVersion: 1,
    projectId,
    reconciliationId,
    checksums: before,
  });
  return { backupId, manifestPath: relative(root, manifestPath) };
};

const reportArtifacts = (root: string, location: ReturnType<typeof paths>, backupId: string) => ({
  ledger: relative(root, location.ledger),
  backupManifest: relative(root, join(location.backups, backupId, 'backup-manifest.json')),
});

const reconcileProjectEventSequences = (
  root: string,
  projectId: string,
  options: ReconciliationOptions = {},
): ReconciliationReport => {
  assertProjectId(projectId);
  const location = paths(root, projectId);
  if (![location.state, location.events, location.manifest].every(existsSync)) {
    throw new Error(`Project store is incomplete: ${projectId}`);
  }
  recoverProjectStoreTransaction(location.project);
  const stateText = readFileSync(location.state, 'utf8');
  const eventsText = readFileSync(location.events, 'utf8');
  validateSourceManifest(projectId, readFileSync(location.manifest, 'utf8'));
  const events = parseEvents(eventsText);
  validateStateAndReferences(projectId, stateText, events);
  const anomalies = inventorySequences(events);
  const before = readChecksums(location);
  const existing = readLedger(location);
  if (existing) {
    if (existing.projectId !== projectId) throw new Error('Sequence reconciliation ledger project mismatch');
    if (existing.phase === 'rolled-back')
      throw new Error('Rolled-back reconciliation requires a new artifact directory');
    if (!validateExistingLedgerPrefix(existing, events)) {
      throw new Error('Current history does not match the validated reconciliation ledger');
    }
    if (!options.dryRun) {
      try {
        assertCurrentMatchesManifest(location.project);
      } catch (error: unknown) {
        if (!(error instanceof Error) || !error.message.includes('checksum mismatch')) throw error;
        commitProjectStore(location.project, projectId, stateText, eventsText, { allowInvalidCurrent: true });
      }
    }
    const after = options.dryRun ? before : readChecksums(location);
    if (
      !options.dryRun &&
      existing.phase === 'prepared' &&
      events.length === existing.eventCount &&
      after.events === existing.after.events
    ) {
      existing.phase = 'reconciled';
      existing.after = after;
      atomicWrite(location.ledger, existing);
    }
    return {
      reconciliationId: existing.reconciliationId,
      projectId,
      dryRun: options.dryRun ?? false,
      status: 'already-reconciled',
      strategy: existing.strategy,
      eventCount: events.length,
      anomalies,
      backupId: existing.backupId,
      checksums: { before, after },
      artifacts: reportArtifacts(root, location, existing.backupId),
    };
  }

  const canonical = events.map((event, index) => ({ ...event, sequence: index + 1 }));
  const remapping = events.map((event, index) => ({
    position: index + 1,
    legacySequence: event.sequence,
    canonicalSequence: index + 1,
    eventFingerprint: eventFingerprint(event),
  }));
  const canonicalText = canonical.map((event) => JSON.stringify(event)).join('\n') + (canonical.length ? '\n' : '');
  canonical.forEach((event, index) => {
    if (eventFingerprint(event) !== remapping[index]!.eventFingerprint) {
      throw new Error(`Payload or aggregate identity changed at position ${index + 1}`);
    }
  });
  const reconciliationId = checksum(`${projectId}:${before.state}:${before.events}`).slice(0, 16);
  const plannedAfter: ReconciliationChecksums = { state: before.state, events: checksum(canonicalText), manifest: '' };
  if (options.dryRun) {
    return {
      reconciliationId,
      projectId,
      dryRun: true,
      status: 'planned',
      strategy: 'position-preserving-remapping-ledger',
      eventCount: events.length,
      anomalies,
      checksums: { before, after: plannedAfter },
    };
  }

  const backup = backupStore(root, location, reconciliationId, projectId, before);
  const ledger: ReconciliationLedger = {
    schemaVersion: 1,
    strategy: 'position-preserving-remapping-ledger',
    reconciliationId,
    projectId,
    phase: 'prepared',
    backupId: backup.backupId,
    eventCount: events.length,
    before,
    after: plannedAfter,
    anomalies,
    remapping,
  };
  atomicWrite(location.ledger, ledger);
  commitProjectStore(location.project, projectId, stateText, canonicalText, {
    allowInvalidCurrent: true,
    observe: options.observeCommit,
  });
  assertCurrentMatchesManifest(location.project);
  const after = readChecksums(location);
  if (after.state !== before.state || after.events !== plannedAfter.events) {
    throw new Error('Post-reconciliation checksum mismatch');
  }
  ledger.phase = 'reconciled';
  ledger.after = after;
  atomicWrite(location.ledger, ledger);
  return {
    reconciliationId,
    projectId,
    dryRun: false,
    status: 'reconciled',
    strategy: ledger.strategy,
    eventCount: events.length,
    anomalies,
    backupId: backup.backupId,
    checksums: { before, after },
    artifacts: { ledger: relative(root, location.ledger), backupManifest: backup.manifestPath },
  };
};

const rollbackProjectEventReconciliation = (root: string, projectId: string): ReconciliationReport => {
  assertProjectId(projectId);
  const location = paths(root, projectId);
  recoverProjectStoreTransaction(location.project);
  const ledger = readLedger(location);
  if (!ledger || ledger.projectId !== projectId || ledger.phase !== 'reconciled') {
    throw new Error('No active validated sequence reconciliation exists');
  }
  const current = readChecksums(location);
  if (current.state !== ledger.after.state || current.events !== ledger.after.events) {
    throw new Error('Rollback rejected because the reconciled store has changed');
  }
  const backup = join(location.backups, ledger.backupId);
  const backupManifest = JSON.parse(readFileSync(join(backup, 'backup-manifest.json'), 'utf8')) as {
    projectId?: string;
    reconciliationId?: string;
    checksums?: ReconciliationChecksums;
  };
  const stateText = readFileSync(join(backup, 'state.json'), 'utf8');
  const eventsText = readFileSync(join(backup, 'events.ndjson'), 'utf8');
  const manifestText = readFileSync(join(backup, 'manifest.json'), 'utf8');
  if (
    backupManifest.projectId !== projectId ||
    backupManifest.reconciliationId !== ledger.reconciliationId ||
    checksum(stateText) !== backupManifest.checksums?.state ||
    checksum(eventsText) !== backupManifest.checksums?.events ||
    checksum(manifestText) !== backupManifest.checksums?.manifest
  ) {
    throw new Error('Rollback rejected invalid backup checksums');
  }
  const events = parseEvents(eventsText);
  validateStateAndReferences(projectId, stateText, events);
  commitProjectStore(location.project, projectId, stateText, eventsText, { allowInvalidCurrent: true });
  assertCurrentMatchesManifest(location.project);
  ledger.phase = 'rolled-back';
  atomicWrite(location.ledger, ledger);
  return {
    reconciliationId: ledger.reconciliationId,
    projectId,
    dryRun: false,
    status: 'rolled-back',
    strategy: ledger.strategy,
    eventCount: events.length,
    anomalies: inventorySequences(events),
    backupId: ledger.backupId,
    checksums: { before: current, after: readChecksums(location) },
    artifacts: reportArtifacts(root, location, ledger.backupId),
  };
};

export { inventorySequences, reconcileProjectEventSequences, rollbackProjectEventReconciliation };
export type { ReconciliationOptions, ReconciliationReport, SequenceAnomaly, SequenceEvent };
