import { expect, test } from '@playwright/test';

import { createCredentials, registerAndAuthenticate } from '../support/auth';
import { appRoute, appUrlPattern, signInUrlPattern } from '../support/routes';

test.describe('/app', () => {
  test('redirects unauthenticated visitors to sign-in', async ({ page }) => {
    await page.goto(appRoute);

    await expect(page).toHaveURL(signInUrlPattern);
  });

  test('shows the authenticated dashboard', async ({ page, request }) => {
    const credentials = createCredentials();

    await registerAndAuthenticate(page, request, credentials.email, credentials.password);

    await expect(page).toHaveURL(appUrlPattern);
    await expect(page.getByText('dashboard works!')).toBeVisible();
  });
});
