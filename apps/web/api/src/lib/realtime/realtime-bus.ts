import { EventEmitter } from 'node:events';

import type { AsyncJobEvent } from './realtime-events';

type RealtimeBus = EventEmitter<{
  'async-job': [AsyncJobEvent];
}>;

const globalKey = '__themisRealtimeBus';
const globalState = globalThis as typeof globalThis & {
  [globalKey]?: RealtimeBus;
};

const realtimeBus = globalState[globalKey] ?? new EventEmitter();
globalState[globalKey] = realtimeBus;

export { realtimeBus };
