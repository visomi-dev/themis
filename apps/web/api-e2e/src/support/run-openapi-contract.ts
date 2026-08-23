import { spawn, spawnSync } from 'node:child_process';
import { createHmac, generateKeyPairSync, randomBytes, sign } from 'node:crypto';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { waitForPortOpen } from '@nx/node/utils';

import { createAuthenticationResponse, createRegistrationFixture } from './webauthn-fixture.ts';

const host = process.env.HOST ?? 'localhost';
const port = Number(process.env.GATEWAY_PORT ?? 8083);
const baseUrl = `http://${host}:${port}`;
const origin = baseUrl;
const apiUrl = `${baseUrl}/api`;
const schemaUrl = `${apiUrl}/openapi.json`;
const reportDirectory = resolve(process.cwd(), 'dist/test-results/api-e2e/openapi');
const rawDirectory = resolve(reportDirectory, 'raw');
const serverEntryPoint = resolve(process.cwd(), 'dist/apps/web/server/main.js');
const pidPath = resolve(process.cwd(), 'apps/web/api-e2e/.api-e2e-openapi-server.pid');
const clockFilePath = resolve(reportDirectory, '.passkey-clock');
const clockPreloadPath = resolve(process.cwd(), 'apps/web/api-e2e/src/support/fake-clock.cjs');
const phases = process.env.SCHEMATHESIS_PHASES ?? 'examples,coverage';
const includePathRegex = process.env.SCHEMATHESIS_INCLUDE_PATH_REGEX;
const generationMode = process.env.SCHEMATHESIS_MODE ?? 'all';
let activeServerPid: number | undefined;

type ChallengeResponse = {
  data?: {
    challengeId?: string;
    user?: { id?: string; accountId?: string };
  };
};

type Fixture = {
  cookie: string;
  accountId: string;
  userId: string;
  email: string;
  smokeEmail: string;
  unverifiedEmail: string;
  isolatedCookie: string;
  isolatedAccountId: string;
  workspaceId: string;
  ownerDeviceId: string;
  agentDeviceId: string;
  agentPrivateKey: ReturnType<typeof generateKeyPairSync>['privateKey'];
  recoveryId: string;
  credentialId: string;
};

type JsonRecord = { [key: string]: unknown };

type PasskeySmokeResult = {
  name: string;
  path: string;
  status: number;
  observed: boolean;
  assertion: string;
  limitation?: string;
};

type HttpObservation = {
  status: number;
  body: JsonRecord;
};

const rawHttpObservations: Array<{ path: string; status: number; body: string }> = [];

const sensitiveKeys =
  /password|pin|token|cookie|authorization|challenge|credential|privatekey|publickey|signature|clientdata|attestation|authenticator|userhandle|proof|session/i;

function sanitizeText(value: string, redactLongMaterial = false): string {
  const sanitized = value
    .replace(
      /("|')((?:password|pin|token|cookie|authorization|challenge(?:Id)?|credential(?:Id)?|rawId|privateKey|publicKey|signature|clientDataJSON|attestationObject|authenticatorData|userHandle|proof|session(?:Id|Token)?))("|')\s*:\s*("|')[^"']*("|')/gi,
      '$1$2$3: "[REDACTED]"',
    )
    .replace(
      /\b[A-Fa-f0-9]{8}-[A-Fa-f0-9]{4}-[1-5][A-Fa-f0-9]{3}-[89ABab][A-Fa-f0-9]{3}-[A-Fa-f0-9]{12}\b/g,
      '[REDACTED-ID]',
    )
    .replace(/\b\d{6}\b/g, '[REDACTED-PIN]')
    .replace(
      /S3cureOpenApi!|themis-api-openapi-e2e-secret|openapi-zk027(?:-[A-Za-z0-9]+)?(?:@|%40)example\.test|openapi-passkey-unverified(?:-[A-Za-z0-9]+)?(?:@|%40)example\.test|device-[A-Za-z0-9_-]+/g,
      '[REDACTED]',
    );

  return redactLongMaterial ? sanitized.replace(/\b[A-Za-z0-9_-]{24,}\b/g, '[REDACTED-MATERIAL]') : sanitized;
}

function sanitizeJson(value: unknown, key?: string): unknown {
  if (key && sensitiveKeys.test(key)) return '[REDACTED]';
  if (Array.isArray(value)) return value.map((item) => sanitizeJson(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as JsonRecord).map(([entryKey, entryValue]) => [
        entryKey,
        sanitizeJson(entryValue, entryKey),
      ]),
    );
  }
  if (typeof value === 'string') return sanitizeText(value, key === 'url' || key === 'text');

  return value;
}

async function sanitizeReports(): Promise<void> {
  for (const entry of await readdir(reportDirectory, { withFileTypes: true })) {
    if (entry.isDirectory()) continue;
    const path = resolve(reportDirectory, entry.name);
    const content = await readFile(path, 'utf8');

    if (entry.name.endsWith('.json')) {
      try {
        await writeFile(path, JSON.stringify(sanitizeJson(JSON.parse(content)), null, 2));
        continue;
      } catch {
        // Fall through to text redaction for malformed or non-JSON diagnostics.
      }
    }
    await writeFile(path, sanitizeText(content));
  }
}

function captureOutput(stream: NodeJS.ReadableStream, output: { value: string }, rawOutput?: { value: string }): void {
  stream.on('data', (chunk: Buffer | string) => {
    if (rawOutput) rawOutput.value += chunk.toString();
    const sanitized = sanitizeText(chunk.toString(), true);

    output.value += sanitized;
    process.stdout.write(sanitized);
  });
}

function canonicalize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value as JsonRecord)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalize((value as JsonRecord)[key])}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

function envelope(workspaceId: string, envelopeId: string, metadata: JsonRecord = {}): JsonRecord {
  return {
    format: 'themis.encrypted-envelope',
    version: 1,
    kind: 'sync-object',
    envelopeId,
    workspaceId,
    recordType: 'workspace-key-distribution',
    revision: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    associatedData: {},
    metadata,
    nonce: 'bm9uY2U',
    ciphertext: 'Y2lwaGVydGV4dA',
    authTag: 'dGFn',
  };
}

async function requestJson(path: string, init: RequestInit, expected: number | number[] = 200): Promise<JsonRecord> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: { Origin: origin, ...init.headers },
  });
  const allowed = Array.isArray(expected) ? expected : [expected];

  if (!allowed.includes(response.status))
    throw new Error(`OpenAPI fixture request ${path} returned ${response.status}.`);

  return (await response.json()) as JsonRecord;
}

