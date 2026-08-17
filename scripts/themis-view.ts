import { readState, readyQueue } from '../.opencode/tools/themis-core.ts';
import type { Sprint, ThemisState, WorkItem, WorkItemStatus } from '../.opencode/tools/themis-core.ts';

type WorkItemCounts = Record<WorkItemStatus, number>;

type SprintSummary = {
  sprint: Sprint | undefined;
  counts: WorkItemCounts;
  ready: WorkItem[];
  blocked: WorkItem[];
  activeRuns: number;
  completedRuns: number;
  reviewCount: number;
};

const statuses: WorkItemStatus[] = [
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
];

const activeSprint = (state: ThemisState, sprintId?: string, projectId?: string): Sprint | undefined =>
  state.sprints.find((sprint) => sprint.id === sprintId && (!projectId || sprint.projectId === projectId)) ??
  state.sprints.find((sprint) => sprint.status === 'active' && (!projectId || sprint.projectId === projectId));

const countWorkItems = (items: WorkItem[]): WorkItemCounts => {
  const counts = Object.fromEntries(statuses.map((status) => [status, 0])) as WorkItemCounts;
  for (const item of items) counts[item.status] += 1;
  return counts;
};

const summarizeSprint = (root: string, sprintId?: string, projectId?: string): SprintSummary => {
  const state = readState(root);
  const sprint = activeSprint(state, sprintId, projectId);
  const membershipIds = sprint
    ? new Set(
        state.sprintItems
          .filter((membership) => membership.sprintId === sprint.id)
          .map((membership) => membership.workItemId),
      )
    : undefined;
  const items = sprint
    ? state.workItems.filter((item) => membershipIds?.has(item.id))
    : projectId
      ? state.workItems.filter((item) => item.projectId === projectId)
      : state.workItems;
  const ready =
    sprint?.status === 'active'
      ? readyQueue(root, sprint.id, projectId)
          .map(({ id }) => state.workItems.find((item) => item.id === id))
          .filter((item): item is WorkItem => item !== undefined)
      : [];
  const blocked = sprint
    ? items.filter((item) => item.status === 'blocked')
    : state.workItems.filter((item) => item.status === 'blocked');
  const runs = sprint ? state.runs.filter((run) => items.some((item) => item.id === run.workItemId)) : state.runs;
  const reviews = sprint
    ? state.reviews.filter((review) => items.some((item) => item.id === review.workItemId))
    : state.reviews;
  return {
    sprint,
    counts: countWorkItems(items),
    ready,
    blocked,
    activeRuns: runs.filter((run) => run.status === 'running').length,
    completedRuns: runs.filter((run) => run.status === 'completed').length,
    reviewCount: reviews.length,
  };
};

const formatSummary = (summary: SprintSummary): string => {
  const sprintLabel = summary.sprint ? `${summary.sprint.id} · ${summary.sprint.goal}` : 'No active sprint';
  const counts = Object.entries(summary.counts)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => `${status}=${count}`)
    .join('  ');
  const ready = summary.ready.length > 0 ? summary.ready.map((item) => `${item.id} ${item.title}`).join('\n') : 'none';
  const blocked =
    summary.blocked.length > 0 ? summary.blocked.map((item) => `${item.id} ${item.title}`).join('\n') : 'none';
  return [
    `Sprint: ${sprintLabel}`,
    `Work items: ${counts || 'none'}`,
    `Runs: active=${summary.activeRuns} completed=${summary.completedRuns} reviews=${summary.reviewCount}`,
    '',
    'Ready queue:',
    ready,
    '',
    'Blocked:',
    blocked,
  ].join('\n');
};

export { formatSummary, summarizeSprint };
export type { SprintSummary };
