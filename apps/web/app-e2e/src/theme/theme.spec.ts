import { expect, test } from '@playwright/test';

import { appRoute, identityRoute, identityUrlPattern } from '../support/routes';

test.describe('theme', () => {
  test('toggles theme on auth routes and preserves it into the app', async ({ page }) => {
    await page.goto(identityRoute);

    await expect(page.locator('html')).not.toHaveClass(/dark/);

    await page.getByRole('button', { name: 'Toggle light/dark theme' }).click();

    await expect(page.locator('html')).toHaveClass(/dark/);

    await page.goto(appRoute);

    await expect(page).toHaveURL(identityUrlPattern);
    await expect(page.locator('html')).toHaveClass(/dark/);
  });
});
