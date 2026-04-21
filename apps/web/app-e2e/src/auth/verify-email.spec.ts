import { expect, test } from '@playwright/test';

import { readLatestPin } from '../support/mailbox';
import { createCredentials, signIn, signUp } from '../support/auth';
import { fillOtp } from '../support/otp';
import { signInUrlPattern, verifyEmailRoute, verifyEmailUrlPattern } from '../support/routes';

test.describe('/app/verify-email', () => {
  test('redirects to sign-in when no challenge is active', async ({ page }) => {
    await page.goto(verifyEmailRoute);

    await expect(page).toHaveURL(signInUrlPattern);
  });

  test('shows an inline error for an invalid verification code', async ({ page }) => {
    const credentials = createCredentials();

    await signUp(page, credentials.email, credentials.password);
    await fillOtp(page, '000000');
    await page.getByRole('button', { name: 'Verify and continue' }).click();

    await expect(page).toHaveURL(verifyEmailUrlPattern);
    await expect(page.getByRole('alert')).toContainText('The verification code is invalid.');
  });

  test('shows cooldown feedback when resend is requested too early', async ({ page, request }) => {
    const credentials = createCredentials();

    await signUp(page, credentials.email, credentials.password);
    const originalPin = await readLatestPin(request, credentials.email, 'sign_up');

    await page.getByRole('button', { name: 'Resend code' }).click();

    await expect(page).toHaveURL(verifyEmailUrlPattern);

    const nextPin = await readLatestPin(request, credentials.email, 'sign_up');

    expect(nextPin).toBe(originalPin);
  });

  test('completes sign-in verification with the latest code', async ({ page, request }) => {
    const credentials = createCredentials();

    await signUp(page, credentials.email, credentials.password);
    const signUpPin = await readLatestPin(request, credentials.email, 'sign_up');
    await fillOtp(page, signUpPin);
    await page.getByRole('button', { name: 'Verify and continue' }).click();
    await page.getByRole('button', { name: 'Sign out' }).click();

    await signIn(page, credentials.email, credentials.password);

    const signInPin = await readLatestPin(request, credentials.email, 'sign_in');
    await fillOtp(page, signInPin);
    await page.getByRole('button', { name: 'Verify and continue' }).click();

    await expect(page.getByRole('heading', { name: /System activation/ })).toBeVisible();
  });
});
