import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { waitForPortOpen } from '@nx/node/utils';

const SERVER_PID_PATH = resolve(__dirname, '../../.server-e2e-server.pid');
const SERVER_ENTRYPOINT = resolve(__dirname, '../../../../../dist/apps/web/server/main.js');
const teardownState = globalThis as typeof globalThis & { __TEARDOWN_MESSAGE__?: string };

module.exports = async function () {
  const host = process.env.HOST ?? 'localhost';
  const port = process.env.PORT ? Number(process.env.PORT) : 8080;

  const serverProcess = spawn(process.execPath, [SERVER_ENTRYPOINT], {
    env: {
      ...process.env,
      HOST: host,
      PORT: String(port),
    },
    stdio: 'inherit',
  });

  if (serverProcess.pid == null) {
    throw new Error('Failed to start composition server process for e2e tests.');
  }

  await writeFile(SERVER_PID_PATH, String(serverProcess.pid));

  try {
    await waitForPortOpen(port, { host });
  } catch (error) {
    serverProcess.kill('SIGTERM');
    throw error;
  }

  teardownState.__TEARDOWN_MESSAGE__ = '\nTearing down composition server...\n';
};
