import { tool } from '@opencode-ai/plugin';

import {
  activateSprint,
  addDependency,
  addEvidence,
  approveSprint,
  claimWorkItem,
  createWorkItem,
  finishRun,
  proposeSprint,
  readState,
  readyQueue,
  requestReview,
  startRun,
  submitReview,
  transitionWorkItem,
  validateState,
} from './themis-core.ts';

const output = (value: unknown): string => JSON.stringify(value, null, 2);

export const workitem_create = tool({
  description: 'Create a local Themis work item in draft state.',
  args: {
    title: tool.schema.string().describe('Short work item title'),
    summary: tool.schema.string().describe('Problem and expected outcome'),
    acceptanceCriteria: tool.schema.array(tool.schema.string()).describe('Observable acceptance criteria'),
    scopeIn: tool.schema.array(tool.schema.string()).describe('Allowed implementation scope'),
    scopeOut: tool.schema.array(tool.schema.string()).describe('Explicitly excluded scope'),
    verificationStrategy: tool.schema.array(tool.schema.string()).describe('Commands or checks required before review'),
    id: tool.schema.string().optional().describe('Optional stable identifier, for example THM-001'),
  },
  async execute(args, context) {
    return output(createWorkItem(context.worktree, args, `agent:${context.agent}`));
  },
});

export const workitem_get = tool({
  description: 'Read a local Themis work item and its related runs, evidence, and reviews.',
  args: { id: tool.schema.string().describe('Work item identifier') },
  async execute(args, context) {
    const state = readState(context.worktree);
    const item = state.workItems.find((candidate) => candidate.id === args.id);
    if (!item) return output({ error: `Work item not found: ${args.id}` });
    return output({
      item,
      dependencies: state.dependencies.filter((dependency) => dependency.from === args.id || dependency.to === args.id),
      runs: state.runs.filter((run) => run.workItemId === args.id),
      reviews: state.reviews.filter((review) => review.workItemId === args.id),
    });
  },
});

export const workitem_transition = tool({
  description: 'Apply a validated state transition to a Themis work item.',
  args: {
    id: tool.schema.string().describe('Work item identifier'),
    to: tool.schema.enum([
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
    ]),
  },
  async execute(args, context) {
    return output(transitionWorkItem(context.worktree, args.id, args.to, `agent:${context.agent}`));
  },
});

export const dependency_add = tool({
  description: 'Declare that one work item blocks another.',
  args: {
    from: tool.schema.string().describe('Blocking work item identifier'),
    to: tool.schema.string().describe('Blocked work item identifier'),
  },
  async execute(args, context) {
    return output(addDependency(context.worktree, args.from, args.to, `agent:${context.agent}`));
  },
});

export const sprint_propose = tool({
  description: 'Create a versioned local sprint proposal from existing work items.',
  args: {
    goal: tool.schema.string().describe('Sprint Goal'),
    why: tool.schema.string().describe('Why the sprint matters'),
    what: tool.schema.string().describe('What outcome the sprint delivers'),
    how: tool.schema.string().describe('How the selected work will be delivered'),
    workItemIds: tool.schema.array(tool.schema.string()).describe('Selected work item identifiers'),
    nonGoals: tool.schema.array(tool.schema.string()).describe('Explicit non-goals'),
    definitionOfDone: tool.schema.array(tool.schema.string()).describe('Sprint completion conditions'),
    verificationStrategy: tool.schema.array(tool.schema.string()).describe('Sprint-level verification'),
    sprintId: tool.schema.string().optional().describe('Existing sprint identifier for a new revision'),
  },
  async execute(args, context) {
    const revision = proposeSprint(context.worktree, args, `agent:${context.agent}`);
    return output({ ...revision, revisionId: revision.id });
  },
});

