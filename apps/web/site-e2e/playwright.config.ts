import { workspaceRoot } from '@nx/devkit';
import { nxE2EPreset } from '@nx/playwright/preset';
import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env['BASE_URL'] || 'http://127.0.0.1:8082';

export default defineConfig({
  ...nxE2EPreset(__filename, {
    testDir: './src',
    openHtmlReport: 'never',
  }),
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'node dist/apps/web/server/main.js',
    url: 'http://127.0.0.1:8082/en/',
    reuseExistingServer: false,
    cwd: workspaceRoot,
    env: {
      ...process.env,
      DATABASE_AUTO_MIGRATE: 'true',
      DATABASE_DRIVER: 'memory',
      ENABLE_TEST_API: 'true',
      HOST: '127.0.0.1',
      MAIL_TRANSPORT: 'memory',
      NG_ALLOWED_HOSTS: '127.0.0.1',
      PORT: '8082',
      SESSION_SECRET: 'themis-site-e2e-secret',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
