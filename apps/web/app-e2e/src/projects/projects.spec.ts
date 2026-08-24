import { expect, test } from '@playwright/test';

import { authenticateViaApi, createCredentials, signOutViaMenu } from '../support/auth';
import { projectsUrlPattern, signInUrlPattern } from '../support/routes';

const project = {
  id: 'authorized-project',
  name: 'Authorized project',
  sourceType: 'manual',
  status: 'active',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  summary: 'Only this tenant-visible project is returned.',
};

async function openProjects(
  page: Parameters<typeof authenticateViaApi>[0],
  request: Parameters<typeof authenticateViaApi>[1],
) {
  const credentials = createCredentials();

  await authenticateViaApi(page, request, credentials.email, credentials.password);
  await page.goto('/app/en/projects');
  await expect(page).toHaveURL(projectsUrlPattern);
}

test.describe('/app/projects', () => {
  test('renders only authorized projects and supports workspace navigation', async ({ page, request }) => {
    await openProjects(page, request);
    await page.route('**/api/projects', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ data: { projects: [project] } }),
      });
    });
    await page.reload();

    await expect(page.getByRole('heading', { name: 'Project Workspace' })).toBeVisible();
    await expect(page.getByText(project.name)).toBeVisible();
    await expect(page.getByText('another tenant project')).not.toBeVisible();

    await page.getByRole('link', { name: project.name }).click();
    await expect(page).toHaveURL(/\/app\/en\/projects\/authorized-project\/workspace$/);
  });

  test('renders the explicit empty projection state', async ({ page, request }) => {
    await openProjects(page, request);
    await page.route('**/api/projects', async (route) => {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data: { projects: [] } }) });
    });
    await page.reload();

    await expect(
      page.getByText('No authorized project workspace is available in this read-only projection.'),
    ).toBeVisible();
  });

  test('renders an unavailable state without exposing mutation controls', async ({ page, request }) => {
    await openProjects(page, request);
    await page.route('**/api/projects', async (route) => {
      await route.fulfill({ status: 503, body: 'unavailable' });
    });
    await page.reload();

    await expect(page.getByRole('alert')).toContainText('Projects could not be loaded.');
    await expect(page.getByRole('link', { name: /New project/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /Delete/i })).not.toBeVisible();
  });

  test('sign out returns to sign-in', async ({ page, request }) => {
    await openProjects(page, request);
    await signOutViaMenu(page);

    await expect(page).toHaveURL(signInUrlPattern);
  });
});
