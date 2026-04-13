import { expect, test, type Page } from '@playwright/test';

const fillOtp = async (page: Page, code: string) => {
  const digits = code.split('');

  for (const [index, digit] of digits.entries()) {
    await page.locator('.p-inputotp-input').nth(index).fill(digit);
  }
};

test('completes sign-up and sign-in through the Angular auth flow', async ({ page, request }) => {
  const uniqueEmail = `engineer+${Date.now()}@themis.dev`;
  const password = 'S3cureAuth!';

  await request.delete('/api/test/mailbox');

  await page.goto('/app/sign-up');

  await page.getByLabel('Email').fill(uniqueEmail);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page.getByRole('heading', { name: 'Verify email' })).toBeVisible();

  const signUpMail = await request.get(`/api/test/mailbox/latest?email=${encodeURIComponent(uniqueEmail)}&purpose=sign_up`);
  const signUpPayload = await signUpMail.json();

  await fillOtp(page, signUpPayload.pin);
  await page.getByRole('button', { name: 'Verify and continue' }).click();

  await expect(page.getByRole('heading', { name: 'Workspace access confirmed' })).toBeVisible();
  await expect(page.getByText(uniqueEmail)).toBeVisible();

  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();

  await request.delete('/api/test/mailbox');

  await page.getByLabel('Email').fill(uniqueEmail);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page.getByRole('heading', { name: 'Verify email' })).toBeVisible();

  const signInMail = await request.get(`/api/test/mailbox/latest?email=${encodeURIComponent(uniqueEmail)}&purpose=sign_in`);
  const signInPayload = await signInMail.json();

  await fillOtp(page, signInPayload.pin);
  await page.getByRole('button', { name: 'Verify and continue' }).click();

  await expect(page.getByRole('heading', { name: 'Workspace access confirmed' })).toBeVisible();
});

test('toggles theme on the auth screen', async ({ page }) => {
  await page.goto('/app/sign-in');

  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await page.getByRole('button', { name: 'Toggle theme' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
});