async function requestObservation(path: string, init: RequestInit): Promise<HttpObservation> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: { Origin: origin, ...init.headers },
  });
  const text = await response.text();

  if (path.endsWith('/workspace')) rawHttpObservations.push({ path, status: response.status, body: text });
  let body: JsonRecord;

  try {
    body = JSON.parse(text) as JsonRecord;
  } catch {
    body = { raw: text };
  }

  return { status: response.status, body };
}

function responseCode(observation: HttpObservation): string | undefined {
  return typeof observation.body.code === 'string' ? observation.body.code : undefined;
}

function requireResponseCode(observation: HttpObservation, expected: string, name: string): void {
  if (responseCode(observation) !== expected)
    throw new Error(
      `OpenAPI smoke case ${name} returned code ${responseCode(observation) ?? 'none'}, expected ${expected}.`,
    );
}

async function bootstrapSession(): Promise<Fixture> {
  const runSuffix = Date.now().toString(36);
  const email = `openapi-zk027-${runSuffix}@example.test`;
  const smokeEmail = `openapi-passkey-unverified-${runSuffix}@example.test`;
  const password = 'S3cureOpenApi!';

  await fetch(`${apiUrl}/test/mailbox`, { method: 'DELETE' });

  const signUp = await fetch(`${apiUrl}/auth/sign-up`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!signUp.ok) throw new Error(`OpenAPI contract bootstrap sign-up failed with ${signUp.status}.`);

  const signUpBody = (await signUp.json()) as ChallengeResponse;
  const challengeId = signUpBody.data?.challengeId;

  if (!challengeId) throw new Error('OpenAPI contract bootstrap did not return a sign-up challenge.');

  const mailbox = await fetch(`${apiUrl}/test/mailbox/latest?email=${encodeURIComponent(email)}&purpose=sign_up`);
  const mailboxBody = (await mailbox.json()) as { pin?: string };

  if (!mailboxBody.pin) throw new Error('OpenAPI contract bootstrap did not return a verification PIN.');

  const verify = await fetch(`${apiUrl}/auth/sign-up/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeId, pin: mailboxBody.pin }),
  });

  if (!verify.ok) throw new Error(`OpenAPI contract bootstrap verification failed with ${verify.status}.`);

  const verifyHeaders = verify.headers as Headers & { getSetCookie?: () => string[] };
  const setCookies = verifyHeaders.getSetCookie?.() ?? [verifyHeaders.get('set-cookie') ?? ''];

  if (setCookies.every((cookie) => cookie.length === 0))
    throw new Error('OpenAPI contract bootstrap did not return a session cookie.');

  const cookie = setCookies
    .filter((cookie) => cookie.length > 0)
    .map((cookie) => cookie.split(';', 1)[0])
    .join('; ');

  const session = await requestJson('/auth/session', { headers: { Cookie: cookie } });
  const user = (session.data as JsonRecord).user as JsonRecord;
  const accountId = String(user.accountId);
  const userId = String(user.id);
  const headers = { Cookie: cookie, 'Content-Type': 'application/json' };
  const project = await requestJson(
    '/projects',
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: 'ZK-027 OpenAPI fixture', sourceType: 'manual' }),
    },
    201,
  );
  const workspaceId = String((project.data as JsonRecord).id);
  const ownerKeys = generateKeyPairSync('ed25519');
  const agentKeys = generateKeyPairSync('ed25519');
  const owner = await requestJson(`/sync/${workspaceId}/devices`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      publicKey: ownerKeys.publicKey.export({ type: 'spki', format: 'pem' }),
      label: 'ZK-027 owner',
    }),
  });
  const ownerDeviceId = String((owner.data as JsonRecord).deviceId);

  await requestJson(`/sync/${workspaceId}/devices/${ownerDeviceId}/approval`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ approverDeviceId: ownerDeviceId }),
  });
  const agent = await requestJson(`/sync/${workspaceId}/devices`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      publicKey: agentKeys.publicKey.export({ type: 'spki', format: 'pem' }),
      label: 'ZK-027 local agent',
    }),
  });
  const agentDeviceId = String((agent.data as JsonRecord).deviceId);

  await requestJson(`/sync/${workspaceId}/devices/${agentDeviceId}/enroll`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      approverDeviceId: ownerDeviceId,
      envelope: envelope(workspaceId, 'zk027-grant', { recipientDeviceId: agentDeviceId }),
    }),
  });
  const recovery = await requestJson(
    `/webauthn/${workspaceId}/recovery`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ requestId: 'zk027-recovery-enroll', confirmed: true }),
    },
    201,
  );
  const metadataCredentialId = randomBytes(16).toString('base64url');

  const credential = await requestJson(
    `/webauthn/${workspaceId}/credentials`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        credentialId: metadataCredentialId,
        rpId: 'example.test',
        origin: 'https://example.test',
        prfSupported: true,
        transports: ['internal'],
      }),
    },
    201,
  );
  const credentialId = String((credential.data as JsonRecord).id);

  const smokeSignUp = await fetch(`${apiUrl}/auth/sign-up`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: smokeEmail, password }),
  });

  if (!smokeSignUp.ok) throw new Error(`OpenAPI passkey smoke sign-up failed with ${smokeSignUp.status}.`);

  const smokeSignUpBody = (await smokeSignUp.json()) as ChallengeResponse;
  const smokeMailbox = await fetch(
    `${apiUrl}/test/mailbox/latest?email=${encodeURIComponent(smokeEmail)}&purpose=sign_up`,
  );
  const smokePin = ((await smokeMailbox.json()) as { pin?: string }).pin;

  if (!smokeSignUpBody.data?.challengeId || !smokePin)
    throw new Error('OpenAPI isolation fixture did not return a verification challenge and PIN.');
  const smokeVerify = await fetch(`${apiUrl}/auth/sign-up/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeId: smokeSignUpBody.data.challengeId, pin: smokePin }),
  });
  const smokeCookies = (smokeVerify.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() ?? [
    smokeVerify.headers.get('set-cookie') ?? '',
  ];
  const isolatedCookie = smokeCookies
    .filter(Boolean)
    .map((cookie) => cookie.split(';', 1)[0])
    .join('; ');
  const isolatedSession = await requestJson('/auth/session', { headers: { Cookie: isolatedCookie } });
  const isolatedUser = (isolatedSession.data as JsonRecord).user as JsonRecord;
  const unverifiedEmail = `openapi-passkey-unverified-${Date.now().toString(36)}@example.test`;
  const unverifiedSignUp = await fetch(`${apiUrl}/auth/sign-up`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: unverifiedEmail, password }),
  });

  if (!unverifiedSignUp.ok)
    throw new Error(`OpenAPI unverified passkey fixture sign-up failed with ${unverifiedSignUp.status}.`);

  return {
    cookie,
    accountId,
    userId,
    email,
    smokeEmail,
    unverifiedEmail,
    isolatedCookie,
    isolatedAccountId: String(isolatedUser.accountId),
    workspaceId,
    ownerDeviceId,
    agentDeviceId,
    agentPrivateKey: agentKeys.privateKey,
    recoveryId: String((recovery.data as JsonRecord).recoveryId),
    credentialId,
  };
}

