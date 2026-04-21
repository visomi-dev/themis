import { expect, test } from '@playwright/test';

import { appRoute, signInRoute, signInUrlPattern } from '../support/routes';

test.describe('theme', () => {
  test('toggles theme on auth routes and preserves it into the app', async ({ page }) => {
    await page.goto(signInRoute);

    await expect(page.locator('html')).not.toHaveClass(/dark/);

    await page.getByRole('button', { name: 'Toggle theme' }).click();

    await expect(page.locator('html')).toHaveClass(/dark/);

    await page.goto(appRoute);

    await expect(page).toHaveURL(signInUrlPattern);
    await expect(page.locator('html')).toHaveClass(/dark/);
  });
});
