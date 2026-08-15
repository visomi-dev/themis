import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, it } from 'node:test';

import {
  activateSprint,
  addDependency,
  addEvidence,
  approveSprint,
  claimWorkItem,
  createWorkItem,
  finishRun,
  proposeSprint,
  readyQueue,
  requestReview,
  startRun,
  submitReview,
  transitionWorkItem,
  validateState,
} from '../.opencode/tools/themis-core.ts';

const roots: string[] = [];
const clock = (() => {
  let sequence = 0;
  return () => `2026-08-15T00:00:${String(sequence++).padStart(2, '0')}.000Z`;
})();

const createFixture = (): string => {
  const root = mkdtempSync(join(tmpdir(), 'themis-opencode-'));
  roots.push(root);
  return root;
};

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

const itemInput = (title: string) => ({
  title,
  summary: `${title} summary`,
  acceptanceCriteria: [`${title} works`],
  scopeIn: ['fixture/**'],
  scopeOut: ['production/**'],
  verificationStrategy: ['node --test fixture'],
});

describe('local Themis workflow', () => {
  it('executes the complete proposal to accepted review flow', () => {
    const root = createFixture();
    const first = createWorkItem(root, itemInput('Create adapter'), 'agent:planner', clock);
    const second = createWorkItem(root, itemInput('Test adapter'), 'agent:planner', clock);
    transitionWorkItem(root, first.id, 'ready', 'agent:planner', clock);
    transitionWorkItem(root, second.id, 'ready', 'agent:planner', clock);
    addDependency(root, first.id, second.id, 'agent:planner', clock);

    const revision = proposeSprint(
      root,
      {
        goal: 'Validate local agent coordination',
        why: 'The workflow must be deterministic before product integration',
        what: 'A tested local adapter workflow',
        how: 'Run planner, executor, verifier, and reviewer gates',
        workItemIds: [first.id, second.id],
        nonGoals: ['SQLite', 'Themis UI'],
        definitionOfDone: ['Review accepted'],
        verificationStrategy: ['node --experimental-strip-types --test scripts/themis-core.test.ts'],
      },
      'agent:planner',
      clock,
    );
    approveSprint(root, revision.sprintId, revision.id, 'human:owner', clock);
    activateSprint(root, revision.sprintId, revision.id, 'human:owner', clock);

    assert.deepEqual(
      readyQueue(root, revision.sprintId).map((item) => item.id),
      [first.id],
    );
    claimWorkItem(root, first.id, 'themis-executor', 'agent:executor', clock);
    const run = startRun(root, first.id, 'themis-executor', 'agent:executor', clock);
    addEvidence(
      root,
      run.id,
      'implementation-diff',
      'Adapter implementation',
      'commit fixture-001',
      'agent:executor',
      clock,
    );
    addEvidence(
      root,
      run.id,
      'verification',
      'Fixture tests passed',
      'node --test fixture: PASS',
      'agent:verifier',
      clock,
    );
    finishRun(root, run.id, 'completed', 'Verification passed', 'agent:verifier', clock);
    const review = requestReview(root, first.id, 'themis-reviewer', 'agent:executor', clock);
    submitReview(root, review.id, 'accepted', 'Acceptance criteria satisfied', 'agent:reviewer', clock);

    assert.deepEqual(
      readyQueue(root, revision.sprintId).map((item) => item.id),
      [second.id],
    );
    assert.equal(validateState(root).valid, true);
    const events = readFileSync(join(root, '.themis/events.ndjson'), 'utf8').trim().split('\n');
    assert.equal(events.length, 15);
  });

  it('rejects blocked work and missing review evidence', () => {
    const root = createFixture();
    const blocker = createWorkItem(root, itemInput('Blocker'), 'agent:planner', clock);
    const blocked = createWorkItem(root, itemInput('Blocked item'), 'agent:planner', clock);
    transitionWorkItem(root, blocker.id, 'ready', 'agent:planner', clock);
    transitionWorkItem(root, blocked.id, 'ready', 'agent:planner', clock);
    addDependency(root, blocker.id, blocked.id, 'agent:planner', clock);
    const revision = proposeSprint(
      root,
      {
        goal: 'Exercise rejection paths',
        why: 'Invalid execution must be rejected',
        what: 'A blocked queue',
        how: 'Leave the blocker incomplete',
        workItemIds: [blocker.id, blocked.id],
        nonGoals: [],
        definitionOfDone: ['Rejected transitions are explicit'],
        verificationStrategy: ['node --test'],
      },
      'agent:planner',
      clock,
    );
    approveSprint(root, revision.sprintId, revision.id, 'human:owner', clock);
    activateSprint(root, revision.sprintId, revision.id, 'human:owner', clock);
    assert.deepEqual(
      readyQueue(root, revision.sprintId).map((item) => item.id),
      [blocker.id],
    );
    assert.throws(() => claimWorkItem(root, blocked.id, 'themis-executor', 'agent:executor', clock), /blocked by/);
    claimWorkItem(root, blocker.id, 'themis-executor', 'agent:executor', clock);
    const run = startRun(root, blocker.id, 'themis-executor', 'agent:executor', clock);
    finishRun(root, run.id, 'completed', 'No evidence was recorded', 'agent:verifier', clock);
    assert.throws(
      () => requestReview(root, blocker.id, 'themis-reviewer', 'agent:executor', clock),
      /missing verification evidence/,
    );
  });

  it('moves rejected reviews to rework', () => {
    const root = createFixture();
    const item = createWorkItem(root, itemInput('Reviewable item'), 'agent:planner', clock);
    transitionWorkItem(root, item.id, 'ready', 'agent:planner', clock);
    const revision = proposeSprint(
      root,
      {
        goal: 'Exercise review rework',
        why: 'Rejected work must be actionable',
        what: 'A review decision',
        how: 'Reject the implementation',
        workItemIds: [item.id],
        nonGoals: [],
        definitionOfDone: ['Rework is visible'],
        verificationStrategy: ['node --test'],
      },
      'agent:planner',
      clock,
    );
    approveSprint(root, revision.sprintId, revision.id, 'human:owner', clock);
    activateSprint(root, revision.sprintId, revision.id, 'human:owner', clock);
    claimWorkItem(root, item.id, 'themis-executor', 'agent:executor', clock);
    const run = startRun(root, item.id, 'themis-executor', 'agent:executor', clock);
    addEvidence(root, run.id, 'implementation-diff', 'Diff exists', 'commit fixture-002', 'agent:executor', clock);
    addEvidence(root, run.id, 'verification', 'Tests passed', 'node --test: PASS', 'agent:verifier', clock);
    finishRun(root, run.id, 'completed', 'Checks passed', 'agent:verifier', clock);
    const review = requestReview(root, item.id, 'themis-reviewer', 'agent:executor', clock);
    submitReview(root, review.id, 'rejected', 'Add a regression test', 'agent:reviewer', clock);
    assert.equal(readyQueue(root, revision.sprintId).length, 0);
    assert.equal(validateState(root).valid, true);
  });

  it('rejects transitions outside the state machine', () => {
    const root = createFixture();
    const item = createWorkItem(root, itemInput('Invalid transition'), 'agent:planner', clock);
    assert.throws(
      () => transitionWorkItem(root, item.id, 'done', 'agent:planner', clock),
      /cannot move from draft to done/,
    );
  });
});
