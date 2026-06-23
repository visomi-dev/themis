import { expect, test, type Page } from '@playwright/test';

import { forgottenPasswordRoute, signInUrlPattern } from '../support/routes';

test.describe('/app/forgotten-password', () => {
  const successMessage = 'If an account exists with that email, a reset link has been sent.';

  async function fillEmail(page: Page, email: string) {
    const emailField = page.locator('#forgotten-password-email');

    await expect(emailField).toBeVisible();
    await expect(emailField).toBeEditable();

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await emailField.fill(email);

      try {
        await expect(emailField).toHaveValue(email, { timeout: 2_000 });

        return;
      } catch (error) {
        if (attempt === 2) {
          throw error;
        }
      }
    }
  }

  async function submitResetRequest(page: Page, email: string) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await fillEmail(page, email);
      await page.getByRole('button', { name: 'Send reset link' }).click();

      try {
        await expect(page.getByText(successMessage)).toBeVisible({ timeout: 15_000 });

        return;
      } catch (error) {
        if (attempt === 1) {
          throw error;
        }
      }
    }
  }

  test('shows validation errors when submitting empty form', async ({ page }) => {
    await page.goto(forgottenPasswordRoute);
    await page.getByRole('button', { name: 'Send reset link' }).click();

    await expect(page.getByText('Enter your email address.')).toBeVisible();
  });

  test('shows validation error for invalid email format', async ({ page }) => {
    await page.goto(forgottenPasswordRoute);
    const emailField = page.getByLabel('Email');

    await expect(page.getByRole('heading', { name: 'Reset password' })).toBeVisible();
    await expect(emailField).toBeEditable();

    await fillEmail(page, 'not-an-email');
    await page.getByRole('button', { name: 'Send reset link' }).click();

    await expect(page.getByText(/Enter (a valid|your) email address\./)).toBeVisible();
  });

  test('shows success message after valid submission', async ({ page }) => {
    await page.goto(forgottenPasswordRoute);
    const emailField = page.getByLabel('Email');

    await expect(page.getByRole('heading', { name: 'Reset password' })).toBeVisible();
    await expect(emailField).toBeEditable();

    await submitResetRequest(page, 'nonexistent@example.com');
  });

  test('back to sign in link navigates to sign-in', async ({ page }) => {
    await page.goto(forgottenPasswordRoute);
    await page.getByRole('link', { name: 'Back to sign in' }).click();

    await expect(page).toHaveURL(signInUrlPattern);
  });
});
