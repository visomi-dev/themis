import { expect, test } from '@playwright/test';

import { forgottenPasswordRoute, signInRoute } from '../support/routes';

test.describe('/app/forgotten-password', () => {
  test('shows validation errors when submitting empty form', async ({ page }) => {
    await page.goto(forgottenPasswordRoute);
    await page.getByRole('button', { name: 'Send reset link' }).click();

    await expect(page.getByText('Enter your email address.')).toBeVisible();
  });

  test('shows validation error for invalid email format', async ({ page }) => {
    await page.goto(forgottenPasswordRoute);
    await page.getByLabel('Email').fill('not-an-email');
    await page.getByRole('button', { name: 'Send reset link' }).click();

    await expect(page.getByText('Enter a valid email address.')).toBeVisible();
  });

  test('shows success message after valid submission', async ({ page }) => {
    await page.goto(forgottenPasswordRoute);
    await page.getByLabel('Email').fill('nonexistent@example.com');
    await page.getByRole('button', { name: 'Send reset link' }).click();

    await expect(page.getByText('If an account exists with that email, a reset link has been sent.')).toBeVisible();
  });

  test('back to sign in link navigates to sign-in', async ({ page }) => {
    await page.goto(forgottenPasswordRoute);
    await page.getByRole('link', { name: 'Back to sign in' }).click();

    await expect(page).toHaveURL(signInRoute);
  });
});
