import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

import type { AuthConfig } from '../config/auth-config.js';

const connectionKey = '__themisBullConnection';
const queueKey = '__themisProjectSeedQueue';
const workerKey = '__themisProjectSeedWorker';
const globalState = globalThis as typeof globalThis & {
  [connectionKey]?: IORedis;
  [queueKey]?: Queue;
  [workerKey]?: Worker;
};

const getBullConnection = (config: AuthConfig) => {
  globalState[connectionKey] ??= new IORedis(config.redisUrl, {
    maxRetriesPerRequest: null,
  });

  return globalState[connectionKey] as IORedis;
};

const getProjectSeedQueue = (config: AuthConfig) => {
  globalState[queueKey] ??= new Queue('project-seed', {
    connection: getBullConnection(config),
  });

  return globalState[queueKey] as Queue;
};

const setProjectSeedWorker = (worker: Worker) => {
  globalState[workerKey] ??= worker;

  return globalState[workerKey] as Worker;
};

const hasProjectSeedWorker = () => Boolean(globalState[workerKey]);

export { getBullConnection, getProjectSeedQueue, hasProjectSeedWorker, setProjectSeedWorker };
