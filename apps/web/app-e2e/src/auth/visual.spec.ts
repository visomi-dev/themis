import { expect, test, type Page } from '@playwright/test';

import { createCredentials, signUp } from '../support/auth';
import { clearMailbox } from '../support/mailbox';
import { fillOtp } from '../support/otp';
import {
  forgottenPasswordRoute,
  resetPasswordRoute,
  signInRoute,
  signUpRoute,
  verifyEmailUrlPattern,
} from '../support/routes';

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

async function prepareVerifyEmail(page: Page): Promise<void> {
  await signUp(page, createCredentials().email, 'S3cureAuth!');
  await expect(page).toHaveURL(verifyEmailUrlPattern);
}

async function prepareResetPassword(page: Page, request: Parameters<typeof clearMailbox>[0]): Promise<void> {
  const credentials = createCredentials();

  await clearMailbox(request);
  await page.goto(forgottenPasswordRoute);
  await page.getByRole('textbox', { name: 'Email' }).fill(credentials.email);
  await page.getByRole('button', { name: 'Send recovery link' }).click();
  await page.waitForURL(resetPasswordRoute);
}

for (const theme of themes) {
  test(`sign-in visual regression (${theme})`, async ({ page }) => {
    await page.goto(signInRoute);
    await setTheme(page, theme);

    await expect(page).toHaveScreenshot(`sign-in-${theme}.png`, { fullPage: true });
  });

  test(`sign-up visual regression (${theme})`, async ({ page }) => {
    await page.goto(signUpRoute);
    await setTheme(page, theme);

    await expect(page).toHaveScreenshot(`sign-up-${theme}.png`, { fullPage: true });
  });

  test(`verify-email visual regression (${theme})`, async ({ page }) => {
    await prepareVerifyEmail(page);
    await setTheme(page, theme);

    await expect(page).toHaveScreenshot(`verify-email-${theme}.png`, { fullPage: true });
  });

  test(`forgotten-password visual regression (${theme})`, async ({ page }) => {
    await page.goto(forgottenPasswordRoute);
    await setTheme(page, theme);

    await expect(page).toHaveScreenshot(`forgotten-password-${theme}.png`, { fullPage: true });
  });

  test(`reset-password visual regression (${theme})`, async ({ page, request }) => {
    await prepareResetPassword(page, request);
    await setTheme(page, theme);

    await expect(page).toHaveScreenshot(`reset-password-${theme}.png`, { fullPage: true });
  });
}

test('verify-email validation visual regression', async ({ page }) => {
  await prepareVerifyEmail(page);
  await fillOtp(page, '000000');
  await page.getByRole('button', { name: 'Verify and continue' }).click();

  await expect(page).toHaveScreenshot('verify-email-invalid-code.png', { fullPage: true });
});
