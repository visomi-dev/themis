import { expect, test } from '@playwright/test';

import { assertOpenDesignChrome } from '../support/auth-layout';
import { resetPasswordRoute } from '../support/routes';

test.describe('/app/reset-password', () => {
  test('renders the Open Design OTP step', async ({ page }) => {
    await page.goto(resetPasswordRoute);

    await assertOpenDesignChrome(page);
    await expect(page.locator('[data-slot="kicker"]')).toContainText('Password reset');
    await expect(page.locator('[data-slot="title"]')).toContainText('Reset your password');
    await expect(page.locator('[data-slot="sub"]')).toContainText('6-digit code');
  });

  test('reveals the password step after OTP verification', async ({ page }) => {
    await page.goto(resetPasswordRoute);

    const pinField = page.getByRole('textbox', { name: 'Verification code' });

    await expect(pinField).toBeEditable();

    await pinField.fill('123456');
    await page.getByRole('button', { name: 'Verify code' }).click();

    await expect(page.getByRole('textbox', { name: 'New password', exact: true })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Confirm new password', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Update password' })).toBeVisible();
  });

  test('rejects mismatched passwords', async ({ page }) => {
    await page.goto(resetPasswordRoute);

    await page.getByRole('textbox', { name: 'Verification code' }).fill('123456');
    await page.getByRole('button', { name: 'Verify code' }).click();

    await page.getByRole('textbox', { name: 'New password', exact: true }).fill('Strong-Pass-12!');
    await page.getByRole('textbox', { name: 'Confirm new password', exact: true }).fill('DifferentPass12!');

    await page.getByRole('button', { name: 'Update password' }).click();

    await expect(page.getByText("Passwords don't match.")).toBeVisible();
  });

  test('shows the success state after a valid password update', async ({ page }) => {
    await page.goto(resetPasswordRoute);

    await page.getByRole('textbox', { name: 'Verification code' }).fill('123456');
    await page.getByRole('button', { name: 'Verify code' }).click();

    await page.getByRole('textbox', { name: 'New password', exact: true }).fill('Strong-Pass-12!');
    await page.getByRole('textbox', { name: 'Confirm new password', exact: true }).fill('Strong-Pass-12!');

    await page.getByRole('button', { name: 'Update password' }).click();

    await expect(page.getByText('Password updated')).toBeVisible();
    await expect(page.getByText(/Sign in with your new password/)).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign in to continue' })).toBeVisible();
  });
});
