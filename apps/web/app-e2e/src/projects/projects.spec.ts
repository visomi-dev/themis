import { expect, test } from '@playwright/test';

import {
  createCredentials,
  registerAndAuthenticate,
} from '../support/auth';
import {
  appUrlPattern,
  projectNewUrlPattern,
  projectsRoute,
  projectsUrlPattern,
  signInUrlPattern,
} from '../support/routes';

test.describe('/app/projects', () => {
  test.beforeEach(async ({ page, request }) => {
    const credentials = createCredentials();
    await registerAndAuthenticate(page, request, credentials.email, credentials.password);

    await page.goto(projectsRoute);
  });

  test('shows the projects list page', async ({ page }) => {
    await expect(page).toHaveURL(projectsUrlPattern);
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
    await page.goto(projectNewRoute);

    const nameInput = page.getByLabel(/Project name/i);
    await expect(nameInput).toBeVisible();

    await nameInput.fill('Test Web App');

    await page.getByRole('button', { name: /Create project/i }).click();

    await expect(page).toHaveURL(/\/app\/en\/projects\/[^/]+$/);
    await expect(page.getByRole('heading', { name: 'Test Web App' })).toBeVisible();
  });

  test('shows created project in the list', async ({ page, request }) => {
    await page.goto(projectNewRoute);

    const nameInput = page.getByLabel(/Project name/i);
    await nameInput.fill('Existing Project');
    await page.getByRole('button', { name: /Create project/i }).click();

    await page.goto(projectsRoute);

    await expect(page.getByText('Existing Project')).toBeVisible();
  });

  test('can delete a project from the list', async ({ page, request }) => {
    await page.goto(projectNewRoute);

    const nameInput = page.getByLabel(/Project name/i);
    await nameInput.fill('Project To Delete');
    await page.getByRole('button', { name: /Create project/i }).click();

    await page.goto(projectsRoute);

    const deleteButton = page.getByRole('button', { name: /Delete/i });
    await deleteButton.click();

    page.on('dialog', (dialog) => dialog.accept());

    await expect(page.getByText('Project To Delete')).not.toBeVisible();
  });

  test('sign out returns to sign-in', async ({ page }) => {
    await page.getByRole('button', { name: /Sign out/i }).click();

    await expect(page).toHaveURL(signInUrlPattern);
  });
});