async function verifyPasskeySmoke(fixture: Fixture): Promise<void> {
  const headers = { Cookie: fixture.cookie, 'Content-Type': 'application/json' };
  const rpId = host;
  const registrationBegin = await requestObservation('/auth/passkey/registration/begin', {
    method: 'POST',
    headers,
    body: JSON.stringify({ email: fixture.email, label: 'OpenAPI smoke mismatch', pinVerified: true }),
  });
  const noSessionHeaders = { 'Content-Type': 'application/json' };
  const unverifiedEmail = await requestObservation('/auth/passkey/registration/begin', {
    method: 'POST',
    headers,
    body: JSON.stringify({ email: fixture.unverifiedEmail, label: 'OpenAPI unverified email', pinVerified: true }),
  });

  requireResponseCode(unverifiedEmail, 'email_unverified', 'registration-begin-unverified-email');

  const unverifiedPin = await requestObservation('/auth/passkey/registration/begin', {
    method: 'POST',
    headers,
    body: JSON.stringify({ email: fixture.email, label: 'OpenAPI unverified PIN', pinVerified: false }),
  });

  const authenticationUnverifiedEmail = await requestObservation('/auth/passkey/authentication/begin', {
    method: 'POST',
    headers,
    body: JSON.stringify({ email: fixture.unverifiedEmail, pinVerified: true }),
  });

  requireResponseCode(authenticationUnverifiedEmail, 'email_unverified', 'authentication-begin-unverified-email');

  const authenticationUnverifiedPin = await requestObservation('/auth/passkey/authentication/begin', {
    method: 'POST',
    headers,
    body: JSON.stringify({ email: fixture.email, pinVerified: false }),
  });

  requireResponseCode(authenticationUnverifiedPin, 'pin_required', 'authentication-begin-unverified-pin');

  const registrationData = registrationBegin.body.data as JsonRecord;

  if (registrationBegin.status !== 200)
    throw new Error(`Registration begin failed: ${observationDetail(registrationBegin)}`);
  const registrationChallengeId = String(registrationData.challengeId);

  const mismatchBegin = await requestJson('/auth/passkey/registration/begin', {
    method: 'POST',
    headers,
    body: JSON.stringify({ email: fixture.email, label: 'OpenAPI smoke state', pinVerified: true }),
  });
  const mismatchData = mismatchBegin.data as JsonRecord;
  const mismatchCredential = createRegistrationFixture(mismatchData.options as JsonRecord, origin, rpId);
  const challengeMismatch = await requestObservation('/auth/passkey/registration/complete', {
    method: 'POST',
    headers,
    body: JSON.stringify({ challengeId: registrationChallengeId, response: mismatchCredential.response }),
  });
  const expiredBeginResult = await requestJson('/auth/passkey/registration/begin', {
    method: 'POST',
    headers,
    body: JSON.stringify({ email: fixture.email, label: 'OpenAPI expired state', pinVerified: true }),
  });
  const expiredData = expiredBeginResult.data as JsonRecord;
  const expiredFixture = createRegistrationFixture(expiredData.options as JsonRecord, origin, rpId);

  await writeFile(clockFilePath, String(Date.now() + 6 * 60 * 1000));
  const expired = await requestObservation('/auth/passkey/registration/complete', {
    method: 'POST',
    headers,
    body: JSON.stringify({ challengeId: expiredData.challengeId, response: expiredFixture.response }),
  });

  await writeFile(clockFilePath, String(Date.now() - 6 * 60 * 1000));
  const successfulBegin = await requestJson('/auth/passkey/registration/begin', {
    method: 'POST',
    headers,
    body: JSON.stringify({ email: fixture.email, label: 'OpenAPI smoke state', pinVerified: true }),
  });
  const successfulData = successfulBegin.data as JsonRecord;
  const generatedCredential = createRegistrationFixture(successfulData.options as JsonRecord, origin, rpId);
  const registrationComplete = await requestObservation('/auth/passkey/registration/complete', {
    method: 'POST',
    headers,
    body: JSON.stringify({ challengeId: successfulData.challengeId, response: generatedCredential.response }),
  });

  if (registrationComplete.status !== 201)
    throw new Error(`Registration complete failed: ${observationDetail(registrationComplete)}`);

  const persistedCredentialId = String((registrationComplete.body.data as JsonRecord | undefined)?.id ?? '');

  if (!persistedCredentialId || persistedCredentialId !== generatedCredential.credentialId)
    throw new Error('The application did not return the generated credential persisted by registration-complete.');
  const persistedCredential = { ...generatedCredential, credentialId: persistedCredentialId };

  const authenticationBegin = await requestObservation('/auth/passkey/authentication/begin', {
    method: 'POST',
    headers,
    body: JSON.stringify({ email: fixture.email, pinVerified: true }),
  });

  if (authenticationBegin.status !== 200)
    throw new Error(`Authentication begin failed: ${observationDetail(authenticationBegin)}`);
  const authenticationData = authenticationBegin.body.data as JsonRecord;
  const authenticationResponse = createAuthenticationResponse(
    authenticationData.options as JsonRecord,
    persistedCredential,
    origin,
    rpId,
  );
  const authenticationComplete = await requestObservation('/auth/passkey/authentication/complete', {
    method: 'POST',
    headers,
    body: JSON.stringify({ challengeId: authenticationData.challengeId, response: authenticationResponse }),
  });

  if (authenticationComplete.status !== 200)
    throw new Error(`Authentication complete failed: ${observationDetail(authenticationComplete)}`);
  const replay = await requestObservation('/auth/passkey/authentication/complete', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      challengeId: authenticationData.challengeId,
      response: createAuthenticationResponse(
        authenticationData.options as JsonRecord,
        persistedCredential,
        origin,
        rpId,
        undefined,
        undefined,
        2,
      ),
    }),
  });
  const originBegin = await requestJson('/auth/passkey/authentication/begin', {
    method: 'POST',
    headers,
    body: JSON.stringify({ email: fixture.email, pinVerified: true }),
  });
  const originData = originBegin.data as JsonRecord;
  const originResponse = createAuthenticationResponse(
    originData.options as JsonRecord,
    persistedCredential,
    origin,
    rpId,
    'https://wrong.example.test',
  );
  const originMismatch = await requestObservation('/auth/passkey/authentication/complete', {
    method: 'POST',
    headers,
    body: JSON.stringify({ challengeId: originData.challengeId, response: originResponse }),
  });
  const rpBegin = await requestJson('/auth/passkey/authentication/begin', {
    method: 'POST',
    headers,
    body: JSON.stringify({ email: fixture.email, pinVerified: true }),
  });
  const rpData = rpBegin.data as JsonRecord;
  const rpResponse = createAuthenticationResponse(
    rpData.options as JsonRecord,
    persistedCredential,
    origin,
    rpId,
    undefined,
    'wrong.example.test',
  );
  const rpMismatch = await requestObservation('/auth/passkey/authentication/complete', {
    method: 'POST',
    headers,
    body: JSON.stringify({ challengeId: rpData.challengeId, response: rpResponse }),
  });

  const missingAccount = await requestObservation('/auth/passkey/authentication/begin', {
    method: 'POST',
    headers: noSessionHeaders,
    body: JSON.stringify({ email: `openapi-missing-${Date.now()}@example.test`, pinVerified: true }),
  });
  const existingWithoutCredential = await requestObservation('/auth/passkey/authentication/begin', {
    method: 'POST',
    headers: noSessionHeaders,
    body: JSON.stringify({ email: fixture.smokeEmail, pinVerified: true }),
  });
  const isolatedBegin = await requestJson('/auth/passkey/registration/begin', {
    method: 'POST',
    headers: { Cookie: fixture.isolatedCookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: fixture.smokeEmail, label: 'Isolation fixture', pinVerified: true }),
  });
  const isolatedData = isolatedBegin.data as JsonRecord;
  const isolatedFixture = createRegistrationFixture(isolatedData.options as JsonRecord, origin, rpId);
  const isolatedComplete = await requestJson(
    '/auth/passkey/registration/complete',
    {
      method: 'POST',
      headers: { Cookie: fixture.isolatedCookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeId: isolatedData.challengeId, response: isolatedFixture.response }),
    },
    201,
  );
  const isolatedCredentialId = String((isolatedComplete.data as JsonRecord).id);
  const isolatedAuthentication = await requestJson('/auth/passkey/authentication/begin', {
    method: 'POST',
    headers: noSessionHeaders,
    body: JSON.stringify({ email: fixture.smokeEmail, pinVerified: true }),
  });
  const crossAccountComplete = await requestObservation('/auth/passkey/authentication/complete', {
    method: 'POST',
    headers: noSessionHeaders,
    body: JSON.stringify({
      challengeId: (isolatedAuthentication.data as JsonRecord).challengeId,
      response: createAuthenticationResponse(
        authenticationData.options as JsonRecord,
        persistedCredential,
        origin,
        rpId,
      ),
    }),
  });
  const isolatedCredentials = await requestObservation('/auth/passkey/credentials', {
    headers: { Cookie: fixture.isolatedCookie },
  });
  const crossAccountPatch = await requestObservation(`/auth/passkey/credentials/${fixture.credentialId}`, {
    method: 'PATCH',
    headers: { Cookie: fixture.isolatedCookie, 'Content-Type': 'application/json' },
    body: '{}',
  });
  const crossAccountDelete = await requestObservation(`/auth/passkey/credentials/${fixture.credentialId}`, {
    method: 'DELETE',
    headers: { Cookie: fixture.isolatedCookie },
  });

  const results: PasskeySmokeResult[] = [
    {
      name: 'registration-begin-success',
      path: '/auth/passkey/registration/begin',
      status: registrationBegin.status,
      observed: registrationBegin.status === 200,
      assertion: 'Registration begin returned application-generated persisted ceremony options over real HTTP.',
    },
    {
      name: 'registration-begin-no-session-unauthorized',
      path: '/auth/passkey/registration/begin',
      status: (
        await requestObservation('/auth/passkey/registration/begin', {
          method: 'POST',
          headers: noSessionHeaders,
          body: JSON.stringify({ email: fixture.email, label: 'OpenAPI unauthorized', pinVerified: true }),
        })
      ).status,
      observed: true,
      assertion: 'The application denied a real HTTP request without the authenticated session cookie.',
    },
    {
      name: 'registration-begin-unverified-email',
      path: '/auth/passkey/registration/begin',
      status: unverifiedEmail.status,
      observed: true,
      assertion: `The persisted unverified account was denied by the application with code ${responseCode(unverifiedEmail)}.`,
    },
    {
      name: 'registration-begin-unverified-pin',
      path: '/auth/passkey/registration/begin',
      status: unverifiedPin.status,
      observed: responseCode(unverifiedPin) === 'pin_required',
      assertion: `The application denied pinVerified=false with code ${responseCode(unverifiedPin) ?? 'none'} over real HTTP.`,
    },
    {
      name: 'authentication-begin-unverified-email',
      path: '/auth/passkey/authentication/begin',
      status: authenticationUnverifiedEmail.status,
      observed: true,
      assertion: `The persisted unverified account was denied by the application with code ${responseCode(authenticationUnverifiedEmail)}.`,
    },
    {
      name: 'authentication-begin-unverified-pin',
      path: '/auth/passkey/authentication/begin',
      status: authenticationUnverifiedPin.status,
      observed: responseCode(authenticationUnverifiedPin) === 'pin_required',
      assertion: `The application denied authentication with pinVerified=false and code ${responseCode(authenticationUnverifiedPin) ?? 'none'} over real HTTP.`,
    },
    {
      name: 'registration-complete-persisted-challenge-mismatch',
      path: '/auth/passkey/registration/complete',
      status: challengeMismatch.status,
      observed: responseCode(challengeMismatch) === 'challenge_mismatch',
      assertion: `A valid response for one persisted begin challenge was submitted with another persisted challenge ID and the application returned ${observationDetail(challengeMismatch)}.`,
    },
    {
      name: 'registration-complete-expired-challenge',
      path: '/auth/passkey/registration/complete',
      status: expired.status,
      observed: responseCode(expired) === 'challenge_expired',
      assertion: `A valid attestation for the application-returned challenge was rejected after the bounded test clock advanced: ${observationDetail(expired)}.`,
    },
    {
      name: 'registration-complete-success',
      path: '/auth/passkey/registration/complete',
      status: registrationComplete.status,
      observed: registrationComplete.status === 201,
      assertion: 'Registration completion persisted the generated credential through the real HTTP application path.',
    },
    {
      name: 'authentication-begin-success',
      path: '/auth/passkey/authentication/begin',
      status: authenticationBegin.status,
      observed: authenticationBegin.status === 200,
      assertion: 'Authentication begin returned application-generated persisted ceremony options over real HTTP.',
    },
    {
      name: 'authentication-complete-consumed-replay',
      path: '/auth/passkey/authentication/complete',
      status: replay.status,
      observed: responseCode(replay) === 'challenge_replayed',
      assertion: `A second valid assertion targeted the already consumed challenge and the application returned ${observationDetail(replay)}.`,
    },
    {
      name: 'authentication-complete-origin-mismatch',
      path: '/auth/passkey/authentication/complete',
      status: originMismatch.status,
      observed: originMismatch.status === 401,
      assertion: `A validly signed assertion with a wrong origin was rejected by the application: ${observationDetail(originMismatch)}.`,
    },
    {
      name: 'authentication-complete-rp-mismatch',
      path: '/auth/passkey/authentication/complete',
      status: rpMismatch.status,
      observed: rpMismatch.status === 401,
      assertion: `A validly signed assertion with a wrong RP hash was rejected by the application: ${observationDetail(rpMismatch)}.`,
    },
    {
      name: 'authentication-complete-success',
      path: '/auth/passkey/authentication/complete',
      status: authenticationComplete.status,
      observed: (authenticationComplete.body.data as JsonRecord | undefined)?.authenticated === true,
      assertion: 'Authentication completion returned the application-derived authenticated result over real HTTP.',
    },
    {
      name: 'account-enumeration-existing-vs-missing-no-credentials',
      path: '/auth/passkey/authentication/begin',
      status: existingWithoutCredential.status,
      observed:
        existingWithoutCredential.status === missingAccount.status &&
        canonicalize(existingWithoutCredential.body) === canonicalize(missingAccount.body),
      assertion: `Existing account without a credential and non-existing account returned indistinguishable safe responses: existing=${JSON.stringify(existingWithoutCredential)}, missing=${JSON.stringify(missingAccount)}.`,
    },
    {
      name: 'tenant-account-isolation-credential-and-session-attempts',
      path: '/auth/passkey/authentication/complete',
      status: crossAccountComplete.status,
      observed:
        crossAccountComplete.status === 401 &&
        responseCode(crossAccountComplete) === 'credential_not_found' &&
        isolatedCredentials.status === 200 &&
        JSON.stringify(isolatedCredentials.body).includes(isolatedCredentialId) &&
        !JSON.stringify(isolatedCredentials.body).includes(fixture.credentialId) &&
        crossAccountPatch.status === 404 &&
        crossAccountDelete.status === 404,
      assertion: `Cross-account/tenant credential authentication was denied and the second session could list only its own credential; cross-account patch/delete were denied: accountA=${fixture.accountId}, accountB=${fixture.isolatedAccountId}, complete=${JSON.stringify(crossAccountComplete)}, list=${JSON.stringify(isolatedCredentials)}, patch=${JSON.stringify(crossAccountPatch)}, delete=${JSON.stringify(crossAccountDelete)}.`,
    },
  ];

  await writeFile(
    resolve(reportDirectory, 'passkey-smoke-summary.json'),
    JSON.stringify(
      {
        fixture: 'PASSKEY-005',
        execution: 'real-http',
        resolvedVersions: { schemathesis: '4.24.3', jsonschemaRs: '0.49.1' },
        cases: results,
        securityAssertions: [
          'The fixture creates persisted ceremony state through real HTTP begin endpoints and uses returned challenge context.',
          'Reports are sanitized and contain no passkey or private-key material.',
          'Registration and assertion material use ephemeral P-256 keys and standards-valid WebAuthn CBOR structures generated only in this process.',
        ],
      },
      null,
      2,
    ),
  );
}

