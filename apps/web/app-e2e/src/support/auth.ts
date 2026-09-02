import { randomUUID } from 'node:crypto';

import { expect, type APIRequestContext, type CDPSession, type Page, type Response } from '@playwright/test';

import { clearMailbox, readLatestPin } from './mailbox';
import { fillOtp } from './otp';
import {
  activationUrlPattern,
  appUrlPattern,
  identityRoute,
  identityUrlPattern,
  projectsRoute,
  projectsUrlPattern,
} from './routes';

type VerificationOptions = {
  completeActivation?: boolean;
};

const configuredPages = new WeakSet<Page>();
const webAuthnClients = new WeakMap<Page, CDPSession>();
const postAuthenticationUrlPattern = /\/app\/(?:en\/)?(?:activation|projects|dashboard)?$/;

export const createCredentials = () => ({
  email: `engineer+e2e-${randomUUID()}@themis.visomi.dev`,
  password: '',
});

async function ensureVirtualAuthenticator(page: Page): Promise<void> {
  if (configuredPages.has(page)) return;

  const client = await page.context().newCDPSession(page);

  await page.addInitScript(() => {
    const recordFailure = (error: unknown) => {
      const value = error instanceof Error ? `${error.name}: ${error.message}` : String(error);

      sessionStorage.setItem('themis.e2eWebAuthnError', value);
    };
    const create = navigator.credentials.create.bind(navigator.credentials);
    const get = navigator.credentials.get.bind(navigator.credentials);

    navigator.credentials.create = async (options) => {
      try {
        return await create(options);
      } catch (error) {
        recordFailure(error);
        throw error;
      }
    };
    navigator.credentials.get = async (options) => {
      try {
        return await get(options);
      } catch (error) {
        recordFailure(error);
        throw error;
      }
    };
  });
  await client.send('WebAuthn.enable');
  webAuthnClients.set(page, client);
  await addVirtualAuthenticator(page);
  configuredPages.add(page);
}

export async function addVirtualAuthenticator(page: Page, transport: 'internal' | 'usb' = 'internal'): Promise<void> {
  const client = webAuthnClients.get(page);

  if (!client) throw new Error('WebAuthn must be enabled before adding a virtual authenticator.');

  await client.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport,
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
}

async function waitForAuthenticatedSession(page: Page, email: string): Promise<void> {
  await expect
    .poll(
      async () =>
        page.evaluate(async () => {
          const response = await fetch('/api/auth/session', { credentials: 'include' });

          if (!response.ok) return null;

          const payload = (await response.json()) as {
            data: { kind: string; user: { accountId?: string; email?: string } | null };
          };

          return payload.data.kind === 'full' && payload.data.user?.accountId
            ? { accountId: payload.data.user.accountId, email: payload.data.user.email }
            : null;
        }),
      { timeout: 15_000 },
    )
    .toEqual({ accountId: expect.any(String), email });
}

async function completeActivationIfNeeded(page: Page): Promise<void> {
  if (!activationUrlPattern.test(page.url())) return;

  await page.getByRole('button', { name: /Skip for now/i }).click();
  await expect(page).toHaveURL(projectsUrlPattern, { timeout: 15_000 });
  await page.goto(projectsRoute);
}

