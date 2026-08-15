import { appendFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

type WorkItemStatus =
  | 'draft'
  | 'ready'
  | 'planned'
  | 'claimed'
  | 'in_progress'
  | 'review'
  | 'rework'
  | 'done'
  | 'blocked'
  | 'rejected'
  | 'cancelled';

type SprintStatus = 'draft' | 'proposed' | 'approved' | 'active' | 'closed';
type ReviewVerdict = 'accepted' | 'rejected';
type RunStatus = 'running' | 'completed' | 'failed';
type EvidenceKind = 'verification' | 'implementation-diff' | 'command' | 'observation';

type WorkItem = {
  id: string;
  title: string;
  summary: string;
  status: WorkItemStatus;
  acceptanceCriteria: string[];
  scopeIn: string[];
  scopeOut: string[];
  verificationStrategy: string[];
  sprintId?: string;
  claimedBy?: string;
  claimedAt?: string;
};

type Dependency = {
  from: string;
  to: string;
  relation: 'blocks';
};

type SprintRevision = {
  id: string;
  sprintId: string;
  version: number;
  status: 'proposed' | 'approved';
  workItemIds: string[];
  why: string;
  what: string;
  how: string;
  nonGoals: string[];
  definitionOfDone: string[];
  verificationStrategy: string[];
  createdAt: string;
  approvedAt?: string;
};

type Sprint = {
  id: string;
  goal: string;
  status: SprintStatus;
  activeRevisionId?: string;
  createdAt: string;
};

type AgentRun = {
  id: string;
  workItemId: string;
  agent: string;
  status: RunStatus;
  startedAt: string;
  finishedAt?: string;
  terminationReason?: string;
};

type Evidence = {
  id: string;
  runId: string;
  kind: EvidenceKind;
  summary: string;
  value: string;
  createdAt: string;
};

type Review = {
  id: string;
  workItemId: string;
  runId: string;
  reviewer: string;
  verdict?: ReviewVerdict;
  feedback?: string;
  createdAt: string;
  decidedAt?: string;
};

type ThemisState = {
  schemaVersion: 1;
  workItems: WorkItem[];
  dependencies: Dependency[];
  sprints: Sprint[];
  revisions: SprintRevision[];
  runs: AgentRun[];
  evidence: Evidence[];
  reviews: Review[];
};

type ThemisEvent = {
  schemaVersion: 1;
  sequence: number;
  timestamp: string;
  actor: string;
  type: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
};

type Clock = () => string;

type SprintProposalInput = Omit<
  SprintRevision,
  'id' | 'sprintId' | 'version' | 'status' | 'createdAt' | 'approvedAt'
> & {
  goal: string;
  sprintId?: string;
};

const defaultClock: Clock = () => new Date().toISOString();

const emptyState = (): ThemisState => ({
  schemaVersion: 1,
  workItems: [],
  dependencies: [],
  sprints: [],
  revisions: [],
  runs: [],
  evidence: [],
  reviews: [],
});

const paths = (root: string) => {
  const directory = join(root, '.themis');
  return {
    directory,
    state: join(directory, 'state.json'),
    events: join(directory, 'events.ndjson'),
  };
};

const readState = (root: string): ThemisState => {
  const location = paths(root);
  mkdirSync(location.directory, { recursive: true });
  if (!existsSync(location.state)) {
    const state = emptyState();
    writeFileSync(location.state, JSON.stringify(state, null, 2) + '\n', 'utf8');
    return state;
  }

  return JSON.parse(readFileSync(location.state, 'utf8')) as ThemisState;
};

const writeState = (root: string, state: ThemisState): void => {
  const location = paths(root);
  const temporary = `${location.state}.tmp`;
  writeFileSync(temporary, JSON.stringify(state, null, 2) + '\n', 'utf8');
  renameSync(temporary, location.state);
};

const nextId = (prefix: string, values: string[]): string => {
  const numbers = values
    .filter((value) => value.startsWith(`${prefix}-`))
    .map((value) => Number(value.slice(prefix.length + 1)))
    .filter((value) => Number.isInteger(value));
  const next = Math.max(0, ...numbers) + 1;
  return `${prefix}-${String(next).padStart(3, '0')}`;
};

const appendEvent = (
  root: string,
  actor: string,
  type: string,
  aggregateType: string,
  aggregateId: string,
  payload: Record<string, unknown>,
  clock: Clock,
): ThemisEvent => {
  const location = paths(root);
  mkdirSync(dirname(location.events), { recursive: true });
  const existing = existsSync(location.events)
    ? readFileSync(location.events, 'utf8')
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line) as ThemisEvent)
    : [];
  const event: ThemisEvent = {
    schemaVersion: 1,
    sequence: existing.length + 1,
    timestamp: clock(),
    actor,
    type,
    aggregateType,
    aggregateId,
    payload,
  };
  appendFileSync(location.events, JSON.stringify(event) + '\n', 'utf8');
  return event;
};