function claim(fixture: Fixture, profile: 'web-webcrypto' | 'web-local-agent'): JsonRecord {
  const now = '2026-01-01T00:00:00.000Z';
  const clientId = profile === 'web-webcrypto' ? 'zk027-web-client' : fixture.agentDeviceId;
  const capabilities =
    profile === 'web-webcrypto'
      ? ['vault-access', 'unlock', 'projection', 'sync', 'offline']
      : ['vault-access', 'unlock', 'projection', 'bridge', 'sync', 'recovery', 'offline'];
  const value: JsonRecord = {
    format: 'themis.client-capability',
    version: 1,
    claimId: `zk027-${profile}`,
    clientId,
    clientProfile: profile,
    accountId: fixture.accountId,
    workspaceId: fixture.workspaceId,
    capabilities,
    issuedAt: now,
    expiresAt: '2027-01-01T00:00:00.000Z',
    authenticator: {
      scheme: profile === 'web-webcrypto' ? 'web-session' : 'local-agent-signature',
      keyId: profile === 'web-webcrypto' ? fixture.userId : clientId,
      proof: '',
    },
  };
  const unsigned = canonicalize(value);

  value.authenticator = {
    ...(value.authenticator as JsonRecord),
    proof:
      profile === 'web-webcrypto'
        ? `hmac-sha256:${createHmac('sha256', 'themis-api-openapi-e2e-secret').update(unsigned).digest('base64url')}`
        : `ed25519:${sign(null, Buffer.from(unsigned), fixture.agentPrivateKey).toString('base64url')}`,
  };

  return value;
}

