import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

import { env } from '../shared/env';

const connectionKey = '__themisBullConnection';
const queueKey = '__themisProjectSeedQueue';
const workerKey = '__themisProjectSeedWorker';
const globalState = globalThis as typeof globalThis & {
  [connectionKey]?: IORedis;
  [queueKey]?: Queue;
  [workerKey]?: Worker;
};

function getBullConnection() {
  globalState[connectionKey] ??= new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
  });

  return globalState[connectionKey] as IORedis;
}

function getProjectSeedQueue() {
  globalState[queueKey] ??= new Queue('project-seed', {
    connection: getBullConnection(),
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