class ThemisError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ThemisError';
  }
}

const requireWorkItem = (state: ThemisState, id: string): WorkItem => {
  const item = state.workItems.find((candidate) => candidate.id === id);
  if (!item) throw new ThemisError(`Work item not found: ${id}`);
  return item;
};

const requireSprint = (state: ThemisState, id: string): Sprint => {
  const sprint = state.sprints.find((candidate) => candidate.id === id);
  if (!sprint) throw new ThemisError(`Sprint not found: ${id}`);
  return sprint;
};

const requireRun = (state: ThemisState, id: string): AgentRun => {
  const run = state.runs.find((candidate) => candidate.id === id);
  if (!run) throw new ThemisError(`Run not found: ${id}`);
  return run;
};

const blockingDependencies = (state: ThemisState, itemId: string): WorkItem[] =>
  state.dependencies
    .filter((dependency) => dependency.to === itemId && dependency.relation === 'blocks')
    .map((dependency) => requireWorkItem(state, dependency.from))
    .filter((dependency) => dependency.status !== 'done');

const requireFieldsForReady = (item: WorkItem): void => {
  const missing: string[] = [];
  if (item.acceptanceCriteria.length === 0) missing.push('acceptance criteria');
  if (item.scopeIn.length === 0) missing.push('scope in');
  if (item.verificationStrategy.length === 0) missing.push('verification strategy');
  if (missing.length > 0) {
    throw new ThemisError(`${item.id} cannot move to ready. Missing: ${missing.join(', ')}`);
  }
};

const allowedTransitions: Record<WorkItemStatus, WorkItemStatus[]> = {
  draft: ['ready', 'cancelled'],
  ready: ['planned', 'blocked', 'cancelled'],
  planned: ['claimed', 'blocked', 'cancelled'],
  claimed: ['in_progress', 'blocked'],
  in_progress: ['review', 'blocked'],
  review: ['done', 'rework', 'rejected'],
  rework: ['claimed', 'cancelled'],
  done: [],
  blocked: ['ready', 'cancelled'],
  rejected: ['draft', 'cancelled'],
  cancelled: [],
};

const mutate = <T>(
  root: string,
  actor: string,
  type: string,
  aggregateType: string,
  aggregateId: string,
  operation: (state: ThemisState) => T,
  payload: (result: T) => Record<string, unknown>,
  clock: Clock = defaultClock,
): T => {
  const state = readState(root);
  const result = operation(state);
  writeState(root, state);
  appendEvent(root, actor, type, aggregateType, aggregateId, payload(result), clock);
  return result;
};

const createWorkItem = (
  root: string,
  input: Omit<WorkItem, 'id' | 'status'> & { id?: string },
  actor = 'agent:planner',
  clock: Clock = defaultClock,
): WorkItem =>
  mutate(
    root,
    actor,
    'workitem.created',
    'work_item',
    input.id ?? 'pending',
    (state) => {
      const id =
        input.id ??
        nextId(
          'THM',
          state.workItems.map((item) => item.id),
        );
      if (state.workItems.some((item) => item.id === id)) throw new ThemisError(`Work item already exists: ${id}`);
      const item: WorkItem = { ...input, id, status: 'draft' };
      state.workItems.push(item);
      return item;
    },
    (item) => ({ id: item.id, title: item.title, status: item.status }),
    clock,
  );

