import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  assertCurrentMatchesManifest,
  commitProjectStore,
} from '../libs/themis-workflow/src/lib/project-store-persistence.ts';
import { WorkspaceRegistry } from '../libs/themis-workflow/src/lib/project-workflow.ts';

import {
  reconcileProjectEventSequences,
  rollbackProjectEventReconciliation,
} from './themis-event-sequence-reconciliation.ts';

const projectId = 'PRJ-SEQ';
const state = {
  schemaVersion: 2,
  projectId,
  projects: [
    { id: projectId, name: 'Sequence', summary: 'Sequence project', status: 'active', createdAt: '2026-01-01' },
  ],
  epics: [],
  workItems: [],
  dependencies: [],
  sprints: [],
  sprintItems: [],
  revisions: [],
  runs: [],
  evidence: [],
  sprintEvidence: [],
  reviews: [],
};

const event = (sequence: number, overrides: Record<string, unknown> = {}) => ({
  schemaVersion: 1,
  sequence,
  timestamp: '2026-01-01T00:00:00.000Z',
  actor: 'fixture',
  type: 'project.created',
  aggregateType: 'project',
  aggregateId: projectId,
  payload: { projectId, status: 'active', marker: `payload-${sequence}` },
  ...overrides,
});

const fixture = (sequences = [1, 2, 3]) => {
  const root = mkdtempSync(join(tmpdir(), 'themis-sequence-reconciliation-'));
  const directory = join(root, '.themis', 'projects', projectId);
  const events = sequences.map((sequence) => event(sequence));
  commitProjectStore(
    directory,
    projectId,
    `${JSON.stringify(state, null, 2)}\n`,
    `${events.map((entry) => JSON.stringify(entry)).join('\n')}\n`,
  );
  return { root, directory, events };
};

const corruptEvents = (directory: string, events: unknown[]): void => {
  writeFileSync(
    join(directory, 'events.ndjson'),
    `${events.map((entry) => JSON.stringify(entry)).join('\n')}\n`,
    'utf8',
  );
};

