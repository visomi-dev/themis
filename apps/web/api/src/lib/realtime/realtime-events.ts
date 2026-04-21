export type AsyncJobType = 'project_seed';
export type AsyncJobStatus = 'completed' | 'failed' | 'queued' | 'running';

export type AsyncJobEventName = 'job:completed' | 'job:failed' | 'job:progress' | 'job:queued' | 'job:started';

export type AsyncJobRecord = {
  completedAt: string | null;
  createdAt: string;
  errorMessage: string | null;
  id: string;
  progress: number;
  projectId: string | null;
  resultJson: string | null;
  status: AsyncJobStatus;
  type: AsyncJobType;
  updatedAt: string;
  userId: string;
};

export type AsyncJobEvent = {
  eventName: AsyncJobEventName;
  job: AsyncJobRecord;
  message: string;
  timestamp: string;
};
