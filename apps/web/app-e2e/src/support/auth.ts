import { randomUUID } from 'node:crypto';

import { expect, type APIRequestContext, type Page } from '@playwright/test';

import { readLatestPin } from './mailbox';
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

export const signUp = async (page: Page, email: string, password: string) => {
  await page.goto(signUpRoute);
  await expect(page).toHaveURL(signUpUrlPattern);
  await expect(page.getByRole('heading', { name: 'Create account' })).toBeVisible();
  await fillCredentials(page, email, password);
  await page.getByRole('button', { name: 'Create account' }).click();

  await expect(page).toHaveURL(verifyEmailUrlPattern);
  await expect(page.getByRole('heading', { name: 'Verify email' })).toBeVisible();
};

export const signIn = async (page: Page, email: string, password: string) => {
  await page.goto(signInRoute);
  await expect(page).toHaveURL(signInUrlPattern);
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await fillCredentials(page, email, password);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL(verifyEmailUrlPattern);
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

  await expect(page).toHaveURL(appUrlPattern);
  await expect(page.getByRole('heading', { name: /Workspace access confirmed/ })).toBeVisible();
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
  await expect(page).toHaveURL(/\/app(?:\/en-US)?\/sign-in$/);
};
