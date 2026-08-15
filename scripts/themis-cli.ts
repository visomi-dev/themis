import { boolean, command, run, string, type Command } from '@drizzle-team/brocli';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  activateSprint,
  addDependency,
  addEvidence,
  approveSprint,
  claimWorkItem,
  createWorkItem,
  finishRun,
  paths,
  proposeSprint,
  readState,
  readyQueue,
  requestReview,
  startRun,
  submitReview,
  transitionWorkItem,
  validateState,
} from '../.opencode/tools/themis-core.ts';
import { formatSummary, summarizeSprint } from './themis-view.ts';
import { startTui } from './themis-tui.ts';

const split = (value: string): string[] =>
  value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

const print = (value: unknown, asJson: boolean): void => {
  if (asJson) {
    console.log(JSON.stringify(value, null, 2));
    return;
  }
  console.log(typeof value === 'string' ? value : JSON.stringify(value, null, 2));
};

const baseOptions = () => ({
  root: string().desc('Project root containing .themis').default('.'),
  json: boolean().desc('Print machine-readable JSON').default(false),
});

const status = command({
  name: 'status',
  desc: 'Show the current sprint and operational work state',
  options: { ...baseOptions(), sprint: string().desc('Sprint identifier').default('') },
  handler: (options) => {
    const summary = summarizeSprint(options.root, options.sprint || undefined);
    print(options.json ? summary : formatSummary(summary), options.json);
  },
});

const ready = command({
  name: 'ready',
  desc: 'Show work items whose dependencies are complete',
  options: { ...baseOptions(), sprint: string().desc('Active sprint identifier').required() },
  handler: (options) => {
    const state = readState(options.root);
    const readyIds = new Set(readyQueue(options.root, options.sprint).map((item) => item.id));
    const result = state.workItems.filter((item) => readyIds.has(item.id));
    print(
      options.json
        ? result
        : result.length > 0
          ? result.map((item) => `${item.id}\t${item.title}`).join('\n')
          : 'No ready work.',
      options.json,
    );
  },
});

const validate = command({
  name: 'validate',
  desc: 'Validate local state references and report entity counts',
  options: { ...baseOptions() },
  handler: (options) => print(validateState(options.root), options.json),
});

const events = command({
  name: 'events',
  desc: 'Print the latest append-only workflow events',
  options: { ...baseOptions(), limit: string().desc('Number of events').default('20') },
  handler: (options) => {
    const location = paths(options.root).events;
    const entries = existsSync(location)
      ? readFileSync(location, 'utf8')
          .split('\n')
          .filter(Boolean)
          .map((line) => JSON.parse(line))
      : [];
    const result = entries.slice(-Math.max(1, Number(options.limit) || 20));
    print(
      options.json
        ? result
        : result.map((event) => `${event.sequence}\t${event.type}\t${event.aggregateId}\t${event.actor}`).join('\n') ||
            'No events.',
      options.json,
    );
  },
});

const workCreate = command({
  name: 'work-create',
  desc: 'Create a draft work item',
  options: {
    ...baseOptions(),
    title: string().desc('Work item title').required(),
    summary: string().desc('Work item summary').required(),
    acceptance: string().desc('Comma-separated acceptance criteria').required(),
    scopeIn: string('scope-in').desc('Comma-separated allowed paths').required(),
    scopeOut: string('scope-out').desc('Comma-separated excluded paths').default(''),
    verify: string().desc('Comma-separated verification commands').required(),
    id: string().desc('Optional work item identifier').default(''),
  },
  handler: (options) => {
    const result = createWorkItem(
      options.root,
      {
        id: options.id || undefined,
        title: options.title,
        summary: options.summary,
        acceptanceCriteria: split(options.acceptance),
        scopeIn: split(options.scopeIn),
        scopeOut: split(options.scopeOut),
        verificationStrategy: split(options.verify),
      },
      'human:cli',
    );
    print(result, options.json);
  },
});

const workTransition = command({
  name: 'work-transition',
  desc: 'Apply a validated work item state transition',
  options: {
    ...baseOptions(),
    id: string().desc('Work item identifier').required(),
    to: string()
      .desc('Destination state')
      .enum(
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
      )
      .required(),
  },
  handler: (options) => print(transitionWorkItem(options.root, options.id, options.to, 'human:cli'), options.json),
});

const dependencyAdd = command({
  name: 'dependency-add',
  desc: 'Add a blocking dependency',
  options: {
    ...baseOptions(),
    from: string().desc('Blocking work item').required(),
    to: string().desc('Blocked work item').required(),
  },
  handler: (options) => print(addDependency(options.root, options.from, options.to, 'human:cli'), options.json),
});

