import type { AsyncJobRecord } from '../projects/projects.models';

export type AsyncJobEventName = 'job:completed' | 'job:failed' | 'job:progress' | 'job:queued' | 'job:started';

export type AsyncJobEvent = {
  eventName: AsyncJobEventName;
  job: AsyncJobRecord;
  message: string;
  timestamp: string;
};
