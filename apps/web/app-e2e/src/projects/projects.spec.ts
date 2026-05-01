import { expect, test } from '@playwright/test';

import { createCredentials, authenticateViaApi } from '../support/auth';
import { projectNewUrlPattern, projectsUrlPattern, signInUrlPattern } from '../support/routes';

test.describe.configure({ timeout: 60000 });

test.describe('/app/projects', () => {
  test.beforeEach(async ({ page, request }) => {
    const credentials = createCredentials();

    await authenticateViaApi(page, request, credentials.email, credentials.password);
    await page.goto('/app/en/projects');
    await expect(page).toHaveURL(projectsUrlPattern);
  });

  test('shows the projects list page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Projects/i })).toBeVisible();
  });

  test('shows empty state when no projects exist', async ({ page }) => {
    await expect(page.getByText(/No projects yet/i)).toBeVisible();
  });

  test('has a new project button that navigates to the create form', async ({ page }) => {
    const newProjectButton = page.getByRole('link', { name: /New project/i });

    await expect(newProjectButton).toBeVisible();

    await newProjectButton.click();

    await expect(page).toHaveURL(projectNewUrlPattern);
    await expect(page.getByRole('heading', { name: /New project/i })).toBeVisible();
  });

  test('can create a project with a name', async ({ page }) => {
    await page.getByRole('link', { name: /New project/i }).click();

    const nameInput = page.getByLabel(/Project name/i);

    await expect(nameInput).toBeVisible();

    await nameInput.fill('Test Web App');
    await page.getByRole('button', { name: /Create project/i }).click();

    await expect(page).toHaveURL(/\/app\/en\/projects\/[^/]+$/);
    await expect(page.getByRole('heading', { name: 'Test Web App' })).toBeVisible();
  });

  test('shows created project in the list', async ({ page }) => {
    await page.getByRole('link', { name: /New project/i }).click();
    await page.getByLabel(/Project name/i).fill('Existing Project');
    await page.getByRole('button', { name: /Create project/i }).click();

    await page.getByRole('link', { name: /Projects/i }).click();
    await expect(page.getByText('Existing Project')).toBeVisible();
  });

  test('can delete a project from the list', async ({ page }) => {
    await page.getByRole('link', { name: /New project/i }).click();
    await page.getByLabel(/Project name/i).fill('Project To Delete');
    await page.getByRole('button', { name: /Create project/i }).click();

    await page.getByRole('link', { name: /Projects/i }).click();
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: /Delete/i }).click();

    await expect(page.getByText('Project To Delete')).not.toBeVisible();
  });

  test('sign out returns to sign-in', async ({ page }) => {
    await page.getByRole('button', { name: /Sign out/i }).click();

    await expect(page).toHaveURL(signInUrlPattern);
  });
});