const sprintPropose = command({
  name: 'sprint-propose',
  desc: 'Create a versioned sprint proposal',
  options: {
    ...baseOptions(),
    goal: string().desc('Sprint Goal').required(),
    why: string().desc('Why this sprint matters').required(),
    what: string().desc('What the sprint delivers').required(),
    how: string().desc('How it will be delivered').required(),
    workItems: string('work-items').desc('Comma-separated work item identifiers').required(),
    nonGoals: string('non-goals').desc('Comma-separated non-goals').default(''),
    done: string().desc('Comma-separated Definition of Done').required(),
    verify: string().desc('Comma-separated verification commands').required(),
    sprint: string().desc('Existing sprint identifier for a revision').default(''),
  },
  handler: (options) =>
    print(
      proposeSprint(
        options.root,
        {
          goal: options.goal,
          why: options.why,
          what: options.what,
          how: options.how,
          workItemIds: split(options.workItems),
          nonGoals: split(options.nonGoals),
          definitionOfDone: split(options.done),
          verificationStrategy: split(options.verify),
          sprintId: options.sprint || undefined,
        },
        'human:cli',
      ),
      options.json,
    ),
});

const sprintApprove = command({
  name: 'sprint-approve',
  desc: 'Approve a sprint revision',
  options: {
    ...baseOptions(),
    sprint: string().desc('Sprint identifier').required(),
    revision: string().desc('Revision identifier').required(),
  },
  handler: (options) => print(approveSprint(options.root, options.sprint, options.revision, 'human:cli'), options.json),
});

const sprintActivate = command({
  name: 'sprint-activate',
  desc: 'Activate an approved sprint revision',
  options: {
    ...baseOptions(),
    sprint: string().desc('Sprint identifier').required(),
    revision: string().desc('Revision identifier').required(),
  },
  handler: (options) =>
    print(activateSprint(options.root, options.sprint, options.revision, 'human:cli'), options.json),
});

const claim = command({
  name: 'claim',
  desc: 'Claim a ready work item',
  options: {
    ...baseOptions(),
    id: string().desc('Work item identifier').required(),
    agent: string().desc('Agent identifier').default('human-cli'),
  },
  handler: (options) => print(claimWorkItem(options.root, options.id, options.agent, 'human:cli'), options.json),
});

const runStart = command({
  name: 'run-start',
  desc: 'Start a run for a claimed work item',
  options: {
    ...baseOptions(),
    workItem: string('work-item').desc('Work item identifier').required(),
    agent: string().desc('Agent identifier').default('human-cli'),
  },
  handler: (options) => print(startRun(options.root, options.workItem, options.agent, 'human:cli'), options.json),
});

const runFinish = command({
  name: 'run-finish',
  desc: 'Finish an execution run',
  options: {
    ...baseOptions(),
    run: string().desc('Run identifier').required(),
    status: string().desc('Run result').enum('completed', 'failed').required(),
    reason: string().desc('Termination reason').required(),
  },
  handler: (options) =>
    print(finishRun(options.root, options.run, options.status, options.reason, 'human:cli'), options.json),
});

const evidenceAdd = command({
  name: 'evidence-add',
  desc: 'Attach evidence to a run',
  options: {
    ...baseOptions(),
    run: string().desc('Run identifier').required(),
    kind: string()
      .desc('Evidence kind')
      .enum('verification', 'implementation-diff', 'command', 'observation')
      .required(),
    summary: string().desc('Evidence summary').required(),
    value: string().desc('Evidence value').required(),
  },
  handler: (options) =>
    print(
      addEvidence(options.root, options.run, options.kind, options.summary, options.value, 'human:cli'),
      options.json,
    ),
});

const reviewRequest = command({
  name: 'review-request',
  desc: 'Request an independent review',
  options: {
    ...baseOptions(),
    workItem: string('work-item').desc('Work item identifier').required(),
    reviewer: string().desc('Reviewer identifier').required(),
  },
  handler: (options) =>
    print(requestReview(options.root, options.workItem, options.reviewer, 'human:cli'), options.json),
});

const reviewSubmit = command({
  name: 'review-submit',
  desc: 'Submit an accepted or rejected review',
  options: {
    ...baseOptions(),
    review: string().desc('Review identifier').required(),
    verdict: string().desc('Review verdict').enum('accepted', 'rejected').required(),
    feedback: string().desc('Review feedback').required(),
  },
  handler: (options) =>
    print(submitReview(options.root, options.review, options.verdict, options.feedback, 'human:cli'), options.json),
});

const tui = command({
  name: 'tui',
  desc: 'Open the interactive local sprint dashboard',
  options: {
    root: string().desc('Project root containing .themis').default('.'),
    sprint: string().desc('Sprint identifier').default(''),
  },
  handler: (options) => startTui(options.root, options.sprint || undefined),
});

const commands: Command[] = [
  status,
  ready,
  validate,
  events,
  workCreate,
  workTransition,
  dependencyAdd,
  sprintPropose,
  sprintApprove,
  sprintActivate,
  claim,
  runStart,
  runFinish,
  evidenceAdd,
  reviewRequest,
  reviewSubmit,
  tui,
];

const cliPath = fileURLToPath(import.meta.url);
const isMain = process.argv[1] === cliPath;

if (isMain) {
  run(commands, { name: 'themis', description: 'Local operational control plane for OpenCode work', version: '0.1.0' });
}

export { commands, status };
