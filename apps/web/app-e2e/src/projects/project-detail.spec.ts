import { expect, test } from '@playwright/test';

import {
  createCredentials,
  registerAndAuthenticate,
} from '../support/auth';
import {
  projectNewUrlPattern,
  signInUrlPattern,
} from '../support/routes';

test.describe('/app/projects/:projectId', () => {
  test('can navigate to project detail after creating a project', async ({ page, request }) => {
    const credentials = createCredentials();
    await registerAndAuthenticate(page, request, credentials.email, credentials.password);

    await page.goto(projectNewUrlPattern);

    const nameInput = page.getByLabel(/Project name/i);
    await nameInput.fill('Detail Test Project');
    await page.getByRole('button', { name: /Create project/i }).click();

    const projectUrl = page.url();
    const projectId = projectUrl.split('/projects/')[1];

    await expect(page).toHaveURL(new RegExp(`/projects/${projectId}`));
    await expect(page.getByRole('heading', { name: 'Detail Test Project' })).toBeVisible();
  });

  test('shows project status and source type', async ({ page, request }) => {
    const credentials = createCredentials();
    await registerAndAuthenticate(page, request, credentials.email, credentials.password);

    await page.goto(projectNewUrlPattern);

    const nameInput = page.getByLabel(/Project name/i);
    await nameInput.fill('Metadata Project');
    await page.getByRole('button', { name: /Create project/i }).click();

    await expect(page.getByText(/active/i)).toBeVisible();
    await expect(page.getByText(/manual/i)).toBeVisible();
  });

  test('shows documents section', async ({ page, request }) => {
    const credentials = createCredentials();
    await registerAndAuthenticate(page, request, credentials.email, credentials.password);

    await page.goto(projectNewUrlPattern);

    const nameInput = page.getByLabel(/Project name/i);
    await nameInput.fill('Doc Test Project');
    await page.getByRole('button', { name: /Create project/i }).click();

    await expect(page.getByRole('heading', { name: /Documents/i })).toBeVisible();
  });

  test('shows empty documents state when no documents exist', async ({ page, request }) => {
    const credentials = createCredentials();
    await registerAndAuthenticate(page, request, credentials.email, credentials.password);

    await page.goto(projectNewUrlPattern);

    const nameInput = page.getByLabel(/Project name/i);
    await nameInput.fill('No Docs Project');
    await page.getByRole('button', { name: /Create project/i }).click();

    await expect(page.getByText(/No documents yet/i)).toBeVisible();
  });

  test('sign out returns to sign-in', async ({ page, request }) => {
    const credentials = createCredentials();
    await registerAndAuthenticate(page, request, credentials.email, credentials.password);

    await page.goto(projectNewUrlPattern);

    const nameInput = page.getByLabel(/Project name/i);
    await nameInput.fill('Sign Out Detail Project');
    await page.getByRole('button', { name: /Create project/i }).click();

    await page.getByRole('button', { name: /Sign out/i }).click();

    await expect(page).toHaveURL(signInUrlPattern);
  });
});