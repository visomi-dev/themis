import { readFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const SERVER_PID_PATH = resolve(__dirname, '../../.api-e2e-server.pid');

const teardownState = globalThis as typeof globalThis & { __TEARDOWN_MESSAGE__?: string };

module.exports = async function () {
  try {
    const pid = Number((await readFile(SERVER_PID_PATH, 'utf8')).trim());

    if (!Number.isNaN(pid)) {
      process.kill(-pid, 'SIGTERM');
      for (let attempt = 0; attempt < 40; attempt += 1) {
        try {
          process.kill(pid, 0);
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === 'ESRCH') break;
          throw error;
        }
      }
    }
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;

    if (nodeError.code !== 'ENOENT' && nodeError.code !== 'ESRCH') {
      throw error;
    }
  }

  await rm(SERVER_PID_PATH, { force: true });
  console.log(teardownState.__TEARDOWN_MESSAGE__ ?? '\nTearing down...\n');
};
