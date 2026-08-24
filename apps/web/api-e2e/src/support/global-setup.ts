import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { waitForPortOpen } from '@nx/node/utils';

const SERVER_PID_PATH = resolve(__dirname, '../../.api-e2e-server.pid');

const SERVER_ENTRYPOINT = resolve(__dirname, '../../../../../dist/apps/web/server/main.js');

const teardownState = globalThis as typeof globalThis & { __TEARDOWN_MESSAGE__?: string };

module.exports = async function () {
  const host = process.env.HOST ?? 'localhost';

  const port = process.env.GATEWAY_PORT ? Number(process.env.GATEWAY_PORT) : 8083;

  const serverProcess = spawn(process.execPath, [SERVER_ENTRYPOINT], {
    detached: true,
    env: {
      ...process.env,
      COOKIE_SECURE: 'false',
      DATABASE_AUTO_MIGRATE: 'true',
      // Keep the fast in-memory composition by default, but allow the
      // durable API lifecycle matrix to opt into the configured PostgreSQL
      // and object-store boundary explicitly.
      DATABASE_DRIVER:
        process.env['OPAQUE_SYNC_STORAGE'] === 'durable' && process.env['DATABASE_DRIVER'] === 'pg' ? 'pg' : 'memory',
      ENABLE_TEST_API: 'true',
      HOST: host,
      GATEWAY_PORT: String(port),
      MAIL_TRANSPORT: 'memory',
      NG_ALLOWED_HOSTS: host,
      NODE_ENV: 'test',
      OPAQUE_SYNC_STORAGE: process.env['OPAQUE_SYNC_STORAGE'] ?? 'memory',
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

    for (let attempt = 0; attempt < 40; attempt += 1) {
      try {
        const response = await fetch(`http://${host}:${port}/healthz`, { signal: AbortSignal.timeout(1000) });

        if (response.ok) break;
      } catch {
        // A listener can accept TCP before the gateway is ready.
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  } catch (error) {
    serverProcess.kill('SIGTERM');
    throw error;
  }

  teardownState.__TEARDOWN_MESSAGE__ = '\nTearing down composition server...\n';
};
