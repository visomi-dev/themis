import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, it } from 'node:test';

import {
  dependency_add,
  evidence_add,
  ready_queue,
  review_request,
  review_submit,
  run_finish,
  run_start,
  sprint_activate,
  sprint_approve,
  sprint_propose,
  validate,
  work_claim,
  workitem_create,
  workitem_transition,
} from '../.opencode/tools/themis.ts';

const roots: string[] = [];
const context = (root: string) => ({
  agent: 'themis-e2e',
  directory: root,
  worktree: root,
  sessionID: 'e2e-session',
  messageID: 'e2e-message',
  abort: new AbortController().signal,
  metadata() {},
  async ask() {},
});

type ToolResult = string | { output: string };
type InvokableTool = { execute: (args: never, context: never) => Promise<ToolResult> };

const call = async <T>(toolDefinition: InvokableTool, args: T, root: string) => {
  const result = await toolDefinition.execute(args as never, context(root) as never);
  const serialized = typeof result === 'string' ? result : result.output;
  return JSON.parse(serialized) as Record<string, unknown>;
};

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('OpenCode Themis tools', () => {
  it('runs the public tool protocol from work item creation to accepted review', async () => {
    const root = mkdtempSync(join(tmpdir(), 'themis-tools-e2e-'));
    roots.push(root);
    const itemArgs = (title: string) => ({
      title,
      summary: `${title} summary`,
      acceptanceCriteria: [`${title} is complete`],
      scopeIn: ['fixture/**'],
      scopeOut: ['apps/**'],
      verificationStrategy: ['node --test scripts/themis-tools.e2e.test.ts'],
    });

    const first = await call(workitem_create, itemArgs('Build adapter'), root);
    const second = await call(workitem_create, itemArgs('Test adapter'), root);
    const firstId = String(first.id);
    const secondId = String(second.id);
    await call(workitem_transition, { id: firstId, to: 'ready' }, root);
    await call(workitem_transition, { id: secondId, to: 'ready' }, root);
    await call(dependency_add, { from: firstId, to: secondId }, root);

    const proposal = await call(
      sprint_propose,
      {
        goal: 'Validate the OpenCode local protocol',
        why: 'The tools must enforce the workflow before product integration',
        what: 'A complete accepted execution path',
        how: 'Use public OpenCode tools and independent review',
        workItemIds: [firstId, secondId],
        nonGoals: ['SQLite', 'Themis UI'],
        definitionOfDone: ['Review accepted'],
        verificationStrategy: ['node --test scripts/themis-tools.e2e.test.ts'],
      },
      root,
    );
    const sprintId = String(proposal.sprintId);
    const revisionId = String(proposal.revisionId);
    await call(sprint_approve, { sprintId, revisionId }, root);
    await call(sprint_activate, { sprintId, revisionId }, root);

    const queue = await call(ready_queue, { sprintId }, root);
    assert.deepEqual(
      (queue as unknown as Array<{ id: string }>).map((item) => item.id),
      [firstId],
    );
    await call(work_claim, { id: firstId, agent: 'themis-executor' }, root);
    const run = await call(run_start, { workItemId: firstId, agent: 'themis-executor' }, root);
    const runId = String(run.runId);
    await call(
      evidence_add,
      { runId, kind: 'implementation-diff', summary: 'Implementation commit', value: 'commit e2e-001' },
      root,
    );
    await call(
      evidence_add,
      { runId, kind: 'verification', summary: 'E2E suite passed', value: 'node --test: PASS' },
      root,
    );
    await call(run_finish, { runId, status: 'completed', terminationReason: 'All required checks passed' }, root);
    const requested = await call(review_request, { workItemId: firstId, reviewer: 'themis-reviewer' }, root);
    const reviewId = String(requested.reviewId);
    await call(
      review_submit,
      { reviewId, verdict: 'accepted', feedback: 'Acceptance criteria and evidence are complete' },
      root,
    );

    const finalState = await call(validate, {}, root);
    assert.equal(finalState.valid, true);
  });
});
