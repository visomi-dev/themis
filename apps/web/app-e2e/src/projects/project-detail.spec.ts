import { expect, test } from '@playwright/test';

import { createCredentials, authenticateViaApi } from '../support/auth';
import { signInUrlPattern } from '../support/routes';

test.describe.configure({ timeout: 60000 });

test.describe('/app/projects/:projectId', () => {
  test('can navigate to project detail after creating a project', async ({ page, request }) => {
    const credentials = createCredentials();
    await authenticateViaApi(page, request, credentials.email, credentials.password);
    await page.getByRole('button', { name: /Continue to projects/i }).click();

    await page.getByRole('link', { name: /New project/i }).click();
    await page.getByLabel(/Project name/i).fill('Detail Test Project');
    await page.getByRole('button', { name: /Create project/i }).click();

    await expect(page).toHaveURL(/\/app\/en\/projects\/[^/]+$/);
    await expect(page.getByRole('heading', { name: 'Detail Test Project' })).toBeVisible({ timeout: 15000 });
  });

  test('shows project status and source type', async ({ page, request }) => {
    const credentials = createCredentials();
    await authenticateViaApi(page, request, credentials.email, credentials.password);
    await page.getByRole('button', { name: /Continue to projects/i }).click();

    await page.getByRole('link', { name: /New project/i }).click();
    await page.getByLabel(/Project name/i).fill('Metadata Project');
    await page.getByRole('button', { name: /Create project/i }).click();

    await expect(page.getByText(/Active/i)).toBeVisible();
    await expect(page.getByText(/manual/i)).toBeVisible();
  });

  test('shows documents section', async ({ page, request }) => {
    const credentials = createCredentials();
    await authenticateViaApi(page, request, credentials.email, credentials.password);
    await page.getByRole('button', { name: /Continue to projects/i }).click();

    await page.getByRole('link', { name: /New project/i }).click();
    await page.getByLabel(/Project name/i).fill('Doc Test Project');
    await page.getByRole('button', { name: /Create project/i }).click();

    await expect(page.getByRole('heading', { name: /Documents/i })).toBeVisible();
  });

  test('shows empty documents state when no documents exist', async ({ page, request }) => {
    const credentials = createCredentials();
    await authenticateViaApi(page, request, credentials.email, credentials.password);
    await page.getByRole('button', { name: /Continue to projects/i }).click();

    await page.getByRole('link', { name: /New project/i }).click();
    await page.getByLabel(/Project name/i).fill('No Docs Project');
    await page.getByRole('button', { name: /Create project/i }).click();

    await expect(page.getByText(/No documents yet/i)).toBeVisible();
  });

  test('sign out returns to sign-in', async ({ page, request }) => {
    const credentials = createCredentials();
    await authenticateViaApi(page, request, credentials.email, credentials.password);
    await page.getByRole('button', { name: /Continue to projects/i }).click();

    await page.getByRole('link', { name: /New project/i }).click();
    await page.getByLabel(/Project name/i).fill('Sign Out Detail Project');
    await page.getByRole('button', { name: /Create project/i }).click();

    await page.getByRole('button', { name: /Sign out/i }).click();

    await expect(page).toHaveURL(signInUrlPattern);
  });
});
