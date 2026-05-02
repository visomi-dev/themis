import { randomUUID } from 'node:crypto';

import { expect, type APIRequestContext, type Page } from '@playwright/test';

import { clearMailbox, readLatestPin } from './mailbox';
import { fillOtp } from './otp';
import {
  appUrlPattern,
  signInRoute,
  signInUrlPattern,
  signUpRoute,
  signUpUrlPattern,
  verifyEmailUrlPattern,
} from './routes';

export const createCredentials = () => ({
  email: `engineer+${randomUUID()}@themis.visomi.dev`,
  password: 'S3cureAuth!',
});

const fillCredentials = async (page: Page, email: string, password: string) => {
  const emailField = page.getByLabel('Email');

  const passwordField = page.getByLabel('Password');

  await expect(emailField).toBeVisible();
  await expect(emailField).toBeEditable();
  await expect(passwordField).toBeVisible();
  await expect(passwordField).toBeEditable();

  await emailField.fill(email);
  await expect(emailField).toHaveValue(email);
  await passwordField.fill(password);
  await expect(passwordField).toHaveValue(password);
};

const submitSignUpCredentials = async (page: Page, email: string, password: string) => {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await fillCredentials(page, email, password);
    await page.getByRole('button', { name: 'Create account' }).click();

    try {
      await expect(page).toHaveURL(verifyEmailUrlPattern, { timeout: 15000 });

      return;
    } catch (error) {
      if (attempt === 1 || !signUpUrlPattern.test(page.url())) {
        throw error;
      }
    }
  }
};

const waitForAuthenticatedSession = async (page: Page, email: string) => {
  await expect
    .poll(
      async () => {
        return page.evaluate(async () => {
          const response = await fetch('/api/auth/session', {
            credentials: 'include',
          });

          if (!response.ok) {
            return null;
          }

          const payload = (await response.json()) as {
            data: {
              user: { accountId?: string; email?: string } | null;
            };
          };

          return payload.data?.user?.email && payload.data?.user?.accountId
            ? { accountId: payload.data.user.accountId, email: payload.data.user.email }
            : null;
        });
      },
      { timeout: 15000 },
    )
    .toEqual({
      accountId: expect.any(String),
      email,
    });
};

export const authenticateViaApi = async (page: Page, request: APIRequestContext, email: string, password: string) => {
  await clearMailbox(request);

  await page.goto(signUpRoute);
  await expect(page).toHaveURL(signUpUrlPattern);
  await submitSignUpCredentials(page, email, password);

  const pin = await readLatestPin(request, email, 'sign_up');

  await fillOtp(page, pin);
  await page.getByRole('button', { name: 'Verify and continue' }).click();

  await expect(page).toHaveURL(appUrlPattern, { timeout: 15000 });
  await waitForAuthenticatedSession(page, email);
};

export const signUp = async (page: Page, email: string, password: string) => {
  await page.goto(signUpRoute);
  await expect(page).toHaveURL(signUpUrlPattern);
  await expect(page.getByRole('heading', { name: 'Create account' })).toBeVisible();
  await submitSignUpCredentials(page, email, password);
  await expect(page.getByRole('heading', { name: 'Verify email' })).toBeVisible();
};

export const signIn = async (page: Page, email: string, password: string) => {
  await page.goto(signInRoute);
  await expect(page).toHaveURL(signInUrlPattern);
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await fillCredentials(page, email, password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(verifyEmailUrlPattern, { timeout: 15000 });
  await expect(page.getByRole('heading', { name: 'Verify email' })).toBeVisible();
};

export const verifyLatestCode = async (
  page: Page,
  request: APIRequestContext,
  email: string,
  purpose: 'sign_in' | 'sign_up',
) => {
  const pin = await readLatestPin(request, email, purpose);

  await fillOtp(page, pin);
  await page.getByRole('button', { name: 'Verify and continue' }).click();

  await expect(page).toHaveURL(appUrlPattern, { timeout: 15000 });
  await waitForAuthenticatedSession(page, email);
};

export const registerAndAuthenticate = async (
  page: Page,
  request: APIRequestContext,
  email: string,
  password: string,
) => {
  await signUp(page, email, password);
  await verifyLatestCode(page, request, email, 'sign_up');
};

export const signOutViaApi = async (page: Page) => {
  await page.evaluate(async () => {
    await fetch('/api/auth/sign-out', {
      credentials: 'include',
      method: 'POST',
    });
  });
};

export const registerAndSignOut = async (page: Page, request: APIRequestContext, email: string, password: string) => {
  await registerAndAuthenticate(page, request, email, password);
  await signOutViaApi(page);
  await page.goto(signInRoute);
  await expect(page).toHaveURL(/\/app\/en\/sign-in$/);
};
