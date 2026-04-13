import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { waitForPortOpen } from '@nx/node/utils';

const API_SERVER_PID_PATH = resolve(__dirname, '../../.api-e2e-server.pid');
const API_SERVER_ENTRYPOINT = resolve(__dirname, '../../../../../dist/apps/web/api/main.js');
const teardownState = globalThis as typeof globalThis & { __TEARDOWN_MESSAGE__?: string };

module.exports = async function () {
  const host = process.env.HOST ?? '127.0.0.1';
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;

  const serverProcess = spawn(process.execPath, [API_SERVER_ENTRYPOINT], {
    env: {
      ...process.env,
      DATABASE_AUTO_MIGRATE: 'true',
      DATABASE_DRIVER: 'memory',
      ENABLE_TEST_API: 'true',
      HOST: host,
      MAIL_TRANSPORT: 'memory',
      PORT: String(port),
      SESSION_SECRET: 'themis-api-e2e-secret',
    },
    stdio: 'inherit',
  });

  if (serverProcess.pid == null) {
    throw new Error('Failed to start API server process for e2e tests.');
  }

  await writeFile(API_SERVER_PID_PATH, String(serverProcess.pid));

  try {
    await waitForPortOpen(port, { host });
  } catch (error) {
    serverProcess.kill('SIGTERM');
    throw error;
  }

  teardownState.__TEARDOWN_MESSAGE__ = '\nTearing down...\n';
};
