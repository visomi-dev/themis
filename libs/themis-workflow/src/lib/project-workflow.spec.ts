import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { test } from 'node:test';

import {
  ProjectWorkflowStore,
  WorkspaceRegistry,
  WorkflowError,
  redactPortable,
  translateEvent,
} from './project-workflow.ts';
import {
  assertCurrentMatchesManifest,
  commitProjectStore,
  recoverProjectStoreTransaction,
} from './project-store-persistence.ts';

test('registry is explicit, redacts locators, and isolates project stores', () => {
  const root = mkdtempSync(join(tmpdir(), 'themis-workflow-'));
  try {
    const registry = new WorkspaceRegistry(root);
    registry.register('one', 'One', root);
    registry.register('two', 'Two', root);
    assert.deepEqual(registry.list(), [
      { projectId: 'one', name: 'One', status: 'active' },
      { projectId: 'two', name: 'Two', status: 'active' },
    ]);
    const one = new ProjectWorkflowStore(registry, 'one');
    const two = new ProjectWorkflowStore(registry, 'two');
    const event = one.append('workitem.created', 'agent:test', { title: 'One' });
    assert.equal(one.cursor().sequence, 1);
    assert.equal(two.cursor().sequence, 0);
    assert.equal(translateEvent(event).activityType, 'workitem_created');
    assert.deepEqual(
      redactPortable({
        projectId: 'one',
        rootPath: root,
        workspaceRoot: root,
        nested: { key: 'secret', privateKey: 'private', token: 'token', password: 'password' },
      }),
      { projectId: 'one', nested: {} },
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('unknown and disabled projects fail with bounded errors', () => {
  const root = mkdtempSync(join(tmpdir(), 'themis-workflow-errors-'));
  try {
    const registry = new WorkspaceRegistry(root);
    assert.throws(
      () => new ProjectWorkflowStore(registry, 'missing'),
      (error: unknown) => error instanceof WorkflowError && error.code === 'UNKNOWN_PROJECT',
    );
    registry.register('one', 'One', root);
    registry.disable('one');
    assert.throws(
      () => new ProjectWorkflowStore(registry, 'one'),
      (error: unknown) => error instanceof WorkflowError && error.code === 'PROJECT_DISABLED',
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('registry supports update, disable, include-disabled listing, and removal', () => {
  const root = mkdtempSync(join(tmpdir(), 'themis-workflow-registry-'));
  const projectRoot = join(root, 'project-root');
  mkdirSync(projectRoot);
  try {
    const registry = new WorkspaceRegistry(root);
    registry.register('one', 'One', projectRoot);
    assert.deepEqual(registry.update('one', { name: 'Renamed' }), {
      projectId: 'one',
      name: 'Renamed',
      status: 'active',
    });
    assert.deepEqual(registry.disable('one'), { projectId: 'one', name: 'Renamed', status: 'disabled' });
    assert.deepEqual(registry.list(), []);
    assert.deepEqual(registry.list(true), [{ projectId: 'one', name: 'Renamed', status: 'disabled' }]);
    registry.remove('one');
    assert.deepEqual(registry.list(true), []);
    assert.throws(
      () => registry.remove('one'),
      (error: unknown) => error instanceof WorkflowError && error.code === 'UNKNOWN_PROJECT',
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('moved roots fail closed instead of opening a stale registration', () => {
  const root = mkdtempSync(join(tmpdir(), 'themis-workflow-moved-'));
  const projectRoot = join(root, 'project-root');
  mkdirSync(projectRoot);
  try {
    const registry = new WorkspaceRegistry(root);
    registry.register('one', 'One', projectRoot);
    rmSync(projectRoot, { recursive: true, force: true });
    assert.throws(
      () => new ProjectWorkflowStore(registry, 'one'),
      (error: unknown) => error instanceof WorkflowError && error.code === 'MOVED_ROOT',
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('corrupt project state returns a bounded corruption error', () => {
  const root = mkdtempSync(join(tmpdir(), 'themis-workflow-corrupt-'));
  try {
    const registry = new WorkspaceRegistry(root);
    registry.register('one', 'One', root);
    const store = new ProjectWorkflowStore(registry, 'one');
    store.domain().createProject({ id: 'one', name: 'One', summary: 'One' });
    const manifestPath = join(root, '.themis', 'projects', 'one', 'manifest.json');
    const manifestBefore = readFileSync(manifestPath, 'utf8');
    writeFileSync(join(root, '.themis', 'projects', 'one', 'state.json'), '{not-json', 'utf8');
    assert.throws(
      () => store.domain().listProjects(),
      (error: unknown) => error instanceof WorkflowError && error.code === 'CORRUPT_STORE',
    );
    assert.equal(readFileSync(manifestPath, 'utf8'), manifestBefore, 'checksum mismatch must not be silently resealed');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('migration fencing rejects legacy global state before project activation', () => {
  const root = mkdtempSync(join(tmpdir(), 'themis-workflow-fence-'));
  try {
    const registry = new WorkspaceRegistry(root);
    registry.register('one', 'One', root);
    writeFileSync(join(root, '.themis', 'state.json'), JSON.stringify({ schemaVersion: 2 }), 'utf8');
    assert.throws(
      () => new ProjectWorkflowStore(registry, 'one'),
      (error: unknown) => error instanceof WorkflowError && error.code === 'MIGRATION_REQUIRED',
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('project authority permits new project stores after migration cutover', () => {
  const root = mkdtempSync(join(tmpdir(), 'themis-workflow-cutover-'));
  try {
    const registry = new WorkspaceRegistry(root);
    registry.register('one', 'One', root);
    writeFileSync(join(root, '.themis', 'state.json'), JSON.stringify({ schemaVersion: 2 }), 'utf8');
    mkdirSync(join(root, '.themis', 'migration'), { recursive: true });
    writeFileSync(
      join(root, '.themis', 'migration', 'cutover.json'),
      JSON.stringify({ authority: 'project-stores', writesFenced: true }),
      'utf8',
    );

    const domain = new ProjectWorkflowStore(registry, 'one').domain();
    domain.createProject({ id: 'one', name: 'One', summary: 'One' });

    assert.deepEqual(
      domain.listProjects().map((project) => project.id),
      ['one'],
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('rejects traversal ids before deriving a project store path', () => {
  const root = mkdtempSync(join(tmpdir(), 'themis-workflow-path-'));
  try {
    const registry = new WorkspaceRegistry(root);
    assert.throws(
      () => registry.register('../../escape', 'Escape', root),
      (error: unknown) => error instanceof WorkflowError && error.code === 'INVALID_PROJECT_ID',
    );
    assert.equal(resolve(root, '.themis', 'projects', 'escape').startsWith(resolve(root)), true);
    assert.equal(registry.list().length, 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('complete domain operations remain isolated behind the registered store', () => {
  const root = mkdtempSync(join(tmpdir(), 'themis-workflow-domain-'));
  try {
    const registry = new WorkspaceRegistry(root);
    registry.register('one', 'One', root);
    registry.register('two', 'Two', root);
    const one = new ProjectWorkflowStore(registry, 'one').domain();
    const two = new ProjectWorkflowStore(registry, 'two').domain();
    one.createProject({ id: 'one', name: 'One', summary: 'One' });
    two.createProject({ id: 'two', name: 'Two', summary: 'Two' });
    const item = one.createWorkItem({
      title: 'Only one',
      summary: 'one',
      acceptanceCriteria: [],
      scopeIn: [],
      scopeOut: [],
      verificationStrategy: [],
    });
    assert.equal(two.listWorkItems().length, 0);
    assert.throws(() => two.updateWorkItem(item.id, { title: 'cross-project' }));
    assert.equal(one.listProjects()[0]?.id, 'one');
    assert.equal(two.listProjects()[0]?.id, 'two');
    assert.throws(
      () => two.readyQueue('sprint-owned-by-one'),
      (error: unknown) => error instanceof WorkflowError && error.code === 'UNKNOWN_PROJECT',
    );
    assert.equal(
      two.timeline().every((event) => event.aggregateId !== item.id),
      true,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('every complete-domain operation rejects foreign project identifiers', () => {
  const root = mkdtempSync(join(tmpdir(), 'themis-workflow-domain-adversarial-'));
  try {
    const registry = new WorkspaceRegistry(root);
    registry.register('one', 'One', root);
    registry.register('two', 'Two', root);
    const one = new ProjectWorkflowStore(registry, 'one').domain();
    const two = new ProjectWorkflowStore(registry, 'two').domain();
    one.createProject({ id: 'one', name: 'One', summary: 'One' });
    two.createProject({ id: 'two', name: 'Two', summary: 'Two' });
    const itemOne = one.createWorkItem({
      id: 'ITEM-ONE',
      title: 'One item',
      summary: 'One',
      acceptanceCriteria: ['done'],
      scopeIn: ['test'],
      scopeOut: [],
      verificationStrategy: ['test'],
    });
    const itemTwo = two.createWorkItem({
      id: 'ITEM-TWO',
      title: 'Two item',
      summary: 'Two',
      acceptanceCriteria: ['done'],
      scopeIn: ['test'],
      scopeOut: [],
      verificationStrategy: ['test'],
    });
    const epicTwo = two.createEpic({ id: 'EPIC-TWO', projectId: 'two', title: 'Two epic', summary: '', goal: '' });
    two.transitionWorkItem(itemTwo.id, 'ready');
    const revisionTwo = two.proposeSprint({
      projectId: 'two',
      goal: 'Two sprint',
      why: 'Isolation',
      what: 'Isolation',
      how: 'Isolation',
      workItemIds: [itemTwo.id],
      epicIds: [epicTwo.id],
      nonGoals: [],
      definitionOfDone: ['done'],
      verificationStrategy: ['test'],
    });
    two.claimWorkItem(itemTwo.id, 'agent:two');
    const runTwo = two.startRun(itemTwo.id, 'agent:two');
    two.finishRun(runTwo.id, 'completed', 'done');
    two.addEvidence(runTwo.id, 'verification', 'done', 'done');
    two.addEvidence(runTwo.id, 'implementation-diff', 'done', 'done');
    const reviewTwo = two.requestReview(itemTwo.id, 'reviewer:two');

    const rejects = [
      () => one.addDependency(itemTwo.id, itemOne.id),
      () => one.addEvidence(runTwo.id, 'verification', 'foreign', 'foreign'),
      () => one.addSprintEvidence(revisionTwo.sprintId, 'verification', 'foreign', 'foreign'),
      () => one.approveSprint(revisionTwo.sprintId, revisionTwo.id),
      () => one.activateSprint(revisionTwo.sprintId, revisionTwo.id),
      () => one.claimWorkItem(itemTwo.id, 'agent:one'),
      () => one.closeSprint(revisionTwo.sprintId),
      () => one.createEpic({ id: 'EPIC-FOREIGN', projectId: 'two', title: 'Foreign', summary: '', goal: '' }),
      () => one.createProject({ id: 'two', name: 'Foreign', summary: '' }),
      () => one.createWorkItem({ ...itemOne, id: 'ITEM-FOREIGN', projectId: 'two' }),
      () => one.finishRun(runTwo.id, 'completed', 'foreign'),
      () => one.listWorkItems({ projectId: 'two' }),
      () => one.listWorkItems({ epicId: epicTwo.id }),
      () => one.listWorkItems({ sprintId: revisionTwo.sprintId }),
      () =>
        one.proposeSprint({
          projectId: 'two',
          goal: 'Foreign',
          why: 'Foreign',
          what: 'Foreign',
          how: 'Foreign',
          workItemIds: [itemOne.id],
          nonGoals: [],
          definitionOfDone: ['done'],
          verificationStrategy: ['test'],
        }),
      () => one.requestReview(itemTwo.id, 'reviewer:one'),
      () => one.startRun(itemTwo.id, 'agent:one'),
      () => one.submitReview(reviewTwo.id, 'accepted', 'foreign'),
      () => one.transitionWorkItem(itemTwo.id, 'ready'),
      () => one.updateWorkItem(itemTwo.id, { title: 'foreign' }),
    ];
    for (const operation of rejects)
      assert.throws(operation, (error: unknown) => error instanceof WorkflowError && error.code === 'UNKNOWN_PROJECT');

    assert.deepEqual(one.listEpics(), []);
    assert.deepEqual(one.listSprints(), []);
    assert.equal(one.listProjects()[0]?.id, 'one');
    assert.equal(
      one.portfolio().every((entry) => entry.project.id === 'one'),
      true,
    );
    assert.equal(
      one.readState().projects.every((project) => project.id === 'one'),
      true,
    );
    assert.equal(
      one.timeline().every((event) => event.aggregateId !== itemTwo.id),
      true,
    );
    assert.equal(
      one.flowReadyQueue().every((item) => item.projectId === 'one'),
      true,
    );
    assert.equal(one.validateState().valid, true);
    assert.equal(one.workspaceStatus().initialized, true);
    assert.throws(
      () => one.readyQueue(revisionTwo.sprintId),
      (error: unknown) => error instanceof WorkflowError && error.code === 'UNKNOWN_PROJECT',
    );
    assert.deepEqual(one.removeSprints(), {
      removedSprintIds: [],
      removedRevisionIds: [],
      removedMemberships: 0,
      removedSprintEvidence: 0,
      resetPlannedWorkItems: [],
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('lock contention across runtimes fails with a bounded actionable error', () => {
  const root = mkdtempSync(join(tmpdir(), 'themis-workflow-lock-'));
  try {
    const registry = new WorkspaceRegistry(root);
    registry.register('one', 'One', root);
    const lock = join(root, '.themis', 'projects', 'one', '.project.lock');
    mkdirSync(join(root, '.themis', 'projects', 'one'), { recursive: true });
    writeFileSync(lock, 'held-by-test\n', 'utf8');
    const modulePath = resolve('libs/themis-workflow/src/lib/project-workflow.ts');
    const source = `import { WorkspaceRegistry, ProjectWorkflowStore } from ${JSON.stringify(modulePath)}; try { new ProjectWorkflowStore(new WorkspaceRegistry(process.argv[1]), 'one').append('locked', 'child', {}); process.exit(0); } catch (error) { process.stdout.write(JSON.stringify({ code: error.code })); process.exit(2); }`;
    const result = spawnSync(
      process.execPath,
      ['--experimental-strip-types', '--input-type=module', '-e', source, root],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
      },
    );
    assert.equal(result.status, 2);
    assert.match(result.stdout, /LOCKED/);
    rmSync(lock, { force: true });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('serializes appends from separate runtimes with a filesystem lock', async () => {
  const root = mkdtempSync(join(tmpdir(), 'themis-workflow-concurrency-'));
  try {
    const registry = new WorkspaceRegistry(root);
    registry.register('one', 'One', root);
    const modulePath = resolve('libs/themis-workflow/src/lib/project-workflow.ts');
    const source = `import { WorkspaceRegistry, ProjectWorkflowStore } from ${JSON.stringify(modulePath)}; const registry = new WorkspaceRegistry(process.argv[1]); new ProjectWorkflowStore(registry, 'one').append('concurrent.append', process.argv[2], {});`;
    const run = (actor: string): Promise<number> =>
      new Promise((resolvePromise, reject) => {
        const child = spawn(
          process.execPath,
          ['--experimental-strip-types', '--input-type=module', '-e', source, root, actor],
          {
            cwd: process.cwd(),
            stdio: 'ignore',
          },
        );
        child.once('error', reject);
        child.once('exit', (code) => resolvePromise(code ?? 1));
      });
    assert.deepEqual(await Promise.all([run('a'), run('b')]), [0, 0]);
    const events = new ProjectWorkflowStore(registry, 'one').events();
    assert.deepEqual(
      events.map((event) => event.sequence),
      [1, 2],
    );
    assert.equal(new Set(events.map((event) => event.actor)).size, 2);
    assertCurrentMatchesManifest(join(root, '.themis', 'projects', 'one'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('refreshes the manifest after every workflow mutation family', () => {
  const root = mkdtempSync(join(tmpdir(), 'themis-workflow-manifest-families-'));
  try {
    const registry = new WorkspaceRegistry(root);
    registry.register('one', 'One', root);
    const store = new ProjectWorkflowStore(registry, 'one');
    const domain = store.domain();
    const directory = join(root, '.themis', 'projects', 'one');
    let generation = 1;
    const mutation = <T>(operation: () => T): T => {
      const result = operation();
      generation += 1;
      assert.equal(assertCurrentMatchesManifest(directory).generation, generation);
      assert.equal(domain.validateState().valid, true);
      return result;
    };

    mutation(() => domain.createProject({ id: 'one', name: 'One', summary: 'One' }));
    const epic = mutation(() =>
      domain.createEpic({ id: 'EPIC-ONE', projectId: 'one', title: 'Epic', summary: 'Epic', goal: 'Goal' }),
    );
    const first = mutation(() =>
      domain.createWorkItem({
        id: 'ITEM-ONE',
        epicId: epic.id,
        title: 'First',
        summary: 'First',
        acceptanceCriteria: ['done'],
        scopeIn: ['scope'],
        scopeOut: [],
        verificationStrategy: ['test'],
      }),
    );
    const second = mutation(() =>
      domain.createWorkItem({
        id: 'ITEM-TWO',
        title: 'Second',
        summary: 'Second',
        acceptanceCriteria: ['done'],
        scopeIn: ['scope'],
        scopeOut: [],
        verificationStrategy: ['test'],
      }),
    );
    mutation(() => domain.updateWorkItem(first.id, { title: 'Updated' }));
    mutation(() => domain.addDependency(first.id, second.id));
    mutation(() => domain.transitionWorkItem(first.id, 'ready'));
    mutation(() => domain.transitionWorkItem(second.id, 'ready'));
    const revision = mutation(() =>
      domain.proposeSprint({
        projectId: 'one',
        goal: 'Goal',
        why: 'Why',
        what: 'What',
        how: 'How',
        workItemIds: [first.id],
        epicIds: [epic.id],
        nonGoals: [],
        definitionOfDone: ['done'],
        verificationStrategy: ['test'],
      }),
    );
    mutation(() => domain.approveSprint(revision.sprintId, revision.id));
    mutation(() => domain.activateSprint(revision.sprintId, revision.id));
    mutation(() => domain.claimWorkItem(first.id, 'executor'));
    const run = mutation(() => domain.startRun(first.id, 'executor'));
    mutation(() => domain.addEvidence(run.id, 'verification', 'verified', 'pass'));
    mutation(() => domain.addEvidence(run.id, 'implementation-diff', 'diff', 'files'));
    mutation(() => domain.finishRun(run.id, 'completed', 'complete'));
    const review = mutation(() => domain.requestReview(first.id, 'reviewer'));
    mutation(() => domain.submitReview(review.id, 'accepted', 'accepted'));
    mutation(() => domain.addSprintEvidence(revision.sprintId, 'verification', 'verified', 'pass'));
    mutation(() => domain.closeSprint(revision.sprintId));
    mutation(() => domain.removeSprints());
    assert.equal(domain.workspaceStatus().initialized, true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('compatibility schema rewrites update the manifest before returning', () => {
  const root = mkdtempSync(join(tmpdir(), 'themis-workflow-schema-rewrite-'));
  try {
    const registry = new WorkspaceRegistry(root);
    registry.register('one', 'One', root);
    new ProjectWorkflowStore(registry, 'one');
    const directory = join(root, '.themis', 'projects', 'one');
    const legacyState = {
      schemaVersion: 1,
      projectId: 'one',
      projects: [{ id: 'one', name: 'One', summary: '', status: 'active', createdAt: '2026-01-01T00:00:00.000Z' }],
      workItems: [],
    };
    commitProjectStore(directory, 'one', `${JSON.stringify(legacyState, null, 2)}\n`, '');
    const generationBefore = assertCurrentMatchesManifest(directory).generation;

    const state = new ProjectWorkflowStore(registry, 'one').domain().readState();

    assert.equal(state.schemaVersion, 2);
    assert.equal(assertCurrentMatchesManifest(directory).generation, generationBefore + 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('recovers an interrupted authority transition without accepting unrelated bytes', () => {
  const root = mkdtempSync(join(tmpdir(), 'themis-workflow-recovery-'));
  const directory = join(root, 'one');
  const initial = { schemaVersion: 2, projectId: 'one', projects: [], workItems: [] };
  const next = {
    schemaVersion: 2,
    projectId: 'one',
    projects: [{ id: 'one', name: 'One' }],
    workItems: [],
  };
  try {
    commitProjectStore(directory, 'one', `${JSON.stringify(initial, null, 2)}\n`, '');
    assert.throws(
      () =>
        commitProjectStore(directory, 'one', `${JSON.stringify(next, null, 2)}\n`, '{"sequence":1}\n', {
          observe: (step) => {
            if (step === 'state-installed') throw new Error('simulated interruption');
          },
        }),
      /simulated interruption/,
    );
    assert.throws(() => assertCurrentMatchesManifest(directory), /checksum mismatch/);

    recoverProjectStoreTransaction(directory);

    assert.equal(JSON.parse(readFileSync(join(directory, 'state.json'), 'utf8')).projects.length, 1);
    assert.equal(assertCurrentMatchesManifest(directory).generation, 2);
    writeFileSync(join(directory, 'events.ndjson'), 'unrelated corruption\n', 'utf8');
    assert.throws(() => assertCurrentMatchesManifest(directory), /checksum mismatch/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

for (const interruptedAt of ['prepared', 'state-installed', 'events-installed', 'manifest-installed'] as const) {
  test(`recovers initial project-store creation interrupted at ${interruptedAt}`, () => {
    const root = mkdtempSync(join(tmpdir(), 'themis-workflow-initial-recovery-'));
    const directory = join(root, 'one');
    const initial = { schemaVersion: 2, projectId: 'one', projects: [], workItems: [] };
    try {
      assert.throws(
        () =>
          commitProjectStore(directory, 'one', `${JSON.stringify(initial, null, 2)}\n`, '', {
            observe: (step) => {
              if (step === interruptedAt) throw new Error('simulated initial interruption');
            },
          }),
        /simulated initial interruption/,
      );

      recoverProjectStoreTransaction(directory);

      assert.equal(assertCurrentMatchesManifest(directory).generation, 1);
      assert.equal(JSON.parse(readFileSync(join(directory, 'state.json'), 'utf8')).projectId, 'one');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}
