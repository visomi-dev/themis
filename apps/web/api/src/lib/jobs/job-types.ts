import type { AsyncJobRecord } from '../realtime/realtime-events.js';

type ProjectSeedJobInput = {
  accountId: string;
  jobId: string;
  projectId: string;
  userId: string;
};

type ProjectSeedJobResult = {
  summary: string;
};

type JobsListResponse = {
  jobs: AsyncJobRecord[];
};

export type { JobsListResponse, ProjectSeedJobInput, ProjectSeedJobResult };
