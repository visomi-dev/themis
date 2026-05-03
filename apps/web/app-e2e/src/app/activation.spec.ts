import { expect, test } from '@playwright/test';

import { createCredentials, registerAndAuthenticate, signOutViaMenu } from '../support/auth';
import { activationRoute, activationUrlPattern, projectsUrlPattern, signInUrlPattern } from '../support/routes';

test.describe('/app (first-run activation)', () => {
  test('shows activation screen after auth instead of the old placeholder', async ({ page, request }) => {
    const credentials = createCredentials();

    await registerAndAuthenticate(page, request, credentials.email, credentials.password);
    await page.goto(activationRoute);

    await expect(page).toHaveURL(activationUrlPattern);
    await expect(page.getByRole('heading', { name: /System activation/i })).toBeVisible();
    await expect(page.getByText(/Configure your API key/)).toBeVisible();
  });

  test('shows API infrastructure section with key generation', async ({ page, request }) => {
    const credentials = createCredentials();

    await registerAndAuthenticate(page, request, credentials.email, credentials.password);
    await page.goto(activationRoute);

    await expect(page.getByRole('heading', { name: /API infrastructure/i })).toBeVisible();
    await expect(page.getByLabel(/Named API access keys/i)).toBeVisible();
  });

  test('can generate an API key and see it displayed once', async ({ page, request }) => {
    const credentials = createCredentials();

    await registerAndAuthenticate(page, request, credentials.email, credentials.password);
    await page.goto(activationRoute);

    await page.getByLabel(/Named API access keys/i).fill('E2E workspace key');
    await page.getByRole('button', { name: /Generate key/i }).click();

    await expect(page.locator('p.font-mono').filter({ hasText: 'thm_' }).first()).toBeVisible();
  });

  test('shows workspace configuration section with copyable config', async ({ page, request }) => {
    const credentials = createCredentials();

    await registerAndAuthenticate(page, request, credentials.email, credentials.password);
    await page.goto(activationRoute);

    await expect(page.getByRole('heading', { name: /Workspace configuration/i })).toBeVisible();
    await expect(page.getByRole('button', { name: '~/.config/themis/core.json' })).toBeVisible();
  });

  test('shows seed configuration section', async ({ page, request }) => {
    const credentials = createCredentials();

    await registerAndAuthenticate(page, request, credentials.email, credentials.password);
    await page.goto(activationRoute);

    await expect(page.getByRole('heading', { name: /Seed configuration/i })).toBeVisible();
    await expect(page.getByText(/Analyze this repository/)).toBeVisible();
  });

  test('has skip for now and continue to projects actions', async ({ page, request }) => {
    const credentials = createCredentials();

    await registerAndAuthenticate(page, request, credentials.email, credentials.password);
    await page.goto(activationRoute);

    await expect(page.getByRole('button', { name: /Skip for now/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Continue to projects/i })).toBeVisible();
  });

  test('skip for now navigates to projects', async ({ page, request }) => {
    const credentials = createCredentials();

    await registerAndAuthenticate(page, request, credentials.email, credentials.password);
    await page.goto(activationRoute);

    await page.getByRole('button', { name: /Skip for now/i }).click();

    await expect(page).toHaveURL(projectsUrlPattern);
  });

  test('continue to projects navigates to projects', async ({ page, request }) => {
    const credentials = createCredentials();

    await registerAndAuthenticate(page, request, credentials.email, credentials.password);
    await page.goto(activationRoute);

    await page.getByRole('button', { name: /Continue to projects/i }).click();

    await expect(page).toHaveURL(projectsUrlPattern);
  });

  test('sign out returns to sign-in', async ({ page, request }) => {
    const credentials = createCredentials();

    await registerAndAuthenticate(page, request, credentials.email, credentials.password);
    await page.goto(activationRoute);

    await signOutViaMenu(page);

    await expect(page).toHaveURL(signInUrlPattern);
  });
});
