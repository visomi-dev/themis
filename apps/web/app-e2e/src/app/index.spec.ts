import { expect, test } from '@playwright/test';

import { createCredentials, registerAndAuthenticate } from '../support/auth';
import { appRoute, signInUrlPattern } from '../support/routes';

test.describe('/app', () => {
  test('redirects unauthenticated visitors to sign-in', async ({ page }) => {
    await page.goto(appRoute);

    await expect(page).toHaveURL(signInUrlPattern);
  });

  test('shows the authenticated activation surface and supports sign out', async ({ page, request }) => {
    const credentials = createCredentials();

    await registerAndAuthenticate(page, request, credentials.email, credentials.password);

    await expect(page.getByRole('heading', { name: /System activation/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();

    await page.getByRole('button', { name: 'Sign out' }).click();

    await expect(page).toHaveURL(signInUrlPattern);
  });
});
