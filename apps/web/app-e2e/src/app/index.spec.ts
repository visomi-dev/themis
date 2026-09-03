import { expect, test } from '@playwright/test';

import { createCredentials, registerAndAuthenticate } from '../support/auth';
import { appRoute, appUrlPattern, identityUrlPattern } from '../support/routes';

test.describe('/app', () => {
  test('redirects unauthenticated visitors to /auth/identity', async ({ page }) => {
    await page.goto(appRoute);

    await expect(page).toHaveURL(identityUrlPattern);
  });

  test('shows the authenticated dashboard', async ({ page, request }) => {
    const credentials = createCredentials();

    await registerAndAuthenticate(page, request, credentials.email, credentials.password);

    await expect(page).toHaveURL(appUrlPattern);
    await expect(page.getByRole('heading', { name: 'Project Workspace' })).toBeVisible();
  });
});
