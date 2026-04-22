import { randomUUID } from 'node:crypto';

import { expect, type APIRequestContext, type Page } from '@playwright/test';

import { clearMailbox, readLatestPin } from './mailbox';
import { fillOtp } from './otp';
import {
  appRoute,
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
            user: { accountId?: string; email?: string } | null;
          };

          return payload.user?.email && payload.user?.accountId
            ? { accountId: payload.user.accountId, email: payload.user.email }
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

  const signUpResponse = await request.post('/api/auth/sign-up', {
    data: { email, password },
  });

  if (!signUpResponse.ok()) {
    throw new Error(`API sign-up failed with status ${signUpResponse.status()}.`);
  }

  const challenge = (await signUpResponse.json()) as { challengeId: string };
  const pin = await readLatestPin(request, email, 'sign_up');
  const verifyResponse = await request.post('/api/auth/sign-up/verify', {
    data: {
      challengeId: challenge.challengeId,
      pin,
    },
  });

  if (!verifyResponse.ok()) {
    throw new Error(`API sign-up verification failed with status ${verifyResponse.status()}.`);
  }

  const setCookieHeader = verifyResponse
    .headersArray()
    .find((header) => header.name.toLowerCase() === 'set-cookie')?.value;

  if (!setCookieHeader) {
    throw new Error('Session cookie was not returned by the auth response.');
  }

  const cookiePair = setCookieHeader.split(';', 1)[0];
  const separatorIndex = cookiePair.indexOf('=');
  const name = cookiePair.slice(0, separatorIndex);
  const value = cookiePair.slice(separatorIndex + 1);

  await page.context().addCookies([
    {
      domain: '127.0.0.1',
      httpOnly: true,
      name,
      path: '/',
      sameSite: 'Lax',
      secure: false,
      value,
    },
  ]);

  await page.goto(appRoute);
  await expect(page).toHaveURL(appUrlPattern, { timeout: 15000 });
  await waitForAuthenticatedSession(page, email);
};

export const signUp = async (page: Page, email: string, password: string) => {
  await page.goto(signUpRoute);
  await expect(page).toHaveURL(signUpUrlPattern);
  await expect(page.getByRole('heading', { name: 'Create account' })).toBeVisible();
  await fillCredentials(page, email, password);
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page).toHaveURL(verifyEmailUrlPattern, { timeout: 15000 });
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
  await expect(page.getByRole('heading', { name: /System activation/ })).toBeVisible();
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

export const registerAndSignOut = async (page: Page, request: APIRequestContext, email: string, password: string) => {
  await registerAndAuthenticate(page, request, email, password);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/app\/en\/sign-in$/);
};
