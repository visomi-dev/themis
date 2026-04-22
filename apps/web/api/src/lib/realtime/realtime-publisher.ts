import type { AsyncJobEvent, AsyncJobEventName, AsyncJobRecord } from './realtime-events.js';

import { realtimeBus } from 'web-shared';

const publishAsyncJobEvent = (eventName: AsyncJobEventName, job: AsyncJobRecord, message: string) => {
  const event: AsyncJobEvent = {
    eventName,
    job,
    message,
    timestamp: new Date().toISOString(),
  };

  realtimeBus.emit('async-job', event);
};

export { publishAsyncJobEvent };
