import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

import { authenticateViaDeterministicTestSession, createCredentials } from '../support/auth';
import {
  setLocalAgentFixtureNetwork,
  setLocalAgentFixturePhase,
  type SyncFixturePhase,
} from '../support/local-agent-fixture';

type ClientPath = 'browser' | 'agent';
const scope = { tenantId: 'tenant-fixture', workspaceId: 'workspace-fixture' };
const projectId = 'sync-fixture';
const projectName = 'Sync route fixture';

async function openProject(page: Page, request: APIRequestContext): Promise<void> {
  const credentials = createCredentials();

  await setLocalAgentFixtureNetwork('available');
  await setLocalAgentFixturePhase('resolved');
  await authenticateViaDeterministicTestSession(page, request, credentials.email, credentials.password);
  await page.goto(`/app/en/projects/${projectId}?tenantId=${scope.tenantId}&workspaceId=${scope.workspaceId}`);
  await expect(page.getByRole('heading', { name: projectName })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Approved project visibility' })).toBeVisible();
  await expect(page.getByText('No approved context or activity is available for this project.')).toBeVisible();
}

async function installSyncFixture(
  page: Page,
  clientPath: ClientPath,
  firstPhase: SyncFixturePhase,
): Promise<{
  setPhase: (phase: SyncFixturePhase) => Promise<void>;
  requests: string[];
}> {
  const requests: string[] = [];

  await setLocalAgentFixturePhase(firstPhase);
  page.on('request', (request) => {
    if (request.url().includes(`/v1/${clientPath === 'browser' ? 'browser-vault' : 'local-agent'}/projections/`)) {
      requests.push(`${request.method()} ${request.url()}`);
    }
  });

  return {
    setPhase: setLocalAgentFixturePhase,
    requests,
  };
}

async function choosePath(
  page: Page,
  path: ClientPath,
  transportMode: 'request' | 'response' = 'response',
): Promise<void> {
  const source = page.getByLabel('Projection source');
  const projectionUrl = `/v1/${path === 'browser' ? 'browser-vault' : 'local-agent'}/projections/`;
  const transport =
    transportMode === 'request'
      ? page.waitForRequest((request) => request.url().includes(projectionUrl), { timeout: 15_000 })
      : page.waitForResponse((response) => response.url().includes(projectionUrl) && response.ok(), {
          timeout: 15_000,
        });

  if (path === 'browser') {
    await page.getByRole('button', { name: 'Unlock Web-only mode' }).click();

    await expect(source).toHaveValue('web-only');
    await transport;

    return;
  }

  await expect(source).toHaveValue('web-only');
  await source.selectOption('local-agent');
  await expect(source).toHaveValue('local-agent');
  await transport;
}

for (const clientPath of ['browser', 'agent'] as const) {
  test(`${clientPath} client queues offline edits and restores after reconnect`, async ({ page, request }) => {
    await openProject(page, request);
    const fixture = await installSyncFixture(page, clientPath, 'offline');
    const consoleMessages: string[] = [];

    page.on('console', (message) => consoleMessages.push(message.text()));

    await setLocalAgentFixtureNetwork('disconnected');
    await choosePath(page, clientPath, 'request');
    await expect(
      page.getByRole('heading', { name: clientPath === 'browser' ? 'Projection error' : 'Web-only mode is available' }),
    ).toBeVisible();
    await expect(page.getByRole('main')).toHaveScreenshot(`sync-${clientPath}-offline.png`, { animations: 'disabled' });

    await fixture.setPhase('reconnected');
    await setLocalAgentFixtureNetwork('available');
    await page.reload();
    await expect(page.getByRole('heading', { name: projectName })).toBeVisible();
    await choosePath(page, clientPath);

    await expect(page.getByText('Resolved local change')).toBeVisible();
    await expect(page.getByRole('main')).toHaveScreenshot(`sync-${clientPath}-reconnected.png`, {
      animations: 'disabled',
    });
    expect(fixture.requests.length).toBeGreaterThanOrEqual(2);
    expect(consoleMessages.join('\n')).not.toContain('Resolved local change');
  });

  test(`${clientPath} client resolves conflict and keeps tombstones after reconnect`, async ({ page, request }) => {
    await openProject(page, request);
    const fixture = await installSyncFixture(page, clientPath, 'conflict');

    await setLocalAgentFixtureNetwork('available');
    await choosePath(page, clientPath);
    await expect(page.getByRole('heading', { name: 'Projection needs attention' })).toBeVisible();
    await expect(page.getByRole('main')).toHaveScreenshot(`sync-${clientPath}-conflict.png`, {
      animations: 'disabled',
    });

    await fixture.setPhase('deleted');
    await setLocalAgentFixtureNetwork('available');
    await page.reload();
    await expect(page.getByRole('heading', { name: projectName })).toBeVisible();
    await choosePath(page, clientPath);
    await expect(page.getByRole('heading', { name: 'Work and planning projection' })).toBeVisible();
    await expect(page.getByText('Resolved local change')).not.toBeVisible();
    await expect(page.getByRole('main')).toHaveScreenshot(`sync-${clientPath}-deleted.png`, { animations: 'disabled' });

    await fixture.setPhase('resolved');
    await page.reload();
    await expect(page.getByRole('heading', { name: projectName })).toBeVisible();
    await choosePath(page, clientPath);
    await expect(page.getByText('Resolved local change')).toBeVisible();
    await expect(page.getByRole('main')).toHaveScreenshot(`sync-${clientPath}-resolved.png`, {
      animations: 'disabled',
    });

    const storage = await page.evaluate(() => JSON.stringify({ ...localStorage }));

    expect(storage).not.toContain('Resolved local change');
    expect(storage).not.toContain('Sync complete');
    expect(fixture.requests.join('\n')).not.toContain('Resolved local change');
  });
}
