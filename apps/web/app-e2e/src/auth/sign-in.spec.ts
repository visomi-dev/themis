import { expect, test } from '@playwright/test';

import {
  createCredentials,
  registerAndAuthenticate,
  registerAndSignOut,
  signIn,
  verifyLatestCode,
} from '../support/auth';
import { appRoute, signInRoute } from '../support/routes';

test.describe('/app/sign-in', () => {
  test('signs an existing user in through email verification', async ({ page, request }) => {
    const credentials = createCredentials();

    await registerAndSignOut(page, request, credentials.email, credentials.password);
    await signIn(page, credentials.email, credentials.password);
    await verifyLatestCode(page, request, credentials.email, 'sign_in');

    await expect(page).toHaveURL(appRoute);
    await expect(page.getByText(credentials.email)).toBeVisible();
  });

  test('stays on the route when credentials are invalid', async ({ page }) => {
    await page.goto(signInRoute);
    await page.getByLabel('Email').fill('bad-email');
    await page.getByLabel('Password').fill('short');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(signInRoute);
    await expect(page.getByText('Enter a valid email address.')).toBeVisible();
    await expect(page.getByText('Use at least 8 characters.')).toBeVisible();
  });

  test('redirects authenticated users back to the app', async ({ page, request }) => {
    const credentials = createCredentials();

    await registerAndAuthenticate(page, request, credentials.email, credentials.password);
    await page.goto(signInRoute);

    await expect(page).toHaveURL(appRoute);
  });
});
