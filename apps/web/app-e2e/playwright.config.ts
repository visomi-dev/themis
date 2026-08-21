import { workspaceRoot } from '@nx/devkit';
import { nxE2EPreset } from '@nx/playwright/preset';
import { defineConfig, devices } from '@playwright/test';

import { LOCAL_AGENT_FIXTURE_PUBLIC_KEY } from './src/support/local-agent-fixture';

const gatewayPort = process.env['GATEWAY_PORT'] || '8081';
const baseURL = process.env['BASE_URL'] || `http://localhost:${gatewayPort}`;

process.env['BASE_URL'] = baseURL;
const localAgentUrl = process.env['LOCAL_AGENT_URL'] || 'http://127.0.0.1:4317';

export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: './src' }),
  forbidOnly: Boolean(process.env['CI']),
  fullyParallel: false,
  workers: 1,
  snapshotPathTemplate: '{testDir}/__snapshots__/{projectName}/{testFilePath}/{arg}{ext}',
  use: {
    baseURL,
    colorScheme: 'light',
    locale: 'en-US',
    timezoneId: 'UTC',
    viewport: { width: 1280, height: 720 },
    trace: 'on-first-retry',
  },
  globalSetup: './src/support/local-agent-global-setup.ts',
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.01,
    },
  },
  webServer: {
    command: 'node dist/apps/web/server/main.js',
    cwd: workspaceRoot,
    env: {
      ...process.env,
      DATABASE_AUTO_MIGRATE: 'true',
      DATABASE_DRIVER: 'memory',
      ENABLE_TEST_API: 'true',
      HOST: 'localhost',
      MAIL_TRANSPORT: 'memory',
      LOCAL_AGENT_URL: localAgentUrl,
      LOCAL_AGENT_PUBLIC_KEY: LOCAL_AGENT_FIXTURE_PUBLIC_KEY,
      NG_ALLOWED_HOSTS: 'localhost',
      GATEWAY_PORT: gatewayPort,
      PORT: gatewayPort,
      SESSION_SECRET: 'themis-app-e2e-secret',
    },
    reuseExistingServer: false,
    url: `${baseURL}/app/en/sign-in`,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