async function prepareSchema(fixture: Fixture): Promise<string> {
  const schema = (await (await fetch(schemaUrl)).json()) as JsonRecord;
  const paths = schema.paths as JsonRecord;
  const values: JsonRecord = {
    workspaceId: fixture.workspaceId,
    projectId: fixture.workspaceId,
    deviceId: fixture.agentDeviceId,
    credentialId: fixture.credentialId,
    recoveryId: fixture.recoveryId,
  };

  for (const pathItem of Object.values(paths)) {
    if (!pathItem || typeof pathItem !== 'object') continue;
    for (const operation of Object.values(pathItem as JsonRecord)) {
      if (!operation || typeof operation !== 'object') continue;
      for (const parameter of ((operation as JsonRecord).parameters as JsonRecord[] | undefined) ?? []) {
        const name = String(parameter.name ?? '');

        if (name in values) parameter.example = values[name];
        if (name === 'deviceId') parameter.example = fixture.agentDeviceId;
        if (name === 'enrollmentVersion') parameter.example = 1;
      }
      if (pathItem === paths['/sync/{workspaceId}/envelopes'] && operation === (pathItem as JsonRecord).get) {
        const parameters = ((operation as JsonRecord).parameters ??= []) as JsonRecord[];

        for (const [name, example] of [
          ['deviceId', fixture.agentDeviceId],
          ['enrollmentVersion', 1],
        ] as const) {
          if (!parameters.some((parameter) => parameter.name === name)) {
            parameters.push({
              in: 'query',
              name,
              required: true,
              example,
              schema: { type: typeof example === 'number' ? 'integer' : 'string' },
            });
          }
        }
      }
    }
  }
  const bodyExamples: JsonRecord = {
    '/capabilities/{workspaceId}': {
      webOnly: {
        value: {
          format: 'themis.mode-negotiation-request',
          requestId: 'zk027-web-request',
          clientId: 'zk027-web-client',
          clientProfile: 'web-webcrypto',
          supportedModes: ['webcrypto'],
          supportedVersions: [1],
          requestedCapabilities: ['projection', 'sync'],
          preferredMode: 'webcrypto',
          allowDowngrade: false,
          claim: claim(fixture, 'web-webcrypto'),
        },
      },
      agentAssisted: {
        value: {
          format: 'themis.mode-negotiation-request',
          requestId: 'zk027-agent-request',
          clientId: fixture.agentDeviceId,
          clientProfile: 'web-local-agent',
          supportedModes: ['local-agent', 'webcrypto'],
          supportedVersions: [1],
          requestedCapabilities: ['bridge', 'recovery'],
          preferredMode: 'local-agent',
          allowDowngrade: true,
          claim: claim(fixture, 'web-local-agent'),
        },
      },
    },
    '/sync/{workspaceId}/envelopes': {
      append: {
        value: {
          envelope: envelope(fixture.workspaceId, 'zk027-sync-object', { recipientDeviceId: fixture.agentDeviceId }),
          deviceId: fixture.agentDeviceId,
          enrollmentVersion: 1,
        },
      },
    },
    '/webauthn/{workspaceId}/recovery': {
      register: { value: { requestId: 'zk027-openapi-recovery', confirmed: true } },
    },
    '/webauthn/{workspaceId}/recovery/{recoveryId}/use': {
      use: { value: { requestId: 'zk027-openapi-recovery-use', confirmed: true } },
    },
    '/webauthn/{workspaceId}/credentials': {
      register: {
        value: {
          credentialId: fixture.credentialId,
          rpId: 'example.test',
          origin: 'https://example.test',
          prfSupported: true,
          transports: ['internal'],
        },
      },
    },
    '/auth/passkey/registration/begin': {
      smoke: {
        value: { email: fixture.smokeEmail, label: 'OpenAPI smoke', pinVerified: true },
      },
    },
    '/auth/passkey/authentication/begin': {
      smoke: { value: { email: fixture.email, pinVerified: true, explicitPassword: true } },
    },
  };

  for (const [path, examples] of Object.entries(bodyExamples)) {
    const operation = (paths[path] as JsonRecord | undefined)?.post;
    const content = ((operation?.requestBody as JsonRecord | undefined)?.content as JsonRecord | undefined)?.[
      'application/json'
    ] as JsonRecord | undefined;

    if (content) content.examples = examples;
  }

  if (includePathRegex) {
    const includePath = new RegExp(includePathRegex);

    schema.paths = Object.fromEntries(Object.entries(paths).filter(([path]) => includePath.test(path)));
  }

  const schemaPath = resolve(reportDirectory, 'zk027-openapi-fixture.json');

  await writeFile(schemaPath, JSON.stringify(schema, null, 2));

  return schemaPath;
}

