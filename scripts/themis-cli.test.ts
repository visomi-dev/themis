import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, it } from 'node:test';

import { createWorkItem, transitionWorkItem } from '../.opencode/tools/themis-core.ts';

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('Themis CLI', () => {
  const runCli = (root: string, args: string[]): Record<string, unknown> => {
    const result = spawnSync(
      process.execPath,
      ['--experimental-strip-types', 'scripts/themis-cli.ts', ...args, '--root', root, '--json'],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
      },
    );
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout) as Record<string, unknown>;
  };

  it('prints operational status as JSON', () => {
    const root = mkdtempSync(join(tmpdir(), 'themis-cli-'));
    roots.push(root);
    const item = createWorkItem(
      root,
      {
        title: 'CLI work item',
        summary: 'Status should expose local state',
        acceptanceCriteria: ['Status includes the item'],
        scopeIn: ['fixture/**'],
        scopeOut: [],
        verificationStrategy: ['node --test'],
      },
      'human:test',
    );
    transitionWorkItem(root, item.id, 'ready', 'human:test');

    const result = spawnSync(
      process.execPath,
      ['--experimental-strip-types', 'scripts/themis-cli.ts', 'status', '--root', root, '--json'],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
      },
    );
    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout) as { counts: { ready: number } };
    assert.equal(output.counts.ready, 1);
  });

  it('exposes first-run status and project-scoped timeline commands', () => {
    const root = mkdtempSync(join(tmpdir(), 'themis-cli-onboarding-'));
    roots.push(root);

    const initial = runCli(root, ['workspace-status']);
    assert.equal(initial.initialized, false);
    runCli(root, ['project-create', '--id', 'PRJ-ONBOARD', '--name', 'Onboarding project']);

    const status = runCli(root, ['workspace-status']);
    assert.equal(status.initialized, true);
    const entries = runCli(root, ['timeline', '--project', 'PRJ-ONBOARD']) as unknown as Array<{
      aggregateId: string;
    }>;
    assert.deepEqual(
      entries.map((entry) => entry.aggregateId),
      ['PRJ-ONBOARD'],
    );
  });

  it('executes the operational lifecycle through CLI commands', () => {
    const root = mkdtempSync(join(tmpdir(), 'themis-cli-e2e-'));
    roots.push(root);
    runCli(root, ['project-create', '--id', 'PRJ-CLI', '--name', 'CLI project', '--summary', 'CLI project summary']);
    runCli(root, [
      'epic-create',
      '--id',
      'EPIC-CLI',
      '--project',
      'PRJ-CLI',
      '--title',
      'CLI epic',
      '--goal',
      'Validate CLI organization',
    ]);
    const common = (id: string, title: string) => [
      'work-create',
      '--id',
      id,
      '--title',
      title,
      '--summary',
      `${title} summary`,
      '--project',
      'PRJ-CLI',
      '--epic',
      'EPIC-CLI',
      '--acceptance',
      'Acceptance is satisfied',
      '--scope-in',
      'fixture/**',
      '--scope-out',
      'apps/**',
      '--verify',
      'node --test scripts/themis-cli.test.ts',
    ];
    runCli(root, common('THM-CLI-001', 'Build adapter'));
    runCli(root, common('THM-CLI-002', 'Test adapter'));
    runCli(root, ['work-transition', '--id', 'THM-CLI-001', '--to', 'ready']);
    runCli(root, ['work-transition', '--id', 'THM-CLI-002', '--to', 'ready']);
    runCli(root, ['dependency-add', '--from', 'THM-CLI-001', '--to', 'THM-CLI-002']);
    const proposal = runCli(root, [
      'sprint-propose',
      '--goal',
      'Validate CLI lifecycle',
      '--why',
      'CLI must enforce the same workflow as OpenCode',
      '--what',
      'A complete operational path',
      '--how',
      'Run all commands with JSON output',
      '--work-items',
      'THM-CLI-001,THM-CLI-002',
      '--project',
      'PRJ-CLI',
      '--epics',
      'EPIC-CLI',
      '--done',
      'Review accepted',
      '--verify',
      'node --test scripts/themis-cli.test.ts',
    ]);
    const sprintId = String(proposal.sprintId);
    const revisionId = String(proposal.id);
    runCli(root, ['sprint-approve', '--sprint', sprintId, '--revision', revisionId]);
    runCli(root, ['sprint-activate', '--sprint', sprintId, '--revision', revisionId]);
    const ready = runCli(root, ['ready', '--project', 'PRJ-CLI', '--sprint', sprintId]);
    assert.equal((ready as unknown as Array<{ id: string }>)[0]?.id, 'THM-CLI-001');
    runCli(root, ['claim', '--id', 'THM-CLI-001', '--agent', 'cli-executor']);
    const run = runCli(root, ['run-start', '--work-item', 'THM-CLI-001', '--agent', 'cli-executor']);
    const runId = String(run.id);
    runCli(root, [
      'evidence-add',
      '--run',
      runId,
      '--kind',
      'implementation-diff',
      '--summary',
      'Commit exists',
      '--value',
      'commit cli-001',
    ]);
    runCli(root, [
      'evidence-add',
      '--run',
      runId,
      '--kind',
      'verification',
      '--summary',
      'Tests passed',
      '--value',
      'node --test: PASS',
    ]);
    runCli(root, ['run-finish', '--run', runId, '--status', 'completed', '--reason', 'Checks passed']);
    const review = runCli(root, ['review-request', '--work-item', 'THM-CLI-001', '--reviewer', 'cli-reviewer']);
    const reviewId = String(review.id);
    runCli(root, ['review-submit', '--review', reviewId, '--verdict', 'accepted', '--feedback', 'Accepted']);
    const finalState = runCli(root, ['validate']);
    assert.equal(finalState.valid, true);
  });
});