export const sprint_approve = tool({
  description: 'Approve a sprint revision. This is a human gate and does not activate the sprint.',
  args: {
    sprintId: tool.schema.string().describe('Sprint identifier'),
    revisionId: tool.schema.string().describe('Revision identifier'),
  },
  async execute(args, context) {
    return output(approveSprint(context.worktree, args.sprintId, args.revisionId, `agent:${context.agent}`));
  },
});

export const sprint_activate = tool({
  description: 'Activate an approved sprint revision and calculate its executable baseline.',
  args: {
    sprintId: tool.schema.string().describe('Sprint identifier'),
    revisionId: tool.schema.string().describe('Approved revision identifier'),
  },
  async execute(args, context) {
    return output(activateSprint(context.worktree, args.sprintId, args.revisionId, `agent:${context.agent}`));
  },
});

export const ready_queue = tool({
  description: 'Return only sprint work items with all blocking dependencies completed.',
  args: { sprintId: tool.schema.string().describe('Active sprint identifier') },
  async execute(args, context) {
    return output(readyQueue(context.worktree, args.sprintId));
  },
});

export const work_claim = tool({
  description: 'Claim one ready work item for the current execution agent.',
  args: {
    id: tool.schema.string().describe('Work item identifier'),
    agent: tool.schema.string().describe('Logical executor identifier'),
  },
  async execute(args, context) {
    return output(claimWorkItem(context.worktree, args.id, args.agent, `agent:${context.agent}`));
  },
});

export const run_start = tool({
  description: 'Start an execution run for a claimed work item.',
  args: {
    workItemId: tool.schema.string().describe('Claimed work item identifier'),
    agent: tool.schema.string().describe('Executor identifier'),
  },
  async execute(args, context) {
    const run = startRun(context.worktree, args.workItemId, args.agent, `agent:${context.agent}`);
    return output({ ...run, runId: run.id });
  },
});

export const run_finish = tool({
  description: 'Finish an execution run before requesting review.',
  args: {
    runId: tool.schema.string().describe('Run identifier'),
    status: tool.schema.enum(['completed', 'failed']),
    terminationReason: tool.schema.string().describe('Observed result of the run'),
  },
  async execute(args, context) {
    return output(
      finishRun(context.worktree, args.runId, args.status, args.terminationReason, `agent:${context.agent}`),
    );
  },
});

export const evidence_add = tool({
  description: 'Attach auditable evidence to an execution run.',
  args: {
    runId: tool.schema.string().describe('Run identifier'),
    kind: tool.schema.enum(['verification', 'implementation-diff', 'command', 'observation']),
    summary: tool.schema.string().describe('Human-readable evidence summary'),
    value: tool.schema.string().describe('Command output, commit, diff reference, or observation'),
  },
  async execute(args, context) {
    return output(
      addEvidence(context.worktree, args.runId, args.kind, args.summary, args.value, `agent:${context.agent}`),
    );
  },
});

export const review_request = tool({
  description: 'Request independent review after verification and implementation evidence exist.',
  args: {
    workItemId: tool.schema.string().describe('Work item identifier'),
    reviewer: tool.schema.string().describe('Reviewer agent identifier'),
  },
  async execute(args, context) {
    const review = requestReview(context.worktree, args.workItemId, args.reviewer, `agent:${context.agent}`);
    return output({ ...review, reviewId: review.id });
  },
});

export const review_submit = tool({
  description: 'Submit an independent review decision and move work to done or rework.',
  args: {
    reviewId: tool.schema.string().describe('Review identifier'),
    verdict: tool.schema.enum(['accepted', 'rejected']),
    feedback: tool.schema.string().describe('Review decision and actionable feedback'),
  },
  async execute(args, context) {
    return output(submitReview(context.worktree, args.reviewId, args.verdict, args.feedback, `agent:${context.agent}`));
  },
});

export const validate = tool({
  description: 'Validate local Themis state references and return entity counts.',
  args: {},
  async execute(_args, context) {
    return output(validateState(context.worktree));
  },
});
