import { expect, test } from '@playwright/test';

import { createCredentials, authenticateViaApi } from '../support/auth';
import { appRoute, signInUrlPattern } from '../support/routes';

test.describe.configure({ timeout: 60000 });

test.describe('/app sidebar', () => {
  test.beforeEach(async ({ page, request }) => {
    const credentials = createCredentials();

    await authenticateViaApi(page, request, credentials.email, credentials.password);
    await page.goto(appRoute);
  });

  test('renders the sidebar with the sign-out button at the bottom', async ({ page }) => {
    const sidebar = page.locator('aside');
    const signOut = page.locator('[data-od-id="sidebar-sign-out"]');

    await expect(sidebar).toBeVisible();
    await expect(signOut).toBeVisible();
    await expect(signOut).toHaveAttribute('aria-label', 'Sign out');
    await expect(signOut).toContainText('Sign out');
  });

  test('keeps the sign-out button visible when collapsed', async ({ page }) => {
    const sidebar = page.locator('aside');
    const collapseButton = sidebar.getByRole('button', { name: /Collapse navigation/ });

    await collapseButton.click();

    const signOut = page.locator('[data-od-id="sidebar-sign-out"]');
    const signOutText = signOut.locator('span').last();

    await expect(signOut).toBeVisible();
    await expect(signOutText).toBeHidden();
  });

  test('highlights the active section in the navigation', async ({ page }) => {
    const sidebar = page.locator('aside');
    const workspaceLink = sidebar.getByRole('link', { name: 'Workspace' });

    await expect(workspaceLink).toHaveClass(/text-blue-600/);
  });

  test('signs out and redirects to /sign-in when the sign-out button is clicked', async ({ page }) => {
    const signOut = page.locator('[data-od-id="sidebar-sign-out"]');

    await signOut.click();
    await expect(page).toHaveURL(signInUrlPattern, { timeout: 15000 });
  });
});
