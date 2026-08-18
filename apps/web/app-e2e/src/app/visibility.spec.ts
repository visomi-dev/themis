import { expect, test, type Page } from '@playwright/test';

import { createCredentials, authenticateViaApi } from '../support/auth';
import { projectsRoute } from '../support/routes';

type VisibilityState = 'authorized' | 'locked' | 'unavailable' | 'stale' | 'error' | 'unauthorized' | 'empty';

const projectId = 'visual-project';

const project = {
  id: projectId,
  name: 'Visual Project',
  sourceType: 'manual',
  status: 'active',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const localAgentUrl = process.env['LOCAL_AGENT_URL'] ?? 'http://127.0.0.1:4317';

async function mockVisibility(page: Page, state: VisibilityState): Promise<void> {
  await page.route(`${localAgentUrl}/v1/product-visibility/projects/*`, async (route) => {
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

    const view = {
      activity:
        state === 'authorized' || state === 'stale'
          ? [{ id: 'activity-1', occurredAt: '2026-01-02T00:00:00.000Z', summary: 'Reviewed the plan' }]
          : [],
      context: state === 'authorized' || state === 'stale' ? 'Approved project context.' : null,
      project,
      state: state === 'empty' ? 'authorized' : state,
      ...(state === 'stale' ? { staleAt: '2026-01-03T00:00:00.000Z' } : {}),
    };

    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(view),
    });
  });
}

async function openProject(page: Page, request: Parameters<typeof authenticateViaApi>[1], state: VisibilityState) {
  const credentials = createCredentials();

  await authenticateViaApi(page, request, credentials.email, credentials.password);
  await mockVisibility(page, state);
  await page.goto(`${projectsRoute}/${projectId}`);
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