describe('project-event sequence reconciliation', () => {
  it('inventories without payloads, dry-runs, remaps in file order, and is idempotent', () => {
    const { root, directory, events } = fixture([1, 3, 2, 3]);
    const stateBefore = readFileSync(join(directory, 'state.json'), 'utf8');
    const payloadsBefore = events.map((entry) => entry.payload);

    const plan = reconcileProjectEventSequences(root, projectId, { dryRun: true });
    assert.equal(plan.status, 'planned');
    assert.deepEqual(plan.anomalies.duplicate, [{ position: 4, sequence: 3 }]);
    assert.deepEqual(plan.anomalies.outOfOrder, [{ position: 3, previous: 3, sequence: 2 }]);
    assert.equal(JSON.stringify(plan).includes('payload-'), false);
    assert.equal(readFileSync(join(directory, 'state.json'), 'utf8'), stateBefore);

    const result = reconcileProjectEventSequences(root, projectId);
    assert.equal(result.status, 'reconciled');
    assert.equal(result.checksums.before.state, result.checksums.after.state);
    const after = readFileSync(join(directory, 'events.ndjson'), 'utf8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as { sequence: number; payload: unknown; aggregateId: string });
    assert.deepEqual(
      after.map((entry) => entry.sequence),
      [1, 2, 3, 4],
    );
    assert.deepEqual(
      after.map((entry) => entry.payload),
      payloadsBefore,
    );
    assert.ok(after.every((entry) => entry.aggregateId === projectId));
    assertCurrentMatchesManifest(directory);
    assert.equal(reconcileProjectEventSequences(root, projectId).status, 'already-reconciled');
  });

  it('requires an explicit CLI project and keeps inventory output redacted', () => {
    const { root } = fixture([1, 3]);
    const missing = spawnSync(
      process.execPath,
      ['--experimental-strip-types', 'scripts/themis-cli.ts', 'project-sequence-reconcile', '--root', root, '--json'],
      { cwd: process.cwd(), encoding: 'utf8' },
    );
    assert.notEqual(missing.status, 0);

    new WorkspaceRegistry(root).register(projectId, projectId, root);
    const dryRun = spawnSync(
      process.execPath,
      [
        '--experimental-strip-types',
        'scripts/themis-cli.ts',
        'project-sequence-reconcile',
        '--project',
        projectId,
        '--dry-run',
        '--root',
        root,
        '--json',
      ],
      { cwd: process.cwd(), encoding: 'utf8' },
    );
    assert.equal(dryRun.status, 0, dryRun.stderr);
    assert.doesNotMatch(dryRun.stdout, /payload-/);
  });

  for (const anomaly of ['duplicate', 'missing', 'out-of-order'] as const) {
    it(`reconciles ${anomaly} sequence history`, () => {
      const sequences = anomaly === 'duplicate' ? [1, 1] : anomaly === 'missing' ? [1, 4] : [2, 1];
      const { root, directory } = fixture(sequences);
      const result = reconcileProjectEventSequences(root, projectId);
      assert.equal(result.status, 'reconciled');
      const reconciled = readFileSync(join(directory, 'events.ndjson'), 'utf8')
        .trim()
        .split('\n')
        .map((line) => JSON.parse(line) as { sequence: number });
      assert.deepEqual(
        reconciled.map((entry) => entry.sequence),
        [1, 2],
      );
    });
  }

  for (const corruption of ['foreign-event', 'malformed-event', 'foreign-state', 'malformed-state'] as const) {
    it(`fails closed for ${corruption}`, () => {
      const { root, directory, events } = fixture([1, 1]);
      const manifestBefore = readFileSync(join(directory, 'manifest.json'), 'utf8');
      if (corruption === 'foreign-event')
        corruptEvents(directory, [{ ...events[0], aggregateId: 'FOREIGN' }, events[1]]);
      if (corruption === 'malformed-event') corruptEvents(directory, [{ ...events[0], payload: undefined }, events[1]]);
      if (corruption === 'foreign-state') {
        writeFileSync(join(directory, 'state.json'), `${JSON.stringify({ ...state, projectId: 'FOREIGN' })}\n`, 'utf8');
      }
      if (corruption === 'malformed-state') writeFileSync(join(directory, 'state.json'), '{}\n', 'utf8');
      assert.throws(() => reconcileProjectEventSequences(root, projectId), /Foreign|Malformed|identity/);
      assert.equal(readFileSync(join(directory, 'manifest.json'), 'utf8'), manifestBefore);
    });
  }

  const completeState = {
    ...state,
    epics: [
      {
        id: 'EPIC-1',
        projectId,
        title: 'Epic',
        summary: 'Epic summary',
        goal: 'Epic goal',
        status: 'active',
        createdAt: '2026-01-01',
      },
    ],
    workItems: [
      {
        id: 'ITEM-1',
        projectId,
        epicId: 'EPIC-1',
        title: 'Item',
        summary: 'Item summary',
        status: 'done',
        acceptanceCriteria: ['Accepted'],
        scopeIn: ['Included'],
        scopeOut: [],
        verificationStrategy: ['Verify'],
      },
      {
        id: 'ITEM-2',
        projectId,
        title: 'Second item',
        summary: 'Second summary',
        status: 'ready',
        acceptanceCriteria: ['Accepted'],
        scopeIn: ['Included'],
        scopeOut: [],
        verificationStrategy: ['Verify'],
      },
    ],
    dependencies: [{ from: 'ITEM-1', to: 'ITEM-2', relation: 'blocks' }],
    sprints: [{ id: 'SPR-1', projectId, goal: 'Sprint goal', status: 'closed', createdAt: '2026-01-01' }],
    sprintItems: [{ sprintId: 'SPR-1', workItemId: 'ITEM-1', addedAt: '2026-01-01' }],
    revisions: [
      {
        id: 'REV-1',
        sprintId: 'SPR-1',
        projectId,
        version: 1,
        status: 'approved',
        workItemIds: ['ITEM-1'],
        epicIds: ['EPIC-1'],
        why: 'Why',
        what: 'What',
        how: 'How',
        nonGoals: [],
        definitionOfDone: ['Done'],
        verificationStrategy: ['Verify'],
        createdAt: '2026-01-01',
      },
    ],
    runs: [
      {
        id: 'RUN-1',
        workItemId: 'ITEM-1',
        agent: 'executor',
        status: 'completed',
        startedAt: '2026-01-01',
        finishedAt: '2026-01-01',
        terminationReason: 'Completed',
      },
    ],
    evidence: [
      {
        id: 'EVD-1',
        runId: 'RUN-1',
        kind: 'verification',
        summary: 'Verified',
        value: 'pass',
        createdAt: '2026-01-01',
      },
    ],
    sprintEvidence: [
      {
        id: 'SEVD-1',
        sprintId: 'SPR-1',
        kind: 'verification',
        summary: 'Verified',
        value: 'pass',
        createdAt: '2026-01-01',
      },
    ],
    reviews: [
      {
        id: 'REVW-1',
        workItemId: 'ITEM-1',
        runId: 'RUN-1',
        reviewer: 'reviewer',
        verdict: 'accepted',
        feedback: 'Accepted',
        createdAt: '2026-01-01',
        decidedAt: '2026-01-01',
      },
    ],
  };

  const stateCorruptions: Array<{
    name: string;
    collection: keyof typeof completeState;
    malformed: Record<string, unknown>;
    foreign: Record<string, unknown>;
  }> = [
    {
      name: 'project',
      collection: 'projects',
      malformed: { id: projectId },
      foreign: { ...completeState.projects[0], id: 'FOREIGN' },
    },
    {
      name: 'epic',
      collection: 'epics',
      malformed: { id: 'EPIC-1', projectId },
      foreign: { ...completeState.epics[0], projectId: 'FOREIGN' },
    },
    {
      name: 'work item',
      collection: 'workItems',
      malformed: { id: 'ITEM-1', projectId },
      foreign: { ...completeState.workItems[0], epicId: 'FOREIGN' },
    },
    {
      name: 'dependency',
      collection: 'dependencies',
      malformed: { from: 'ITEM-1' },
      foreign: { ...completeState.dependencies[0], to: 'FOREIGN' },
    },
    {
      name: 'sprint',
      collection: 'sprints',
      malformed: { id: 'SPR-1', projectId },
      foreign: { ...completeState.sprints[0], projectId: 'FOREIGN' },
    },
    {
      name: 'sprint membership',
      collection: 'sprintItems',
      malformed: { sprintId: 'SPR-1' },
      foreign: { ...completeState.sprintItems[0], workItemId: 'FOREIGN' },
    },
    {
      name: 'revision',
      collection: 'revisions',
      malformed: { id: 'REV-1', projectId },
      foreign: { ...completeState.revisions[0], sprintId: 'FOREIGN' },
    },
    {
      name: 'run',
      collection: 'runs',
      malformed: { id: 'RUN-1' },
      foreign: { ...completeState.runs[0], workItemId: 'FOREIGN' },
    },
    {
      name: 'evidence',
      collection: 'evidence',
      malformed: { id: 'EVD-1' },
      foreign: { ...completeState.evidence[0], runId: 'FOREIGN' },
    },
    {
      name: 'sprint evidence',
      collection: 'sprintEvidence',
      malformed: { id: 'SEVD-1' },
      foreign: { ...completeState.sprintEvidence[0], sprintId: 'FOREIGN' },
    },
    {
      name: 'review',
      collection: 'reviews',
      malformed: { id: 'REVW-1' },
      foreign: { ...completeState.reviews[0], runId: 'FOREIGN' },
    },
  ];

  for (const corruption of stateCorruptions) {
    for (const variant of ['malformed', 'foreign'] as const) {
      it(`rejects ${variant} ${corruption.name} state before dry-run`, () => {
        const { root, directory } = fixture([1, 1]);
        const manifestBefore = readFileSync(join(directory, 'manifest.json'), 'utf8');
        writeFileSync(
          join(directory, 'state.json'),
          `${JSON.stringify({ ...completeState, [corruption.collection]: [corruption[variant]] }, null, 2)}\n`,
          'utf8',
        );
        assert.throws(() => reconcileProjectEventSequences(root, projectId, { dryRun: true }), /Malformed|Foreign/);
        assert.equal(readFileSync(join(directory, 'manifest.json'), 'utf8'), manifestBefore);
      });
    }
  }

  const invalidStateEnums: Array<{
    name: string;
    collection: keyof typeof completeState;
    record: Record<string, unknown>;
  }> = [
    { name: 'project status', collection: 'projects', record: { ...completeState.projects[0], status: 'invalid' } },
    { name: 'epic status', collection: 'epics', record: { ...completeState.epics[0], status: 'invalid' } },
    { name: 'work item status', collection: 'workItems', record: { ...completeState.workItems[0], status: 'invalid' } },
    {
      name: 'dependency relation',
      collection: 'dependencies',
      record: { ...completeState.dependencies[0], relation: 'invalid' },
    },
    { name: 'sprint status', collection: 'sprints', record: { ...completeState.sprints[0], status: 'invalid' } },
    { name: 'revision status', collection: 'revisions', record: { ...completeState.revisions[0], status: 'invalid' } },
    { name: 'run status', collection: 'runs', record: { ...completeState.runs[0], status: 'invalid' } },
    { name: 'evidence kind', collection: 'evidence', record: { ...completeState.evidence[0], kind: 'invalid' } },
    {
      name: 'sprint evidence kind',
      collection: 'sprintEvidence',
      record: { ...completeState.sprintEvidence[0], kind: 'invalid' },
    },
    { name: 'review verdict', collection: 'reviews', record: { ...completeState.reviews[0], verdict: 'invalid' } },
  ];

  for (const invalid of invalidStateEnums) {
    it(`rejects invalid ${invalid.name} before dry-run`, () => {
      const { root, directory } = fixture([1, 1]);
      const manifestBefore = readFileSync(join(directory, 'manifest.json'), 'utf8');
      writeFileSync(
        join(directory, 'state.json'),
        `${JSON.stringify({ ...completeState, [invalid.collection]: [invalid.record] }, null, 2)}\n`,
        'utf8',
      );
      assert.throws(() => reconcileProjectEventSequences(root, projectId, { dryRun: true }), /Malformed/);
      assert.equal(readFileSync(join(directory, 'manifest.json'), 'utf8'), manifestBefore);
    });
  }

  for (const corruption of [
    { name: 'unknown type', override: { type: 'unknown.event' } },
    { name: 'mismatched aggregate type', override: { aggregateType: 'epic' } },
    { name: 'incomplete payload', override: { payload: { projectId } } },
    { name: 'non-string payload reference', override: { payload: { projectId: 42, status: 'active' } } },
  ]) {
    it(`rejects event contract with ${corruption.name}`, () => {
      const { root, directory, events } = fixture([1, 1]);
      const manifestBefore = readFileSync(join(directory, 'manifest.json'), 'utf8');
      corruptEvents(directory, [{ ...events[0], ...corruption.override }, events[1]]);
      assert.throws(() => reconcileProjectEventSequences(root, projectId, { dryRun: true }), /Malformed|Foreign/);
      assert.equal(readFileSync(join(directory, 'manifest.json'), 'utf8'), manifestBefore);
    });
  }

  for (const invalid of [
    { name: 'project status', override: { payload: { projectId, status: 'invalid' } } },
    {
      name: 'dependency relation',
      override: {
        type: 'dependency.added',
        aggregateType: 'work_item',
        aggregateId: 'ITEM-2',
        payload: { from: 'ITEM-1', to: 'ITEM-2', relation: 'invalid' },
      },
    },
    {
      name: 'run status',
      override: {
        type: 'run.finished',
        aggregateType: 'run',
        aggregateId: 'RUN-1',
        payload: { workItemId: 'ITEM-1', status: 'invalid', terminationReason: 'Finished' },
      },
    },
    {
      name: 'evidence kind',
      override: {
        type: 'evidence.added',
        aggregateType: 'run',
        aggregateId: 'RUN-1',
        payload: { evidenceId: 'EVD-1', kind: 'invalid' },
      },
    },
    {
      name: 'sprint evidence kind',
      override: {
        type: 'sprint.evidence.added',
        aggregateType: 'sprint',
        aggregateId: 'SPR-1',
        payload: { sprintId: 'SPR-1', evidenceId: 'SEVD-1', kind: 'invalid' },
      },
    },
    {
      name: 'review verdict',
      override: {
        type: 'review.submitted',
        aggregateType: 'review',
        aggregateId: 'REVW-1',
        payload: { verdict: 'invalid', workItemId: 'ITEM-1', feedback: 'Feedback' },
      },
    },
  ]) {
    it(`rejects invalid event ${invalid.name}`, () => {
      const { root, directory } = fixture([1, 1]);
      const manifestBefore = readFileSync(join(directory, 'manifest.json'), 'utf8');
      writeFileSync(join(directory, 'state.json'), `${JSON.stringify(completeState, null, 2)}\n`, 'utf8');
      corruptEvents(directory, [event(1, invalid.override), event(2)]);
      assert.throws(() => reconcileProjectEventSequences(root, projectId, { dryRun: true }), /Malformed/);
      assert.equal(readFileSync(join(directory, 'manifest.json'), 'utf8'), manifestBefore);
    });
  }

  it('validates backup checksums and rolls back only an unchanged reconciled store', () => {
    const { root, directory } = fixture([1, 3, 2]);
    const legacyEvents = readFileSync(join(directory, 'events.ndjson'), 'utf8');
    reconcileProjectEventSequences(root, projectId);
    const rolledBack = rollbackProjectEventReconciliation(root, projectId);
    assert.equal(rolledBack.status, 'rolled-back');
    assert.equal(readFileSync(join(directory, 'events.ndjson'), 'utf8'), legacyEvents);
    assertCurrentMatchesManifest(directory);
    assert.throws(() => rollbackProjectEventReconciliation(root, projectId), /No active/);

    const second = fixture([1, 1]);
    const applied = reconcileProjectEventSequences(second.root, projectId);
    const backupManifest = join(
      second.root,
      '.themis',
      'reconciliation',
      projectId,
      'backups',
      applied.backupId!,
      'backup-manifest.json',
    );
    writeFileSync(backupManifest, '{}\n', 'utf8');
    assert.throws(() => rollbackProjectEventReconciliation(second.root, projectId), /invalid backup/);
  });

  for (const interruptedAt of ['prepared', 'state-installed', 'events-installed', 'manifest-installed'] as const) {
    it(`resumes idempotently after interruption at ${interruptedAt}`, () => {
      const { root, directory } = fixture([1, 3, 2]);
      assert.throws(
        () =>
          reconcileProjectEventSequences(root, projectId, {
            observeCommit: (step) => {
              if (step === interruptedAt) throw new Error('simulated interruption');
            },
          }),
        /simulated interruption/,
      );
      const resumed = reconcileProjectEventSequences(root, projectId);
      assert.equal(resumed.status, 'already-reconciled');
      assertCurrentMatchesManifest(directory);
      assert.equal(rollbackProjectEventReconciliation(root, projectId).status, 'rolled-back');
    });
  }

  it('accepts a canonical appended suffix and rejects ambiguous ledger drift', () => {
    const { root, directory } = fixture([1, 1]);
    reconcileProjectEventSequences(root, projectId);
    const current = readFileSync(join(directory, 'events.ndjson'), 'utf8');
    const appended = `${current}${JSON.stringify(
      event(3, { payload: { projectId, status: 'active', marker: 'new-append' } }),
    )}\n`;
    commitProjectStore(directory, projectId, `${JSON.stringify(state, null, 2)}\n`, appended);
    assert.equal(reconcileProjectEventSequences(root, projectId).status, 'already-reconciled');

    const drifted = appended.replace('payload-1', 'changed-payload');
    commitProjectStore(directory, projectId, `${JSON.stringify(state, null, 2)}\n`, drifted);
    assert.throws(() => reconcileProjectEventSequences(root, projectId), /does not match/);
  });
});