const transitionWorkItem = (
  root: string,
  id: string,
  to: WorkItemStatus,
  actor = 'agent:coordinator',
  clock: Clock = defaultClock,
): WorkItem =>
  mutate(
    root,
    actor,
    'workitem.transitioned',
    'work_item',
    id,
    (state) => {
      const item = requireWorkItem(state, id);
      const from = item.status;
      if (from === to) throw new ThemisError(`${id} is already ${to}`);
      if (!allowedTransitions[from].includes(to)) {
        throw new ThemisError(`${id} cannot move from ${from} to ${to}`);
      }
      if (to === 'ready') requireFieldsForReady(item);
      if (
        to === 'planned' &&
        (!item.sprintId || !state.sprints.some((sprint) => sprint.id === item.sprintId && sprint.status === 'active'))
      ) {
        throw new ThemisError(`${id} cannot move to planned without an active sprint`);
      }
      if (to === 'claimed' && blockingDependencies(state, id).length > 0) {
        throw new ThemisError(
          `${id} is blocked by: ${blockingDependencies(state, id)
            .map((dependency) => dependency.id)
            .join(', ')}`,
        );
      }
      if (to === 'review') {
        const run = state.runs.find((candidate) => candidate.workItemId === id && candidate.status === 'completed');
        if (!run) throw new ThemisError(`${id} cannot move to review without a completed run`);
        const evidence = state.evidence.filter((entry) => entry.runId === run.id);
        if (!evidence.some((entry) => entry.kind === 'verification'))
          throw new ThemisError(`${id} cannot move to review. Missing evidence: verification`);
        if (!evidence.some((entry) => entry.kind === 'implementation-diff'))
          throw new ThemisError(`${id} cannot move to review. Missing evidence: implementation-diff`);
      }
      if (to === 'done' && !state.reviews.some((review) => review.workItemId === id && review.verdict === 'accepted')) {
        throw new ThemisError(`${id} cannot move to done without an accepted review`);
      }
      item.status = to;
      return { ...item, previousStatus: from } as WorkItem & { previousStatus: WorkItemStatus };
    },
    (item) => ({ previousStatus: item.previousStatus, status: item.status }),
    clock,
  );

const addDependency = (
  root: string,
  from: string,
  to: string,
  actor = 'agent:planner',
  clock: Clock = defaultClock,
): Dependency =>
  mutate(
    root,
    actor,
    'dependency.added',
    'work_item',
    to,
    (state) => {
      requireWorkItem(state, from);
      requireWorkItem(state, to);
      if (from === to) throw new ThemisError('A work item cannot block itself');
      if (state.dependencies.some((dependency) => dependency.from === from && dependency.to === to))
        throw new ThemisError('Dependency already exists');
      const dependency: Dependency = { from, to, relation: 'blocks' };
      state.dependencies.push(dependency);
      return dependency;
    },
    (dependency) => dependency,
    clock,
  );

const proposeSprint = (
  root: string,
  input: SprintProposalInput,
  actor = 'agent:planner',
  clock: Clock = defaultClock,
): SprintRevision =>
  mutate(
    root,
    actor,
    'sprint.proposed',
    'sprint',
    input.sprintId ?? 'pending',
    (state) => {
      for (const id of input.workItemIds) {
        const item = requireWorkItem(state, id);
        if (item.status !== 'ready') throw new ThemisError(`${id} must be ready before sprint planning`);
      }
      const sprintId =
        input.sprintId ??
        nextId(
          'SPR',
          state.sprints.map((sprint) => sprint.id),
        );
      const sprint = state.sprints.find((candidate) => candidate.id === sprintId);
      if (sprint && sprint.status === 'active') throw new ThemisError(`${sprintId} is already active`);
      if (!sprint) state.sprints.push({ id: sprintId, goal: input.goal, status: 'proposed', createdAt: clock() });
      const version = state.revisions.filter((revision) => revision.sprintId === sprintId).length + 1;
      const revision: SprintRevision = {
        ...input,
        id: nextId(
          'REV',
          state.revisions.map((candidate) => candidate.id),
        ),
        sprintId,
        version,
        status: 'proposed',
        createdAt: clock(),
      };
      state.revisions.push(revision);
      return revision;
    },
    (revision) => ({ sprintId: revision.sprintId, revisionId: revision.id, version: revision.version }),
    clock,
  );

const approveSprint = (
  root: string,
  sprintId: string,
  revisionId: string,
  actor = 'human:owner',
  clock: Clock = defaultClock,
): SprintRevision =>
  mutate(
    root,
    actor,
    'sprint.approved',
    'sprint',
    sprintId,
    (state) => {
      const sprint = requireSprint(state, sprintId);
      if (sprint.status !== 'proposed' && sprint.status !== 'draft')
        throw new ThemisError(`${sprintId} cannot be approved from ${sprint.status}`);
      const revision = state.revisions.find(
        (candidate) => candidate.id === revisionId && candidate.sprintId === sprintId,
      );
      if (!revision) throw new ThemisError(`Revision not found: ${revisionId}`);
      revision.status = 'approved';
      revision.approvedAt = clock();
      sprint.status = 'approved';
      return revision;
    },
    (revision) => ({ revisionId: revision.id, status: revision.status }),
    clock,
  );

