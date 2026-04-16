import { expect, type APIRequestContext, type Page } from '@playwright/test';

import { clearMailbox, readLatestPin } from './mailbox';
import { fillOtp } from './otp';
import { appRoute, signInRoute, signUpRoute, verifyEmailRoute } from './routes';

export const createCredentials = () => ({
  email: `engineer+${Date.now()}-${Math.random().toString(16).slice(2)}@themis.dev`,
  password: 'S3cureAuth!',
});

export const signUp = async (page: Page, email: string, password: string) => {
  await page.goto(signUpRoute);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page).toHaveURL(verifyEmailRoute);
  await expect(page.getByRole('heading', { name: 'Verify email' })).toBeVisible();
};

export const signIn = async (page: Page, email: string, password: string) => {
  await page.goto(signInRoute);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(verifyEmailRoute);
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

  await expect(page).toHaveURL(appRoute);
  await expect(page.getByRole('heading', { name: /Workspace access confirmed/ })).toBeVisible();
};

export const registerAndAuthenticate = async (
  page: Page,
  request: APIRequestContext,
  email: string,
  password: string,
) => {
  await clearMailbox(request);
  await signUp(page, email, password);
  await verifyLatestCode(page, request, email, 'sign_up');
};

export const registerAndSignOut = async (page: Page, request: APIRequestContext, email: string, password: string) => {
  await registerAndAuthenticate(page, request, email, password);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(signInRoute);
};
