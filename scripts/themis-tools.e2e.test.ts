import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, it } from 'node:test';

import {
  flow_ready_queue,
  epic_create,
  evidence_add,
  project_create,
  review_request,
  review_submit,
  run_finish,
  run_start,
  timeline_list,
  work_claim,
  workitem_create,
  workitem_get,
  workitem_transition,
} from '../.opencode/tools/themis.ts';

const roots: string[] = [];
const context = (root: string) => ({
  agent: 'themis-e2e',
  directory: root,
  worktree: root,
  sessionID: 'e2e',
  messageID: 'message',
  abort: new AbortController().signal,
  metadata() {},
  async ask() {},
});
type InvokableTool = { execute: (args: never, context: never) => Promise<string | { output: string }> };
const call = async <T>(definition: InvokableTool, args: T, root: string): Promise<Record<string, unknown>> => {
  const result = await definition.execute(args as never, context(root) as never);
  return JSON.parse(typeof result === 'string' ? result : result.output) as Record<string, unknown>;
};
const assertFreshProjectValid = (root: string, projectId: string): void => {
  for (const command of ['project-state', 'project-validate']) {
    const result = spawnSync(
      process.execPath,
      [
        '--experimental-strip-types',
        'scripts/themis-cli.ts',
        command,
        '--project',
        projectId,
        '--root',
        root,
        '--json',
      ],
      { cwd: process.cwd(), encoding: 'utf8' },
    );
    assert.equal(result.status, 0, `${command}: ${result.stderr}`);
  }
};
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('OpenCode project-authorized tools', () => {
  it('uses registered project APIs and rejects a foreign project read', async () => {
    const root = mkdtempSync(join(tmpdir(), 'themis-tools-scoped-'));
    roots.push(root);
    await call(project_create, { projectId: 'PRJ-ONE', name: 'One', summary: '' }, root);
    await call(project_create, { projectId: 'PRJ-TWO', name: 'Two', summary: '' }, root);
    const item = await call(
      workitem_create,
      {
        projectId: 'PRJ-ONE',
        title: 'Scoped item',
        summary: '',
        acceptanceCriteria: [],
        scopeIn: [],
        scopeOut: [],
        verificationStrategy: [],
      },
      root,
    );
    const queue = await call(flow_ready_queue, { projectId: 'PRJ-ONE' }, root);
    assert.deepEqual(
      (queue as unknown as Array<{ id: string }>).map((entry) => entry.id),
      [],
    );
    const timeline = await call(timeline_list, { projectId: 'PRJ-ONE' }, root);
    assert.equal(JSON.stringify(timeline).includes(String(item.id)), true);
    const foreign = await call(workitem_get, { projectId: 'PRJ-TWO', id: String(item.id) }, root);
    assert.equal(foreign.error, `Work item not found: ${String(item.id)}`);
  });

  it('keeps fresh-process validation valid after OpenCode evidence and review lifecycle mutations', async () => {
    const root = mkdtempSync(join(tmpdir(), 'themis-tools-manifest-lifecycle-'));
    roots.push(root);
    await call(project_create, { projectId: 'PRJ-ONE', name: 'One', summary: '' }, root);
    assertFreshProjectValid(root, 'PRJ-ONE');
    await call(
      epic_create,
      { projectId: 'PRJ-ONE', id: 'EPIC-ONE', title: 'Epic', summary: '', goal: 'Adapter persistence' },
      root,
    );
    assertFreshProjectValid(root, 'PRJ-ONE');
    const item = await call(
      workitem_create,
      {
        projectId: 'PRJ-ONE',
        epicId: 'EPIC-ONE',
        id: 'ITEM-ONE',
        title: 'Scoped item',
        summary: 'Exercise the complete lifecycle',
        acceptanceCriteria: ['valid'],
        scopeIn: ['scripts'],
        scopeOut: [],
        verificationStrategy: ['test'],
      },
      root,
    );
    assertFreshProjectValid(root, 'PRJ-ONE');
    await call(workitem_transition, { projectId: 'PRJ-ONE', id: String(item.id), to: 'ready' }, root);
    assertFreshProjectValid(root, 'PRJ-ONE');
    await call(work_claim, { projectId: 'PRJ-ONE', id: String(item.id), agent: 'executor' }, root);
    assertFreshProjectValid(root, 'PRJ-ONE');
    const run = await call(run_start, { projectId: 'PRJ-ONE', workItemId: String(item.id), agent: 'executor' }, root);
    assertFreshProjectValid(root, 'PRJ-ONE');
    await call(
      evidence_add,
      { projectId: 'PRJ-ONE', runId: String(run.id), kind: 'verification', summary: 'verified', value: 'pass' },
      root,
    );
    assertFreshProjectValid(root, 'PRJ-ONE');
    await call(
      evidence_add,
      {
        projectId: 'PRJ-ONE',
        runId: String(run.id),
        kind: 'implementation-diff',
        summary: 'implemented',
        value: 'files',
      },
      root,
    );
    assertFreshProjectValid(root, 'PRJ-ONE');
    await call(
      run_finish,
      { projectId: 'PRJ-ONE', runId: String(run.id), status: 'completed', terminationReason: 'complete' },
      root,
    );
    assertFreshProjectValid(root, 'PRJ-ONE');
    const review = await call(
      review_request,
      { projectId: 'PRJ-ONE', workItemId: String(item.id), reviewer: 'reviewer' },
      root,
    );
    assertFreshProjectValid(root, 'PRJ-ONE');
    await call(
      review_submit,
      { projectId: 'PRJ-ONE', reviewId: String(review.id), verdict: 'accepted', feedback: 'accepted' },
      root,
    );
    assertFreshProjectValid(root, 'PRJ-ONE');
  });
});