const activateSprint = (
  root: string,
  sprintId: string,
  revisionId: string,
  actor = 'human:owner',
  clock: Clock = defaultClock,
): Sprint =>
  mutate(
    root,
    actor,
    'sprint.activated',
    'sprint',
    sprintId,
    (state) => {
      const sprint = requireSprint(state, sprintId);
      const revision = state.revisions.find(
        (candidate) =>
          candidate.id === revisionId && candidate.sprintId === sprintId && candidate.status === 'approved',
      );
      if (!revision) throw new ThemisError(`${revisionId} must be approved before activation`);
      if (state.sprints.some((candidate) => candidate.status === 'active'))
        throw new ThemisError('Only one sprint can be active in the local prototype');
      sprint.status = 'active';
      sprint.activeRevisionId = revisionId;
      for (const id of revision.workItemIds) {
        const item = requireWorkItem(state, id);
        if (item.status !== 'ready') throw new ThemisError(`${id} must be ready before sprint activation`);
        requireFieldsForReady(item);
        item.sprintId = sprintId;
        item.status = 'planned';
      }
      return sprint;
    },
    (sprint) => ({ sprintId: sprint.id, revisionId, status: sprint.status }),
    clock,
  );

const readyQueue = (root: string, sprintId: string): Array<{ id: string; title: string; whyReady: string[] }> => {
  const state = readState(root);
  const sprint = requireSprint(state, sprintId);
  if (sprint.status !== 'active') throw new ThemisError(`${sprintId} is not active`);
  return state.workItems
    .filter((item) => item.sprintId === sprintId && item.status === 'planned')
    .map((item) => ({ item, blockers: blockingDependencies(state, item.id) }))
    .filter(({ blockers }) => blockers.length === 0)
    .map(({ item }) => ({
      id: item.id,
      title: item.title,
      whyReady: ['sprint is active', 'dependencies are complete', 'no open run exists', 'verification strategy exists'],
    }));
};

