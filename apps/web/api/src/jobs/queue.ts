import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

import type { AuthConfig } from '../shared/config/auth-config';

const connectionKey = '__themisBullConnection';
const queueKey = '__themisProjectSeedQueue';
const workerKey = '__themisProjectSeedWorker';
const globalState = globalThis as typeof globalThis & {
  [connectionKey]?: IORedis;
  [queueKey]?: Queue;
  [workerKey]?: Worker;
};

function getBullConnection(config: AuthConfig) {
  globalState[connectionKey] ??= new IORedis(config.redisUrl, {
    maxRetriesPerRequest: null,
  });

  return globalState[connectionKey] as IORedis;
}

function getProjectSeedQueue(config: AuthConfig) {
  globalState[queueKey] ??= new Queue('project-seed', {
    connection: getBullConnection(config),
  });

  return globalState[queueKey] as Queue;
}

function setProjectSeedWorker(worker: Worker) {
  globalState[workerKey] ??= worker;

  return globalState[workerKey] as Worker;
}

function hasProjectSeedWorker() {
  return Boolean(globalState[workerKey]);
}

export { getBullConnection, getProjectSeedQueue, hasProjectSeedWorker, setProjectSeedWorker };
