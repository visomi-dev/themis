import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, it } from 'node:test';

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

const runCli = (root: string, args: string[]): { status: number | null; stdout: string; stderr: string } => {
  const result = spawnSync(
    process.execPath,
    ['--experimental-strip-types', 'scripts/themis-cli.ts', ...args, '--root', root, '--json'],
    { cwd: process.cwd(), encoding: 'utf8' },
  );
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
};

const assertFreshProjectValid = (root: string, projectId: string): void => {
  for (const command of ['project-state', 'project-validate']) {
    const result = runCli(root, [command, '--project', projectId]);
    assert.equal(result.status, 0, `${command}: ${result.stderr}`);
  }
};

describe('Themis CLI project authority', () => {
  it('requires project scope and removes root aggregate commands', () => {
    const root = mkdtempSync(join(tmpdir(), 'themis-cli-negative-'));
    roots.push(root);
    const missingProject = runCli(root, ['ready']);
    assert.notEqual(missingProject.status, 0);
    const help = runCli(root, ['--help']);
    assert.equal(help.status, 0);
    assert.doesNotMatch(help.stdout, /(^|\n)\s*(status|validate|events|portfolio)\b/);
  });

  it('reports an uninitialized fresh workspace with zero counts', () => {
    const root = mkdtempSync(join(tmpdir(), 'themis-cli-status-'));
    roots.push(root);
    const result = runCli(root, ['workspace-status']);

    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), {
      initialized: false,
      stateFileExists: false,
      eventsFileExists: false,
      counts: { projects: 0, epics: 0, workItems: 0, sprints: 0 },
    });
  });

  it('creates and reads only a registered project store', () => {
    const root = mkdtempSync(join(tmpdir(), 'themis-cli-scoped-'));
    roots.push(root);
    const created = runCli(root, ['project-create', '--project', 'PRJ-CLI', '--name', 'CLI project']);
    assert.equal(created.status, 0, created.stderr);
    assertFreshProjectValid(root, 'PRJ-CLI');
    const epic = runCli(root, [
      'epic-create',
      '--project',
      'PRJ-CLI',
      '--id',
      'EPIC-CLI',
      '--title',
      'CLI epic',
      '--goal',
      'Validate CLI persistence',
    ]);
    assert.equal(epic.status, 0, epic.stderr);
    assertFreshProjectValid(root, 'PRJ-CLI');
    const item = runCli(root, [
      'work-create',
      '--project',
      'PRJ-CLI',
      '--id',
      'ITEM-CLI',
      '--epic',
      'EPIC-CLI',
      '--title',
      'CLI item',
      '--summary',
      'Exercise mutation persistence',
      '--acceptance',
      'valid',
      '--scope-in',
      'scripts',
      '--verify',
      'test',
    ]);
    assert.equal(item.status, 0, item.stderr);
    assertFreshProjectValid(root, 'PRJ-CLI');
    const listed = runCli(root, ['project-list', '--project', 'PRJ-CLI']);
    assert.equal(listed.status, 0, listed.stderr);
    assert.match(listed.stdout, /PRJ-CLI/);
    const timeline = runCli(root, ['timeline', '--project', 'PRJ-CLI']);
    assert.equal(timeline.status, 0, timeline.stderr);
    assert.match(timeline.stdout, /project\.created/);
  });

  for (const corruption of [
    'duplicate',
    'descending',
    'gapped',
    'malformed-event',
    'foreign-event',
    'malformed-entity',
    'foreign-entity',
  ]) {
    it(`project-sync rejects ${corruption} records without resealing`, () => {
      const root = mkdtempSync(join(tmpdir(), 'themis-cli-repair-negative-'));
      roots.push(root);
      assert.equal(runCli(root, ['project-create', '--project', 'PRJ-CLI', '--name', 'CLI project']).status, 0);
      assert.equal(
        runCli(root, [
          'epic-create',
          '--project',
          'PRJ-CLI',
          '--id',
          'EPIC-CLI',
          '--title',
          'CLI epic',
          '--goal',
          'Repair validation',
        ]).status,
        0,
      );
      const directory = join(root, '.themis', 'projects', 'PRJ-CLI');
      const statePath = join(directory, 'state.json');
      const eventsPath = join(directory, 'events.ndjson');
      const manifestPath = join(directory, 'manifest.json');
      const manifestBefore = readFileSync(manifestPath, 'utf8');
      const state = JSON.parse(readFileSync(statePath, 'utf8')) as Record<string, Array<Record<string, unknown>>>;
      const events = readFileSync(eventsPath, 'utf8')
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line) as Record<string, unknown>);

      if (corruption === 'duplicate') events[1]!.sequence = 1;
      if (corruption === 'descending') {
        events[0]!.sequence = 2;
        events[1]!.sequence = 1;
      }
      if (corruption === 'gapped') events[1]!.sequence = 3;
      if (corruption === 'malformed-event') delete events[1]!.actor;
      if (corruption === 'foreign-event') events[1]!.aggregateId = 'FOREIGN-EPIC';
      if (corruption === 'malformed-entity') delete state.epics![0]!.title;
      if (corruption === 'foreign-entity') state.epics![0]!.projectId = 'PRJ-FOREIGN';

      writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
      writeFileSync(eventsPath, `${events.map((event) => JSON.stringify(event)).join('\n')}\n`, 'utf8');
      const result = runCli(root, ['project-sync', '--project', 'PRJ-CLI']);

      assert.notEqual(result.status, 0);
      assert.equal(readFileSync(manifestPath, 'utf8'), manifestBefore);
      assert.notEqual(runCli(root, ['project-validate', '--project', 'PRJ-CLI']).status, 0);
    });
  }
});
