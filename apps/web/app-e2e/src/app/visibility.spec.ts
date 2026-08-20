import { expect, test, type Page } from '@playwright/test';

import { createCredentials, authenticateViaApi } from '../support/auth';
import { projectsRoute } from '../support/routes';

type VisibilityState = 'authorized' | 'locked' | 'unavailable' | 'stale' | 'error' | 'unauthorized' | 'empty';

test.describe.configure({ timeout: 60000 });

const projectId = 'visual-project';

const project = {
  id: projectId,
  name: 'Visual Project',
  sourceType: 'manual',
  status: 'active',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

async function mockBrowserVisibility(page: Page, state: VisibilityState): Promise<void> {
  await page.route('**/v1/product-visibility/projects/**', async (route) => {
    if (state === 'unavailable') {
      await route.abort('connectionrefused');

      return;
    }

    if (state === 'unauthorized') {
      await route.fulfill({ status: 401, body: 'Unauthorized' });

      return;
    }

    if (state === 'error') {
      await route.fulfill({ status: 500, body: 'Local agent error' });

      return;
    }

    if (state === 'locked') {
      await route.fulfill({ status: 423, body: 'Locked' });

      return;
    }

    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        activity:
          state === 'authorized' || state === 'stale'
            ? [{ id: 'activity-1', occurredAt: '2026-01-02T00:00:00.000Z', summary: 'Reviewed the plan' }]
            : [],
        context: state === 'authorized' || state === 'stale' ? 'Approved project context.' : null,
        project,
        state: state === 'empty' ? 'authorized' : state,
        ...(state === 'stale' ? { staleAt: '2026-01-03T00:00:00.000Z' } : {}),
      }),
    });
  });
}

async function openProject(
  page: Page,
  request: Parameters<typeof authenticateViaApi>[1],
  state: VisibilityState,
  observedRequests?: string[],
): Promise<void> {
  const credentials = createCredentials();

  await authenticateViaApi(page, request, credentials.email, credentials.password);
  await page.goto(projectsRoute);
  await page
    .getByRole('main')
    .getByRole('link', { name: /New project/i })
    .click();
  await page.getByLabel(/Project name/i).fill(project.name);
  await page.getByRole('button', { name: /Create project/i }).click();
  await expect(page).toHaveURL(/\/app\/en\/projects\/[^/]+$/);
  await page.goto(projectsRoute);
  if (observedRequests) {
    page.on('request', (requestEvent) => observedRequests.push(requestEvent.url()));
  }
  await mockBrowserVisibility(page, state);
  await page.getByRole('main').getByRole('link', { name: project.name, exact: true }).click();
  await expect(page.getByRole('main')).toBeVisible();
}

for (const theme of ['light', 'dark'] as const) {
  for (const state of ['authorized', 'locked', 'unavailable', 'stale', 'error', 'unauthorized', 'empty'] as const) {
    test(`project visibility ${state} (${theme})`, async ({ page, request }) => {
      await openProject(page, request, state);

      const themeToggle = page.getByRole('button', { name: 'Toggle light/dark theme' });
      const isDark = await page.locator('html').evaluate((element) => element.classList.contains('dark'));

      if ((theme === 'dark') !== isDark) {
        await themeToggle.click();
      }

      await expect(page.locator('html')).toHaveClass(theme === 'dark' ? /dark/ : /^(?!.*dark)/);
      await expect(page.getByRole('main')).toHaveScreenshot(`project-visibility-${state}-${theme}.png`, {
        animations: 'disabled',
      });
    });
  }
}

test('authenticated session restores the guarded app route after reload', async ({ page, request }) => {
  await authenticateViaApi(page, request, createCredentials().email, 'S3cureAuth!');
  await page.goto('/app/en/');
  await expect(page).toHaveURL(/\/app\/en\/dashboard$/);
  await page.reload();

  await expect(page).toHaveURL(/\/app\/en\/dashboard$/);
  await expect(page.getByText('dashboard works!')).toBeVisible();
  await expect(page).toHaveScreenshot('authenticated-dashboard-session-restored.png', { fullPage: true });
});

test.describe('protected visibility security fixtures', () => {
  test('denies a project from another tenant without exposing protected data', async ({ page, request }) => {
    const requests: string[] = [];

    await openProject(page, request, 'unauthorized', requests);

    await expect(page.getByRole('heading', { name: 'Project access unavailable' })).toBeVisible();
    await expect(page.getByText('Approved project context.')).not.toBeVisible();
    expect(requests.some((url) => url.includes('/api/projects/'))).toBe(false);
  });

  test('keeps locked-agent denial explicit and does not fall back to cloud data', async ({ page, request }) => {
    const requests: string[] = [];

    await openProject(page, request, 'locked', requests);

    await expect(page.getByRole('heading', { name: 'Project is locked' })).toBeVisible();
    await expect(page.getByText('Approved project context.')).not.toBeVisible();
    expect(requests.some((url) => url.includes('/api/projects/'))).toBe(false);
  });
});
