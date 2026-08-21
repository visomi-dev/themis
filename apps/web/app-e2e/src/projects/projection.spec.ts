import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

import { authenticateViaApi, createCredentials } from '../support/auth';

type ProjectionState =
  | 'locked'
  | 'ready'
  | 'empty'
  | 'stale'
  | 'conflict'
  | 'error'
  | 'offline'
  | 'unavailable'
  | 'unauthorized';

const projectName = 'Web-only projection fixture';

const projection = {
  tenantId: 'tenant-fixture',
  workspaceId: 'workspace-fixture',
  revision: 4,
  updatedAt: '2026-02-01T00:00:00.000Z',
  tombstones: [],
  work: [{ id: 'work-1', title: 'Review local projection', status: 'doing', position: 1 }],
  planning: [{ id: 'plan-1', title: 'Prepare release', horizon: 'next' }],
  progress: [{ id: 'progress-1', label: 'Implementation', percent: 60, updatedAt: '2026-02-01T00:00:00.000Z' }],
};

async function createProject(page: Page, request: APIRequestContext, projectId = 'projection-fixture'): Promise<void> {
  const credentials = createCredentials();

  await page.route('**/v1/product-visibility/projects/**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        activity: [],
        context: null,
        project: {
          id: route.request().url().split('/').pop() ?? '',
          name: projectName,
          sourceType: 'manual',
          status: 'active',
          updatedAt: '2026-02-01T00:00:00.000Z',
        },
        state: 'authorized',
      }),
    });
  });

  await authenticateViaApi(page, request, credentials.email, credentials.password);
  await page.goto(`/app/en/projects/${projectId}?tenantId=tenant-fixture&workspaceId=workspace-fixture`);
  await expect(page.getByRole('heading', { name: projectName })).toBeVisible();
}

async function mockProjection(page: Page, state: ProjectionState): Promise<void> {
  await page.route('**/v1/browser-vault/projections/**', async (route) => {
    if (state === 'error') {
      await route.fulfill({ status: 500, body: 'redacted fixture error' });

      return;
    }

    if (state === 'offline') {
      await route.abort('connectionrefused');

      return;
    }

    if (state === 'unauthorized') {
      await route.fulfill({ status: 403, body: 'denied' });

      return;
    }

    const value =
      state === 'empty'
        ? { ...projection, work: [], planning: [], progress: [] }
        : state === 'stale'
          ? { ...projection, updatedAt: '2025-12-01T00:00:00.000Z' }
          : state === 'conflict'
            ? { ...projection, revision: -1, tombstones: ['work-deleted'] }
            : projection;

    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(value) });
  });
}

for (const theme of ['light', 'dark'] as const) {
  for (const state of [
    'locked',
    'ready',
    'empty',
    'stale',
    'conflict',
    'error',
    'offline',
    'unavailable',
    'unauthorized',
  ] as const) {
    test(`Web-only ${state} projection (${theme})`, async ({ page, request }) => {
      await createProject(page, request, state === 'unavailable' ? 'unavailable' : undefined);
      await mockProjection(page, state);
      const requests: string[] = [];

      page.on('request', (requestEvent) => requests.push(requestEvent.url()));

      if (state === 'unavailable') {
        await page.getByLabel('Projection source').selectOption('local-agent');
      } else if (state !== 'locked') {
        await page.getByRole('button', { name: 'Unlock Web-only mode' }).click();
      }

      if (state === 'unavailable') {
        await expect(page.getByRole('heading', { name: 'Web-only mode is available' })).toBeVisible();
        await expect(page.getByText('Continue with Web-only mode')).toBeVisible();
      }

      await expect(page.getByRole('main')).toBeVisible();
      const toggle = page.getByRole('button', { name: 'Toggle light/dark theme' });
      const dark = await page.locator('html').evaluate((element) => element.classList.contains('dark'));

      if ((theme === 'dark') !== dark) await toggle.click();

      await expect(page.locator('html')).toHaveClass(theme === 'dark' ? /dark/ : /^(?!.*dark)/);
      await expect(page.getByRole('main')).toHaveScreenshot(`projection-${state}-${theme}.png`, {
        animations: 'disabled',
      });

      expect(requests.some((url) => url.includes('/api/projects/'))).toBe(false);
    });
  }
}

test('switches from Web-only vault to the local-agent projection source', async ({ page, request }) => {
  await createProject(page, request, 'available');

  await page.getByLabel('Projection source').selectOption('local-agent');
  await expect(page.getByRole('heading', { name: 'Work and planning projection' })).toBeVisible();
  await expect(page.getByText('Review local projection')).toBeVisible();
  await expect(page.getByText('Prepare release')).toBeVisible();
  await expect(page.getByText('Implementation')).toBeVisible();
});

for (const state of ['available', 'unavailable', 'disconnected', 'incompatible', 'unsafe'] as const) {
  test(`uses the real bridge transport for ${state} fixture`, async ({ page, request }) => {
    await createProject(page, request, state);
    await page.getByLabel('Projection source').selectOption('local-agent');

    if (state === 'available') {
      await expect(page.getByText('Review local projection')).toBeVisible();

      return;
    }

    if (state === 'unavailable' || state === 'disconnected' || state === 'incompatible') {
      await expect(page.getByRole('heading', { name: 'Web-only mode is available' })).toBeVisible();
      await expect(page.getByText('Continue with Web-only mode')).toBeVisible();

      return;
    }

    await expect(page.getByRole('heading', { name: 'Projection error' })).toBeVisible();
    await expect(page.getByText('Protected content was not disclosed.')).toBeVisible();
  });
}

for (const theme of ['light', 'dark'] as const) {
  for (const state of ['available', 'unsafe'] as const) {
    test(`real bridge ${state} projection (${theme})`, async ({ page, request }) => {
      await createProject(page, request, state);
      await page.getByLabel('Projection source').selectOption('local-agent');

      if (state === 'available') {
        await expect(page.getByRole('heading', { name: 'Work and planning projection' })).toBeVisible();
        await expect(page.getByText('Review local projection')).toBeVisible();
      } else {
        await expect(page.getByRole('heading', { name: 'Projection error' })).toBeVisible();
        await expect(page.getByText('Protected content was not disclosed.')).toBeVisible();
      }

      const toggle = page.getByRole('button', { name: 'Toggle light/dark theme' });
      const dark = await page.locator('html').evaluate((element) => element.classList.contains('dark'));

      if ((theme === 'dark') !== dark) await toggle.click();

      await expect(page.locator('html')).toHaveClass(theme === 'dark' ? /dark/ : /^(?!.*dark)/);
      await expect(page.getByRole('main')).toHaveScreenshot(`bridge-${state}-${theme}.png`, {
        animations: 'disabled',
      });
    });
  }
}

test('denies a projection returned for a different tenant or workspace', async ({ page, request }) => {
  await createProject(page, request);
  await page.route('**/v1/browser-vault/projections/**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ ...projection, tenantId: 'tenant-other', workspaceId: 'workspace-other' }),
    });
  });

  await page.getByRole('button', { name: 'Unlock Web-only mode' }).click();
  await expect(page.getByRole('heading', { name: 'Projection not authorized' })).toBeVisible();
  await expect(page.getByText('Review local projection')).not.toBeVisible();
  await expect(page.getByText('different tenant or workspace')).toBeVisible();
});