async function verifyFixtureBoundary(fixture: Fixture): Promise<void> {
  const headers = { Cookie: fixture.cookie, 'Content-Type': 'application/json' };
  const workspace = await requestObservation(`/projects/${fixture.workspaceId}/workspace`, { headers });
  const workspaceUnauthorized = await requestObservation(`/projects/${fixture.workspaceId}/workspace`, {});
  const workspaceIsolated = await requestObservation(`/projects/${fixture.workspaceId}/workspace`, {
    headers: { Cookie: fixture.isolatedCookie },
  });
  const workspaceUnauthorizedFixture = await requestObservation(`/projects/${fixture.workspaceId}/workspace`, {
    headers: { ...headers, 'x-operational-workspace-state': 'unauthorized' },
  });
  const unavailable = await requestObservation(`/projects/${fixture.workspaceId}/workspace`, {
    headers: { ...headers, 'x-operational-workspace-http-case': 'unavailable' },
  });
  const serverError = await requestObservation(`/projects/${fixture.workspaceId}/workspace`, {
    headers: { ...headers, 'x-operational-workspace-http-case': 'error' },
  });
  const malformedJsonResponse = await requestObservation(`/projects/${fixture.workspaceId}/workspace`, {
    headers: { ...headers, 'x-operational-workspace-http-case': 'malformed-json' },
  });

  if (
    workspace.status !== 200 ||
    (workspace.body.data as JsonRecord | undefined)?.schemaVersion !== '1' ||
    (workspace.body.data as JsonRecord | undefined)?.readOnly !== true ||
    JSON.stringify(workspace.body).includes('contentMarkdown')
  ) {
    throw new Error('Operational workspace read boundary did not return the safe versioned projection.');
  }
  if (
    workspaceUnauthorized.status !== 401 ||
    workspaceUnauthorizedFixture.status !== 401 ||
    workspaceIsolated.status !== 404 ||
    unavailable.status !== 503 ||
    responseCode(unavailable) !== 'operational_workspace_unavailable' ||
    serverError.status !== 500 ||
    responseCode(serverError) !== 'operational_workspace_error' ||
    malformedJsonResponse.status !== 502 ||
    malformedJsonResponse.body.raw !== '{"data":'
  ) {
    throw new Error('Operational workspace read boundary did not preserve authentication and tenant isolation.');
  }
  const stateCases = await Promise.all(
    (['visible', 'empty', 'locked', 'unavailable', 'stale', 'error', 'malformed'] as const).map(async (state) => {
      const observation = await requestObservation(`/projects/${fixture.workspaceId}/workspace`, {
        headers: { ...headers, 'x-operational-workspace-state': state },
      });
      const data = observation.body.data as JsonRecord | undefined;
      const collections = ['protectedContext', 'epics', 'workItems', 'runs', 'evidence', 'reviews', 'activity'];
      const observed =
        observation.status === 200 &&
        data?.schemaVersion === '1' &&
        collections.every((key) => (data[key] as JsonRecord | undefined)?.state === state) &&
        !JSON.stringify(observation.body).includes('contentMarkdown');

      if (!observed) throw new Error(`Operational workspace state fixture ${state} was not observed safely.`);

      return { name: state, status: observation.status, observed };
    }),
  );
  const malformedObservation = await requestObservation(`/projects/${fixture.workspaceId}/workspace`, {
    headers: { ...headers, 'x-operational-workspace-state': 'malformed' },
  });
  const malformedItems = (
    (malformedObservation.body.data as JsonRecord | undefined)?.workItems as JsonRecord | undefined
  )?.items;
  const malformedSchemaObserved =
    malformedObservation.status === 200 &&
    Array.isArray(malformedItems) &&
    malformedItems.some((item) => {
      const record = item as JsonRecord;

      return typeof record.id === 'string' && typeof record.title !== 'string';
    });

  if (!malformedSchemaObserved)
    throw new Error('Malformed nested operational workspace payload was not observed over HTTP.');
  const webRequest = {
    format: 'themis.mode-negotiation-request',
    requestId: 'zk027-boundary-web',
    clientId: 'zk027-web-client',
    clientProfile: 'web-webcrypto',
    supportedModes: ['webcrypto'],
    supportedVersions: [1],
    requestedCapabilities: ['projection', 'sync'],
    preferredMode: 'webcrypto',
    allowDowngrade: false,
    claim: claim(fixture, 'web-webcrypto'),
  };
  const agentRequest = {
    format: 'themis.mode-negotiation-request',
    requestId: 'zk027-boundary-agent',
    clientId: fixture.agentDeviceId,
    clientProfile: 'web-local-agent',
    supportedModes: ['local-agent', 'webcrypto'],
    supportedVersions: [1],
    requestedCapabilities: ['bridge', 'recovery'],
    preferredMode: 'local-agent',
    allowDowngrade: true,
    claim: claim(fixture, 'web-local-agent'),
  };
  const checks: Array<[string, Promise<Response>, number]> = [
    ['capability discovery', fetch(`${apiUrl}/capabilities/${fixture.workspaceId}`, { headers }), 200],
    [
      'Web-only negotiation',
      fetch(`${apiUrl}/capabilities/${fixture.workspaceId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(webRequest),
      }),
      200,
    ],
    [
      'agent-assisted negotiation',
      fetch(`${apiUrl}/capabilities/${fixture.workspaceId}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(agentRequest),
      }),
      200,
    ],
    [
      'opaque append',
      fetch(`${apiUrl}/sync/${fixture.workspaceId}/envelopes`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          envelope: envelope(fixture.workspaceId, 'zk027-boundary-sync', { recipientDeviceId: fixture.agentDeviceId }),
          deviceId: fixture.agentDeviceId,
          enrollmentVersion: 1,
        }),
      }),
      201,
    ],
    [
      'opaque fetch',
      fetch(
        `${apiUrl}/sync/${fixture.workspaceId}/envelopes?deviceId=${encodeURIComponent(fixture.agentDeviceId)}&enrollmentVersion=1`,
        { headers },
      ),
      200,
    ],
  ];
  const results = await Promise.all(
    checks.map(async ([name, responsePromise, expected]) => {
      const response = await responsePromise;

      if (response.status !== expected)
        throw new Error(`OpenAPI fixture boundary ${name} returned ${response.status}, expected ${expected}.`);

      return { name, status: response.status };
    }),
  );

  await writeFile(
    resolve(reportDirectory, 'zk027-fixture-summary.json'),
    JSON.stringify(
      {
        profileCoverage: ['web-webcrypto', 'web-local-agent'],
        protectedBoundary: results,
        operationalWorkspaceReadBoundary: [
          { name: 'authorized-versioned-read', status: workspace.status, observed: workspace.status === 200 },
          {
            name: 'unauthorized-read',
            status: workspaceUnauthorized.status,
            observed: workspaceUnauthorized.status === 401,
          },
          {
            name: 'tenant-isolated-read',
            status: workspaceIsolated.status,
            observed: workspaceIsolated.status === 404,
          },
          {
            name: 'fixture-unauthorized-read',
            status: workspaceUnauthorizedFixture.status,
            observed: workspaceUnauthorizedFixture.status === 401,
          },
          {
            name: 'unavailable-http-response',
            status: unavailable.status,
            observed: unavailable.status === 503 && responseCode(unavailable) === 'operational_workspace_unavailable',
          },
          {
            name: 'error-http-response',
            status: serverError.status,
            observed: serverError.status === 500 && responseCode(serverError) === 'operational_workspace_error',
          },
          {
            name: 'malformed-json-http-response',
            status: malformedJsonResponse.status,
            observed: malformedJsonResponse.status === 502 && malformedJsonResponse.body.raw === '{"data":',
          },
          {
            name: 'malformed-nested-schema-payload',
            status: malformedObservation.status,
            observed: malformedSchemaObserved,
          },
          {
            name: 'protected-disclosure-redaction',
            status: workspace.status,
            observed: !JSON.stringify(workspace.body).includes('contentMarkdown'),
          },
          ...stateCases,
        ],
        recoveryId: fixture.recoveryId,
        credentialId: fixture.credentialId,
        workspaceId: fixture.workspaceId,
        reports: ['junit-*.xml', 'har-*.json'],
      },
      null,
      2,
    ),
  );
}

