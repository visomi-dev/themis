import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { waitForPortOpen } from '@nx/node/utils';

const SERVER_PID_PATH = resolve(__dirname, '../../.api-e2e-server.pid');

const SERVER_ENTRYPOINT = resolve(__dirname, '../../../../../dist/apps/web/server/main.js');

const teardownState = globalThis as typeof globalThis & { __TEARDOWN_MESSAGE__?: string };

module.exports = async function () {
  const host = process.env.HOST ?? '127.0.0.1';

  const port = process.env.PORT ? Number(process.env.PORT) : 8083;

  const serverProcess = spawn(process.execPath, [SERVER_ENTRYPOINT], {
    detached: true,
    env: {
      ...process.env,
      DATABASE_AUTO_MIGRATE: 'true',
      DATABASE_DRIVER: 'memory',
      ENABLE_TEST_API: 'true',
      HOST: host,
      MAIL_TRANSPORT: 'memory',
      NG_ALLOWED_HOSTS: host,
      PORT: String(port),
      SESSION_SECRET: 'themis-api-e2e-secret',
    },
    stdio: 'inherit',
  });

  if (serverProcess.pid == null) {
    throw new Error('Failed to start composition server process for API e2e tests.');
  }

  await writeFile(SERVER_PID_PATH, String(serverProcess.pid));
  serverProcess.unref();

  try {
    await waitForPortOpen(port, { host });
  } catch (error) {
    serverProcess.kill('SIGTERM');
    throw error;
  }

  teardownState.__TEARDOWN_MESSAGE__ = '\nTearing down composition server...\n';
};
