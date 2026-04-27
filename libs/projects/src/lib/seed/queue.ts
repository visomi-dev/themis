import { Queue } from 'bullmq';
import { getRedis } from 'shared';

import type { ProjectSeedJobInput } from '../contracts/project-seed';

const projectSeedQueueName = 'project-seed';

const queueKey = '__themisProjectSeedQueue';

const globalState = globalThis as typeof globalThis & {
  [queueKey]?: Queue<ProjectSeedJobInput>;
};

function getProjectSeedQueue() {
  globalState[queueKey] ??= new Queue<ProjectSeedJobInput>(projectSeedQueueName, {
    connection: getRedis(),
  });

  return globalState[queueKey] as Queue<ProjectSeedJobInput>;
}

export { getProjectSeedQueue, projectSeedQueueName };