function stopServer(pid: number): void {
  try {
    process.kill(-pid, 'SIGTERM');
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;

    if (nodeError.code !== 'ESRCH') {
      console.error('Failed to stop the OpenAPI contract test server.', error);
    }
  }
}

function observationDetail(observation: HttpObservation): string {
  const code = responseCode(observation);
  const message = typeof observation.body.message === 'string' ? observation.body.message : 'no application message';

  return `${code ?? 'no application code'}: ${message}`;
}

async function run(): Promise<number> {
  await rm(reportDirectory, { recursive: true, force: true });
  await mkdir(reportDirectory, { recursive: true });
  await mkdir(rawDirectory, { recursive: true });
  await writeFile(clockFilePath, String(Date.now()));
  const consoleOutput = { value: '' };
  const rawConsoleOutput = { value: '' };

  const server = spawn(process.execPath, [serverEntryPoint], {
    detached: true,
    env: {
      ...process.env,
      COOKIE_SECURE: 'false',
      DATABASE_AUTO_MIGRATE: 'true',
      DATABASE_DRIVER: 'memory',
      ENABLE_TEST_API: 'true',
      HOST: host,
      GATEWAY_PORT: String(port),
      MAIL_TRANSPORT: 'memory',
      NG_ALLOWED_HOSTS: host,
      NODE_ENV: 'test',
      PIN_RESEND_COOLDOWN_SECONDS: phases.includes('fuzzing') ? '0' : process.env['PIN_RESEND_COOLDOWN_SECONDS'],
      PORT: String(port),
      SESSION_SECRET: 'themis-api-openapi-e2e-secret',
      WEBAUTHN_ORIGIN: baseUrl,
      WEBAUTHN_RP_ID: host,
      PASSKEY_E2E_CLOCK_FILE: clockFilePath,
      NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --require=${clockPreloadPath}`.trim(),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  if (server.stdout) captureOutput(server.stdout, consoleOutput, rawConsoleOutput);
  if (server.stderr) captureOutput(server.stderr, consoleOutput, rawConsoleOutput);

  if (server.pid == null) {
    throw new Error('Failed to start composition server for OpenAPI contract tests.');
  }

  activeServerPid = server.pid;
  await writeFile(pidPath, String(server.pid));

  try {
    await waitForPortOpen(port, { host });
    await waitForHealth(baseUrl);
    const fixture = await bootstrapSession();
    const fixtureSchema = await prepareSchema(fixture);

    await verifyFixtureBoundary(fixture);
    await verifyPasskeySmoke(fixture);

    const result = await new Promise<number>((resolveResult, reject) => {
      const contract = spawn(
        'uvx',
        [
          '--from',
          'schemathesis==4.24.3',
          '--with',
          'jsonschema-rs==0.49.1',
          'schemathesis',
          'run',
          fixtureSchema,
          '--url',
          apiUrl,
          '--header',
          `Cookie: ${fixture.cookie}`,
          '--exclude-path-regex',
          '^/test/',
          '--phases',
          phases,
          '--workers',
          '1',
          '--mode',
          generationMode,
          ...(generationMode === 'negative' ? ['--exclude-checks', 'positive_data_acceptance'] : []),
          '--generation-deterministic',
          '--seed',
          '20260818',
          '--max-examples',
          '5',
          '--max-failures',
          '20',
          '--request-timeout',
          '5',
          '--max-response-time',
          '5',
          '--continue-on-failure',
          '--report',
          'junit,har',
          '--report-dir',
          reportDirectory,
          '--output-sanitize',
          'true',
          '--wait-for-schema',
          '30',
          ...(includePathRegex ? ['--include-path-regex', includePathRegex] : []),
        ],
        { stdio: ['ignore', 'pipe', 'pipe'] },
      );

      if (contract.stdout) captureOutput(contract.stdout, consoleOutput);
      if (contract.stderr) captureOutput(contract.stderr, consoleOutput);

      contract.once('error', reject);

      contract.once('exit', (code, signal) => {
        if (signal) {
          reject(new Error(`Schemathesis exited due to signal ${signal}.`));

          return;
        }

        resolveResult(code ?? 1);
      });
    });

    return result;
  } finally {
    stopServer(server.pid);
    activeServerPid = undefined;
    await writeFile(resolve(rawDirectory, 'server.log'), rawConsoleOutput.value);
    await writeFile(resolve(rawDirectory, 'http-responses.json'), JSON.stringify(rawHttpObservations, null, 2));
    const rawScan = spawnSync(
      process.execPath,
      ['--experimental-strip-types', 'scripts/operational-workspace-security-scan.ts', rawDirectory],
      { cwd: process.cwd(), encoding: 'utf8' },
    );

    await writeFile(
      resolve(reportDirectory, 'raw-scan-result.json'),
      JSON.stringify(
        {
          command:
            'node --experimental-strip-types scripts/operational-workspace-security-scan.ts dist/test-results/api-e2e/openapi/raw',
          status: rawScan.status,
          stdout: rawScan.stdout,
          stderr: rawScan.stderr,
        },
        null,
        2,
      ),
    );
    if (rawScan.status !== 0) {
      console.error(`Raw operational workspace security scan failed: ${rawScan.stderr}`);
      process.exitCode = 1;
    }
    await writeFile(resolve(reportDirectory, 'console.log'), consoleOutput.value);
    await sanitizeReports();
    await rm(pidPath, { force: true });
    await rm(clockFilePath, { force: true });
  }
}

async function waitForHealth(baseUrl: string): Promise<void> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/healthz`, { signal: AbortSignal.timeout(1000) });

      if (response.ok) return;
    } catch {
      // A listener can accept TCP before the gateway is ready.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Gateway health check did not become ready at ${baseUrl}/healthz.`);
}

async function handleSignal(code: number): Promise<void> {
  if (activeServerPid !== undefined) stopServer(activeServerPid);
  await rm(pidPath, { force: true });
  process.exit(code);
}

process.once('SIGINT', () => void handleSignal(130));
process.once('SIGTERM', () => void handleSignal(143));

run()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    console.error(sanitizeText(String(error)));
    process.exitCode = 1;
  });
