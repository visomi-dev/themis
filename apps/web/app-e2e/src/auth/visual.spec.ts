import { expect, test, type Page } from '@playwright/test';

import { identityRoute } from '../support/routes';

type Theme = 'light' | 'dark';

const themes: readonly Theme[] = ['light', 'dark'];

async function setTheme(page: Page, theme: Theme): Promise<void> {
  const html = page.locator('html');
  const isDark = await html.evaluate((element) => element.classList.contains('dark'));

  if ((theme === 'dark') !== isDark) {
    await page.getByRole('button', { name: 'Toggle light/dark theme' }).click();
  }

  await expect(html).toHaveClass(theme === 'dark' ? /dark/ : /^(?!.*dark)/);
}

for (const theme of themes) {
  test(`unified identity visual regression (${theme})`, async ({ page }) => {
    await page.goto(identityRoute);
    await setTheme(page, theme);

    await expect(page).toHaveScreenshot(`identity-${theme}.png`, { fullPage: true });
  });

  test(`email recovery visual regression (${theme})`, async ({ page }) => {
    await page.goto(identityRoute);
    await page.getByRole('button', { name: 'Try another way' }).click();
    await setTheme(page, theme);

    await expect(page).toHaveScreenshot(`identity-email-${theme}.png`, { fullPage: true });
  });

  test(`passkey retry visual regression (${theme})`, async ({ page }) => {
    await page.route('**/api/auth/passkey/authentication/begin', (route) =>
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'platform_error', message: 'Passkey authentication failed.' }),
      }),
    );
    await page.goto(identityRoute);
    await page.getByRole('button', { name: 'Continue with a passkey' }).click();
    await setTheme(page, theme);

    await expect(page).toHaveScreenshot(`identity-passkey-retry-${theme}.png`, { fullPage: true });
  });
}