const validateState = (root: string): { valid: boolean; errors: string[]; counts: Record<string, number> } => {
  const state = readState(root);
  const errors: string[] = [];
  const workItemIds = new Set(state.workItems.map((item) => item.id));
  const sprintIds = new Set(state.sprints.map((sprint) => sprint.id));
  const runIds = new Set(state.runs.map((run) => run.id));
  const reviewIds = new Set(state.reviews.map((review) => review.id));

  for (const dependency of state.dependencies) {
    if (!workItemIds.has(dependency.from)) errors.push(`Dependency source not found: ${dependency.from}`);
    if (!workItemIds.has(dependency.to)) errors.push(`Dependency target not found: ${dependency.to}`);
  }
  for (const item of state.workItems) {
    if (item.sprintId && !sprintIds.has(item.sprintId))
      errors.push(`${item.id} references missing sprint ${item.sprintId}`);
  }
  for (const evidence of state.evidence) {
    if (!runIds.has(evidence.runId)) errors.push(`${evidence.id} references missing run ${evidence.runId}`);
  }
  for (const review of state.reviews) {
    if (!runIds.has(review.runId)) errors.push(`${review.id} references missing run ${review.runId}`);
  }
  for (const reviewId of reviewIds) {
    if (!reviewId.startsWith('REVW-')) errors.push(`Invalid review id: ${reviewId}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    counts: {
      workItems: state.workItems.length,
      dependencies: state.dependencies.length,
      sprints: state.sprints.length,
      revisions: state.revisions.length,
      runs: state.runs.length,
      evidence: state.evidence.length,
      reviews: state.reviews.length,
    },
  };
};

const claimWorkItem = (
  root: string,
  id: string,
  agent: string,
  actor = `agent:${agent}`,
  clock: Clock = defaultClock,
): WorkItem =>
  mutate(
    root,
    actor,
    'workitem.claimed',
    'work_item',
    id,
    (state) => {
      const item = requireWorkItem(state, id);
      if (item.status !== 'planned') throw new ThemisError(`${id} cannot be claimed from ${item.status}`);
      const blockers = blockingDependencies(state, id);
      if (blockers.length > 0)
        throw new ThemisError(`${id} is blocked by: ${blockers.map((blocker) => blocker.id).join(', ')}`);
      if (state.runs.some((run) => run.workItemId === id && run.status === 'running'))
        throw new ThemisError(`${id} already has an open run`);
      item.status = 'claimed';
      item.claimedBy = agent;
      item.claimedAt = clock();
      return item;
    },
    (item) => ({ agent: item.claimedBy ?? actor, status: item.status }),
    clock,
  );

const startRun = (
  root: string,
  workItemId: string,
  agent: string,
  actor = `agent:${agent}`,
  clock: Clock = defaultClock,
): AgentRun =>
  mutate(
    root,
    actor,
    'run.started',
    'work_item',
    workItemId,
    (state) => {
      const item = requireWorkItem(state, workItemId);
      if (item.status !== 'claimed') throw new ThemisError(`${workItemId} must be claimed before starting a run`);
      const run: AgentRun = {
        id: nextId(
          'RUN',
          state.runs.map((candidate) => candidate.id),
        ),
        workItemId,
        agent,
        status: 'running',
        startedAt: clock(),
      };
      item.status = 'in_progress';
      state.runs.push(run);
      return run;
    },
    (run) => ({ runId: run.id, workItemId: run.workItemId, status: run.status }),
    clock,
  );

const finishRun = (
  root: string,
  runId: string,
  status: Exclude<RunStatus, 'running'>,
  terminationReason: string,
  actor = 'agent:verifier',
  clock: Clock = defaultClock,
): AgentRun =>
  mutate(
    root,
    actor,
    'run.finished',
    'run',
    runId,
    (state) => {
      const run = requireRun(state, runId);
      if (run.status !== 'running') throw new ThemisError(`${runId} is already ${run.status}`);
      run.status = status;
      run.terminationReason = terminationReason;
      run.finishedAt = clock();
      return run;
    },
    (run) => ({ workItemId: run.workItemId, status: run.status, terminationReason: run.terminationReason }),
    clock,
  );

const addEvidence = (
  root: string,
  runId: string,
  kind: EvidenceKind,
  summary: string,
  value: string,
  actor = 'agent:verifier',
  clock: Clock = defaultClock,
): Evidence =>
  mutate(
    root,
    actor,
    'evidence.added',
    'run',
    runId,
    (state) => {
      const run = requireRun(state, runId);
      if (run.status === 'failed') throw new ThemisError(`${runId} cannot receive evidence after failure`);
      const evidence: Evidence = {
        id: nextId(
          'EVD',
          state.evidence.map((entry) => entry.id),
        ),
        runId,
        kind,
        summary,
        value,
        createdAt: clock(),
      };
      state.evidence.push(evidence);
      return evidence;
    },
    (evidence) => ({ evidenceId: evidence.id, kind: evidence.kind }),
    clock,
  );

const requestReview = (
  root: string,
  workItemId: string,
  reviewer: string,
  actor = 'agent:executor',
  clock: Clock = defaultClock,
): Review =>
  mutate(
    root,
    actor,
    'review.requested',
    'work_item',
    workItemId,
    (state) => {
      const item = requireWorkItem(state, workItemId);
      if (item.status !== 'in_progress') throw new ThemisError(`${workItemId} must be in progress before review`);
      const run = state.runs.find(
        (candidate) => candidate.workItemId === workItemId && candidate.status === 'completed',
      );
      if (!run) throw new ThemisError(`${workItemId} has no completed run`);
      const evidence = state.evidence.filter((entry) => entry.runId === run.id);
      if (!evidence.some((entry) => entry.kind === 'verification'))
        throw new ThemisError(`${workItemId} is missing verification evidence`);
      if (!evidence.some((entry) => entry.kind === 'implementation-diff'))
        throw new ThemisError(`${workItemId} is missing implementation-diff evidence`);
      item.status = 'review';
      const review: Review = {
        id: nextId(
          'REVW',
          state.reviews.map((candidate) => candidate.id),
        ),
        workItemId,
        runId: run.id,
        reviewer,
        createdAt: clock(),
      };
      state.reviews.push(review);
      return review;
    },
    (review) => ({ reviewId: review.id, workItemId: review.workItemId, reviewer: review.reviewer }),
    clock,
  );

const submitReview = (
  root: string,
  reviewId: string,
  verdict: ReviewVerdict,
  feedback: string,
  actor = 'agent:reviewer',
  clock: Clock = defaultClock,
): Review =>
  mutate(
    root,
    actor,
    'review.submitted',
    'review',
    reviewId,
    (state) => {
      const review = state.reviews.find((candidate) => candidate.id === reviewId);
      if (!review) throw new ThemisError(`Review not found: ${reviewId}`);
      if (review.verdict) throw new ThemisError(`${reviewId} already has a verdict`);
      const item = requireWorkItem(state, review.workItemId);
      review.verdict = verdict;
      review.feedback = feedback;
      review.decidedAt = clock();
      item.status = verdict === 'accepted' ? 'done' : 'rework';
      return review;
    },
    (review) => ({ verdict: review.verdict, workItemId: review.workItemId, feedback: review.feedback }),
    clock,
  );

export {
  addDependency,
  addEvidence,
  approveSprint,
  activateSprint,
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
  ThemisError,
};

export type {
  AgentRun,
  Dependency,
  Evidence,
  EvidenceKind,
  Review,
  ReviewVerdict,
  Sprint,
  SprintRevision,
  ThemisState,
  WorkItem,
  WorkItemStatus,
};
