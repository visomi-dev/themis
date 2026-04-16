import { expect, test } from '@playwright/test';

import { createCredentials, signUp } from '../support/auth';
import { signUpRoute, verifyEmailRoute } from '../support/routes';

test.describe('/app/sign-up', () => {
  test('shows validation errors for invalid credentials', async ({ page }) => {
    await page.goto(signUpRoute);
    await page.getByRole('button', { name: 'Create account' }).click();

    await expect(page.getByText('Enter your email address.')).toBeVisible();
    await expect(page.getByText('Create a password before continuing.')).toBeVisible();
  });

  test('moves into verification after a valid submission', async ({ page }) => {
    const credentials = createCredentials();

    await signUp(page, credentials.email, credentials.password);

    await expect(page).toHaveURL(verifyEmailRoute);
  });
});