async function startEmailRecovery(page: Page, email: string): Promise<void> {
  await page.goto(identityRoute);
  await expect(page).toHaveURL(identityUrlPattern);
  await page.getByRole('button', { name: 'Try another way' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill(email);
  await page.getByRole('button', { name: 'Send code' }).click();
  await expect(page.getByRole('heading', { name: 'Check for a 6-digit code' })).toBeVisible();
}

async function completePasskeyEnrollment(page: Page, request: APIRequestContext, email: string): Promise<void> {
  const ceremonyFailures: string[] = [];
  const captureCeremonyFailure = async (response: Response) => {
    if (response.url().includes('/api/auth/passkey/') && !response.ok()) {
      ceremonyFailures.push(`${response.status()} ${await response.text()}`);
    }
  };
  const pin = await readLatestPin(request, email);

  page.on('response', captureCeremonyFailure);
  await fillOtp(page, pin);
  await page.getByRole('button', { name: 'Verify email' }).click();

  const accountChoice = page.getByRole('heading', { name: 'Choose the account you want to access.' });

  if (await accountChoice.isVisible().catch(() => false)) {
    await page.getByRole('button', { name: /Create your Themis account/ }).click();
  }

  await expect(page.getByRole('heading', { name: 'Create a passkey to finish.' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Passkey name' }).fill('E2E virtual passkey');
  await page.getByRole('button', { name: 'Create passkey' }).click();

  try {
    await expect(page).toHaveURL(postAuthenticationUrlPattern, { timeout: 15_000 });
  } catch (error) {
    const browserFailure = await page.evaluate(() => sessionStorage.getItem('themis.e2eWebAuthnError'));

    if (ceremonyFailures.length || browserFailure) {
      throw new Error(
        `Passkey enrollment failed: ${[...ceremonyFailures, browserFailure].filter(Boolean).join('; ')}`,
        { cause: error },
      );
    }

    throw error;
  } finally {
    page.off('response', captureCeremonyFailure);
  }
  await waitForAuthenticatedSession(page, email);
}

export const authenticateViaApi = async (page: Page, request: APIRequestContext, email: string, _password: string) => {
  await ensureVirtualAuthenticator(page);
  await clearMailbox(request);
  await startEmailRecovery(page, email);
  await completePasskeyEnrollment(page, request, email);
  await completeActivationIfNeeded(page);
};

export const authenticateViaDeterministicTestSession = async (
  page: Page,
  request: APIRequestContext,
  email: string,
  _password: string,
) => {
  await page.goto(identityRoute);
  const response = await request.post('/api/test/auth/session', { data: { email } });

  if (!response.ok()) throw new Error(`deterministic test session failed with ${response.status()}`);

  const cookies = response
    .headers()
    ['set-cookie'].split(/, (?=[^;]+=)/)
    .map((cookie) => cookie.split(';', 1)[0].split('='))
    .map(([name, ...value]) => ({ name, value: value.join('='), url: new URL(page.url()).origin }));

  await page
    .context()
    .addCookies([...cookies, { name: 'themis.hasSession', value: '1', url: new URL(page.url()).origin }]);
  await waitForAuthenticatedSession(page, email);

  const activationStatus = await page.evaluate(async () => {
    const response = await fetch('/api/activation/milestones', {
      body: JSON.stringify({ milestone: 'activation_completed' }),
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      method: 'POST',
    });

    return response.status;
  });

  if (activationStatus !== 204 && activationStatus !== 409) {
    throw new Error(`deterministic activation completion failed with ${activationStatus}`);
  }
};

export const signUp = async (page: Page, email: string, _password: string) => {
  await ensureVirtualAuthenticator(page);
  await startEmailRecovery(page, email);
};

export const signIn = async (page: Page, _email: string, _password: string) => {
  await ensureVirtualAuthenticator(page);
  await page.goto(identityRoute);
  await page.getByRole('button', { name: 'Continue with a passkey' }).click();
  await expect(page).toHaveURL(appUrlPattern, { timeout: 15_000 });
};

export const signInWithRememberedDevice = signIn;

export const verifyLatestCode = async (
  page: Page,
  request: APIRequestContext,
  email: string,
  _purpose: 'sign_in' | 'sign_up',
  options: VerificationOptions = {},
) => {
  await completePasskeyEnrollment(page, request, email);

  if (options.completeActivation ?? true) await completeActivationIfNeeded(page);
};

export const registerAndAuthenticate = async (
  page: Page,
  request: APIRequestContext,
  email: string,
  password: string,
  options: VerificationOptions = {},
) => {
  await clearMailbox(request);
  await signUp(page, email, password);
  await verifyLatestCode(page, request, email, 'sign_up', options);
};

export const signOutViaApi = async (page: Page) => {
  await page.evaluate(async () => {
    await fetch('/api/auth/sign-out', { credentials: 'include', method: 'POST' });
  });
};

export const signOutViaMenu = async (page: Page) => {
  await page.locator('[data-od-id="sidebar-sign-out"]').click();
};

export const registerAndSignOut = async (page: Page, request: APIRequestContext, email: string, password: string) => {
  await registerAndAuthenticate(page, request, email, password);
  await signOutViaApi(page);
  await page.goto(identityRoute);
  await expect(page).toHaveURL(identityUrlPattern);
};
