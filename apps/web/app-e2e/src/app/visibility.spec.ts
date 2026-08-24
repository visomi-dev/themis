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

async function openProject(
  page: Page,
  request: Parameters<typeof authenticateViaApi>[1],
  state: VisibilityState,
  observedRequests?: string[],
): Promise<void> {
  const credentials = createCredentials();

  await authenticateViaApi(page, request, credentials.email, credentials.password);
  const createProject = await page.request.post('/api/projects', {
    data: { name: project.name, sourceType: project.sourceType },
  });

  expect(createProject.status()).toBe(201);
  await page.goto(projectsRoute);
  if (observedRequests) {
    page.on('request', (requestEvent) => observedRequests.push(requestEvent.url()));
  }
  await page.setExtraHTTPHeaders({
    'x-operational-workspace-state': state === 'authorized' ? 'visible' : state,
  });
  await page.getByRole('main').getByRole('link', { name: project.name, exact: true }).click();
  await expect(page.locator('main').last()).toBeVisible();
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
      await expect(page.locator('main').last()).toHaveScreenshot(`project-visibility-${state}-${theme}.png`, {
        animations: 'disabled',
      });
    });
  }
}

test('authenticated session restores the guarded app route after reload', async ({ page, request }) => {
  await authenticateViaApi(page, request, createCredentials().email, 'S3cureAuth!');
  await page.goto('/app/en/');
  await expect(page).toHaveURL(/\/app\/en\/$/);
  await page.reload();

  await expect(page).toHaveURL(/\/app\/en\/$/);
  await expect(page.getByRole('heading', { name: 'Project Workspace' })).toBeVisible();
  await expect(page).toHaveScreenshot('authenticated-dashboard-session-restored.png', { fullPage: true });
});

test.describe('protected visibility security fixtures', () => {
  test('denies a project from another tenant without exposing protected data', async ({ page, request }) => {
    const requests: string[] = [];

    await openProject(page, request, 'unauthorized', requests);

    await expect(page).toHaveURL(/\/workspace$/);
    await expect(page.getByText('Approved project context.')).not.toBeVisible();
    expect(requests.some((url) => url.includes('/api/projects/') && !url.includes('/workspace'))).toBe(false);
  });

  test('keeps locked-agent denial explicit and does not fall back to cloud data', async ({ page, request }) => {
    const requests: string[] = [];

    await openProject(page, request, 'locked', requests);

    await expect(page.getByRole('heading', { name: project.name })).toBeVisible();
    await expect(page.getByText('locked', { exact: true })).toBeVisible();
    expect(requests.some((url) => url.includes('/api/projects/') && !url.includes('/workspace'))).toBe(false);
  });
});
