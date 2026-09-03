import { createHash, randomBytes, randomUUID } from 'node:crypto';

import { and, eq, gt, isNull, ne } from 'drizzle-orm';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type WebAuthnCredential,
} from '@simplewebauthn/server';
import { Router, type CookieOptions } from 'express';

import { getValidated, validateRequest } from '../shared/http/route-schemas';
import { env } from '../shared/env';

import { authed, authedRequest } from './auth-middleware';
import { findUserById, resolveAuthUserForAccount } from './auth-service';
import {
  authenticationBeginSchema,
  authenticationCompleteSchema,
  credentialMutationSchema,
  credentialIdPathSchema,
  passkeyOpenApiPaths,
  registrationBeginSchema,
  registrationCompleteSchema,
} from './passkey-schemas';
import { nextPasskeyAttempt, nextPasskeyCounter } from './passkey-contract';
import { csrfProtection, passkeyRateLimit } from './passkey-security';

import {
  accountPasskeyCredentials,
  authWebAuthnChallenges as accountWebAuthnChallenges,
  db,
  HttpError,
  users,
} from 'shared';

type ChallengePurpose =
  | 'discoverable_authentication'
  | 'restricted_registration'
  | 'restricted_authentication'
  | 'security_registration'
  | 'security_authentication';

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const SECURITY_REAUTH_TTL_MS = 10 * 60 * 1000;
const PASSKEY_ACCOUNT_UNAVAILABLE = 'credential_not_found';
const SESSION_HINT_COOKIE = 'themis.hasSession';
const rpId = process.env.WEBAUTHN_RP_ID ?? 'localhost';
const origin = process.env.WEBAUTHN_ORIGIN ?? new URL(env.APP_BASE_URL).origin;

function hashChallenge(challenge: string): string {
  return createHash('sha256').update(challenge).digest('hex');
}
function ceremonyType(purpose: ChallengePurpose): 'registration' | 'authentication' {
  return purpose.endsWith('registration') ? 'registration' : 'authentication';
}
function credentialView(value: typeof accountPasskeyCredentials.$inferSelect) {
  return {
    id: value.credentialId,
    label: value.label,
    createdAt: value.createdAt.toISOString(),
    lastUsedAt: value.lastUsedAt?.toISOString() ?? null,
    revokedAt: value.revokedAt?.toISOString() ?? null,
    transports: value.transports,
    backupEligible: value.backupEligible,
    backupState: value.backupState,
  };
}
function failure(code: string, statusCode: number, message = 'The passkey ceremony could not be completed.'): never {
  throw new HttpError({ code, message, statusCode });
}
function requireFreshSecurityReauthentication(req: Parameters<typeof authedRequest>[0]): void {
  const verifiedAt = req.session?.passkeySecurityReauthenticatedAt;

  if (!verifiedAt || Date.now() - verifiedAt > SECURITY_REAUTH_TTL_MS)
    failure('reauthentication_required', 401, 'Confirm an existing passkey before changing security settings.');
}
async function createChallenge(input: {
  accountId: string | null;
  allowCredentialIds?: string[];
  credentialId?: string;
  flowId?: string;
  purpose: ChallengePurpose;
  sessionBinding: string;
  userId: string | null;
  value: string;
}) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CHALLENGE_TTL_MS);
  const id = randomUUID();

  await db.insert(accountWebAuthnChallenges).values({
    id,
    accountId: input.accountId,
    userId: input.userId,
    challengeHash: hashChallenge(input.value),
    purpose: input.purpose,
    ceremonyType: ceremonyType(input.purpose),
    sessionBinding: input.sessionBinding,
    flowId: input.flowId ?? null,
    credentialId: input.credentialId ?? null,
    allowCredentialIds: input.allowCredentialIds ?? [],
    rpId,
    origin,
    userVerification: 'required',
    expiresAt,
    createdAt: now,
    attemptCount: 0,
    consumedAt: null,
  });

  return { id, expiresAt };
}
async function consumeChallenge(input: {
  id: string;
  purpose: ChallengePurpose;
  sessionBinding: string;
  value: string;
}) {
  const now = new Date();
  const [updated] = await db
    .update(accountWebAuthnChallenges)
    .set({ consumedAt: now })
    .where(
      and(
        eq(accountWebAuthnChallenges.id, input.id),
        eq(accountWebAuthnChallenges.purpose, input.purpose),
        eq(accountWebAuthnChallenges.ceremonyType, ceremonyType(input.purpose)),
        eq(accountWebAuthnChallenges.sessionBinding, input.sessionBinding),
        eq(accountWebAuthnChallenges.rpId, rpId),
        eq(accountWebAuthnChallenges.origin, origin),
        eq(accountWebAuthnChallenges.userVerification, 'required'),
        isNull(accountWebAuthnChallenges.consumedAt),
        gt(accountWebAuthnChallenges.expiresAt, now),
      ),
    )
    .returning();

  if (updated) {
    if (updated.challengeHash !== hashChallenge(input.value)) failure('challenge_mismatch', 400);

    return updated;
  }
  const [existing] = await db
    .select()
    .from(accountWebAuthnChallenges)
    .where(eq(accountWebAuthnChallenges.id, input.id))
    .limit(1);

  if (!existing || existing.purpose !== input.purpose || existing.sessionBinding !== input.sessionBinding)
    failure('challenge_mismatch', 400);
  if (existing.consumedAt) failure('challenge_replayed', 409);
  if (existing.expiresAt <= now) failure('challenge_expired', 410);
  failure('challenge_mismatch', 400);
}

function sessionHintCookieOptions(): CookieOptions {
  return {
    httpOnly: false,
    maxAge: env.SESSION_MAX_AGE_MS,
    path: '/',
    sameSite: 'lax',
    secure: env.COOKIE_SECURE,
  };
}
async function loginPasskey(
  req: Parameters<typeof authedRequest>[0],
  user: typeof users.$inferSelect,
  accountId: string,
  credentialId: string,
) {
  const authUser = await resolveAuthUserForAccount(user, accountId);
  const authenticatedUser = { ...authUser, authenticationMethod: 'passkey' as const, credentialId };

  await new Promise<void>((resolve, reject) => req.session.regenerate((error) => (error ? reject(error) : resolve())));

  await new Promise<void>((resolve, reject) =>
    req.login(authenticatedUser, (error) => (error ? reject(error) : resolve())),
  );
  req.session.authenticatedAt = Date.now();
  req.session.cookie.maxAge = env.SESSION_MAX_AGE_MS;
  delete req.session.restrictedAuth;
  delete req.session.passkeyRegistration;

  return authenticatedUser;
}

const passkeyRouter = Router();

passkeyRouter.use(csrfProtection);
passkeyRouter.use(passkeyRateLimit);

passkeyRouter.post('/registration/begin', validateRequest({ body: registrationBeginSchema }), async (req, res) => {
  const { label } = getValidated<{ body: typeof registrationBeginSchema }>(req).body!;
  const restricted = req.session?.restrictedAuth;
  const restrictedAccount = restricted?.eligibleAccounts.find(
    (candidate) => candidate.accountId === restricted.selectedAccountId,
  );
  let accountId: string;
  let flowId: string | undefined;
  let purpose: 'restricted_registration' | 'security_registration';
  let userId: string;

  if (restricted && restricted.expiresAt > Date.now() && restricted.selectedAccountId) {
    if (!restricted.allowedOperations.includes('passkeys:enroll')) failure('restricted_session_forbidden', 403);
    if (!restrictedAccount) failure('account_unavailable', 404);

    accountId = restrictedAccount.accountId;
    flowId = restricted.flowId;
    purpose = 'restricted_registration';
    userId = restricted.userId;
  } else if (req.isAuthenticated()) {
    const authenticated = authedRequest(req).user;

    requireFreshSecurityReauthentication(authedRequest(req));
    accountId = authenticated.accountId;
    purpose = 'security_registration';
    userId = authenticated.id;
  } else {
    failure('restricted_session_required', 401, 'Verify an email code and select an account before registering.');
  }
  const user = await findUserById(userId);

  if (!user || (restricted && user.email !== restricted.verifiedEmail)) failure('restricted_session_forbidden', 403);
  const existing = await db
    .select()
    .from(accountPasskeyCredentials)
    .where(
      and(
        eq(accountPasskeyCredentials.accountId, accountId),
        eq(accountPasskeyCredentials.userId, user.id),
        isNull(accountPasskeyCredentials.revokedAt),
      ),
    );
  const challenge = randomBytes(32).toString('base64url');
  const options = await generateRegistrationOptions({
    rpName: 'Themis',
    rpID: rpId,
    userName: user.email,
    userID: Buffer.from(user.id),
    challenge,
    timeout: 60000,
    attestationType: 'none',
    excludeCredentials: existing.map((item) => ({ id: item.credentialId, transports: item.transports as never[] })),
    authenticatorSelection: { residentKey: 'required', requireResidentKey: true, userVerification: 'required' },
  });
  const stored = await createChallenge({
    accountId,
    allowCredentialIds: existing.map((item) => item.credentialId),
    flowId,
    purpose,
    sessionBinding: req.sessionID ?? 'anonymous',
    userId: user.id,
    value: options.challenge,
  });

  req.session.passkeyRegistration = {
    accountId,
    challengeId: stored.id,
    flowId,
    label,
    purpose,
    userId: user.id,
  };
  res.json({
    data: { challengeId: stored.id, options },
    message: 'Passkey registration options created.',
  });
});

passkeyRouter.post(
  '/registration/complete',
  validateRequest({ body: registrationCompleteSchema }),
  async (req, res) => {
    const body = getValidated<{ body: typeof registrationCompleteSchema }>(req).body!;
    const pending = req.session?.passkeyRegistration;
    const restricted = req.session?.restrictedAuth;
    const restrictedRegistration = pending?.purpose === 'restricted_registration';

    if (
      !pending ||
      pending.challengeId !== body.challengeId ||
      (restrictedRegistration &&
        (!restricted ||
          restricted.expiresAt <= Date.now() ||
          pending.flowId !== restricted.flowId ||
          pending.accountId !== restricted.selectedAccountId ||
          pending.userId !== restricted.userId)) ||
      (!restrictedRegistration &&
        (!req.isAuthenticated() ||
          authedRequest(req).user.accountId !== pending.accountId ||
          authedRequest(req).user.id !== pending.userId))
    ) {
      failure('challenge_mismatch', 400);
    }
    const user = await findUserById(pending.userId);

    if (!user) failure(PASSKEY_ACCOUNT_UNAVAILABLE, 404);
    const [challenge] = await db
      .select()
      .from(accountWebAuthnChallenges)
      .where(eq(accountWebAuthnChallenges.id, body.challengeId))
      .limit(1);

    if (
      !challenge ||
      challenge.accountId !== pending.accountId ||
      challenge.userId !== pending.userId ||
      challenge.flowId !== (pending.flowId ?? null) ||
      challenge.purpose !== pending.purpose
    )
      failure('challenge_mismatch', 400);
    await consumeChallenge({
      id: body.challengeId,
      purpose: pending.purpose,
      sessionBinding: req.sessionID ?? 'anonymous',
      value: decodeChallengeFromResponse(body.response),
    });
    let verified;

    try {
      verified = await verifyRegistrationResponse({
        response: body.response as never,
        expectedChallenge: (candidate) => hashChallenge(candidate) === challenge.challengeHash,
        expectedOrigin: challenge.origin,
        expectedRPID: challenge.rpId,
        requireUserPresence: true,
        requireUserVerification: true,
      });
    } catch {
      failure('platform_error', 400);
    }
    if (!verified.verified) failure('platform_error', 400);
    const credential = verified.registrationInfo.credential;
    const value = {
      id: randomUUID(),
      accountId: pending.accountId,
      userId: user.id,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString('base64url'),
      rpId,
      label: pending.label,
      transports: body.response.response.transports ?? [],
      signCount: credential.counter,
      backupEligible: verified.registrationInfo.credentialDeviceType === 'multiDevice',
      backupState: verified.registrationInfo.credentialBackedUp,
      status: restrictedRegistration ? 'pending' : 'active',
      enrollmentFlowId: pending.flowId ?? null,
      createdAt: new Date(),
      activatedAt: restrictedRegistration ? null : new Date(),
      lastUsedAt: null,
      revokedAt: null,
      updatedAt: new Date(),
    };

    await db.insert(accountPasskeyCredentials).values(value);
    delete req.session?.passkeyRegistration;

    if (!restrictedRegistration) {
      const authenticated = authedRequest(req).user;

      await new Promise<void>((resolve, reject) =>
        req.session.regenerate((error) => (error ? reject(error) : resolve())),
      );
      await new Promise<void>((resolve, reject) =>
        req.login(authenticated, (error) => (error ? reject(error) : resolve())),
      );
      req.session.authenticatedAt = Date.now();
      req.session.cookie.maxAge = env.SESSION_MAX_AGE_MS;
      res.cookie(SESSION_HINT_COOKIE, '1', sessionHintCookieOptions());
      res.status(201).json({
        data: { credential: credentialView(value) },
        message: 'Passkey registered.',
      });

      return;
    }
    const verificationOptions = await generateAuthenticationOptions({
      allowCredentials: [{ id: credential.id, transports: value.transports as never[] }],
      challenge: randomBytes(32).toString('base64url'),
      rpID: rpId,
      timeout: 60_000,
      userVerification: 'required',
    });
    const verificationChallenge = await createChallenge({
      accountId: pending.accountId,
      allowCredentialIds: [credential.id],
      credentialId: credential.id,
      flowId: pending.flowId,
      purpose: 'restricted_authentication',
      sessionBinding: req.sessionID ?? 'anonymous',
      userId: pending.userId,
      value: verificationOptions.challenge,
    });

    res.status(201).json({
      data: {
        credential: credentialView(value),
        verificationChallengeId: verificationChallenge.id,
        verificationOptions,
      },
      message: 'Passkey registered. Verify it to finish signing in.',
    });
  },
);

// The browser response carries the challenge in clientDataJSON; the helper keeps raw challenge values out of durable state.
function decodeChallengeFromResponse(response: { response: { clientDataJSON: string } }): string {
  try {
    const data = JSON.parse(Buffer.from(response.response.clientDataJSON, 'base64url').toString('utf8')) as {
      challenge?: string;
    };

    if (!data.challenge) failure('challenge_mismatch', 400);

    return data.challenge;
  } catch {
    failure('challenge_mismatch', 400);
  }
}

passkeyRouter.post('/authentication/begin', validateRequest({ body: authenticationBeginSchema }), async (req, res) => {
  const { retryRequested } = getValidated<{
    body: typeof authenticationBeginSchema;
  }>(req).body!;
  const challenge = randomBytes(32).toString('base64url');
  const options = await generateAuthenticationOptions({
    rpID: rpId,
    userVerification: 'required',
    timeout: 60000,
    challenge,
  });
  const stored = await createChallenge({
    accountId: null,
    purpose: 'discoverable_authentication',
    sessionBinding: req.sessionID ?? 'anonymous',
    userId: null,
    value: options.challenge,
  });

  res.json({
    data: { challengeId: stored.id, options, attempt: nextPasskeyAttempt({ retryRequested }) },
    message: 'Passkey authentication options created.',
  });
});

passkeyRouter.post(
  '/authentication/complete',
  validateRequest({ body: authenticationCompleteSchema }),
  async (req, res) => {
    const body = getValidated<{ body: typeof authenticationCompleteSchema }>(req).body!;
    const pending = await db
      .select()
      .from(accountWebAuthnChallenges)
      .where(eq(accountWebAuthnChallenges.id, body.challengeId))
      .limit(1);
    const challenge = pending[0];

    if (
      !challenge ||
      !['discoverable_authentication', 'restricted_authentication'].includes(challenge.purpose) ||
      (challenge.purpose === 'restricted_authentication' &&
        (!req.session?.restrictedAuth ||
          req.session.restrictedAuth.flowId !== challenge.flowId ||
          req.session.restrictedAuth.selectedAccountId !== challenge.accountId))
    ) {
      failure('challenge_mismatch', 400);
    }

    const challengeValue = decodeChallengeFromResponse(body.response);

    await consumeChallenge({
      id: body.challengeId,
      purpose: challenge.purpose as ChallengePurpose,
      sessionBinding: challenge.sessionBinding,
      value: challengeValue,
    });
    const [credential] = await db
      .select()
      .from(accountPasskeyCredentials)
      .where(eq(accountPasskeyCredentials.credentialId, body.response.id))
      .limit(1);

    if (!credential || (credential.status !== 'active' && credential.status !== 'pending'))
      failure('credential_not_found', 401);
    if (challenge.credentialId && challenge.credentialId !== credential.credentialId)
      failure('credential_not_found', 401);
    if (challenge.purpose === 'restricted_authentication' && credential.status !== 'pending')
      failure('credential_not_found', 401);
    if (credential.revokedAt) failure('credential_revoked', 401);
    let verified;

    try {
      verified = await verifyAuthenticationResponse({
        response: body.response as never,
        expectedChallenge: (candidate) => hashChallenge(candidate) === challenge.challengeHash,
        expectedOrigin: challenge.origin,
        expectedRPID: challenge.rpId,
        requireUserVerification: true,
        credential: {
          id: credential.credentialId,
          publicKey: Buffer.from(credential.publicKey, 'base64url'),
          counter: credential.signCount,
        } satisfies WebAuthnCredential,
      });
    } catch {
      failure('platform_error', 401);
    }
    if (!verified.verified) failure('platform_error', 401);
    const counter = nextPasskeyCounter({
      backupEligible: credential.backupEligible,
      receivedSignCount: verified.authenticationInfo.newCounter,
      storedSignCount: credential.signCount,
    });

    if (!counter.ok) {
      failure(counter.failure, 401);
    }

    const now = new Date();

    await db
      .update(accountPasskeyCredentials)
      .set({
        activatedAt: challenge.purpose === 'restricted_authentication' ? now : credential.activatedAt,
        lastUsedAt: now,
        signCount: counter.value,
        status: challenge.purpose === 'restricted_authentication' ? 'active' : credential.status,
        updatedAt: now,
      })
      .where(eq(accountPasskeyCredentials.id, credential.id));
    const user = await findUserById(credential.userId);

    if (!user) failure('credential_not_found', 401);
    const wasAuthenticated = req.isAuthenticated() && req.user?.id === user.id;
    const authUser = await loginPasskey(req, user, credential.accountId, credential.credentialId);

    if (wasAuthenticated) req.session.passkeySecurityReauthenticatedAt = Date.now();

    res.cookie(SESSION_HINT_COOKIE, '1', sessionHintCookieOptions());
    res.json({ data: { authenticated: true, user: authUser }, message: 'Passkey authentication complete.' });
  },
);

passkeyRouter.use('/credentials', authed());
passkeyRouter.get('/credentials', async (req, res) => {
  const user = authedRequest(req).user;
  const values = await db
    .select()
    .from(accountPasskeyCredentials)
    .where(and(eq(accountPasskeyCredentials.accountId, user.accountId), eq(accountPasskeyCredentials.userId, user.id)));

  res.json({
    data: { credentials: values.filter((value) => !value.revokedAt).map(credentialView) },
    message: 'Passkeys retrieved.',
  });
});
passkeyRouter.patch(
  '/credentials/:credentialId',
  validateRequest({ params: credentialIdPathSchema, body: credentialMutationSchema }),
  async (req, res) => {
    const user = authedRequest(req).user;
    const credentialId = pathCredentialId(req);
    const body = getValidated<{ body: typeof credentialMutationSchema }>(req).body!;

    requireFreshSecurityReauthentication(req);
    if ('label' in body) {
      const [conflict] = await db
        .select({ id: accountPasskeyCredentials.id })
        .from(accountPasskeyCredentials)
        .where(
          and(
            eq(accountPasskeyCredentials.accountId, user.accountId),
            eq(accountPasskeyCredentials.label, body.label),
            ne(accountPasskeyCredentials.credentialId, credentialId),
            isNull(accountPasskeyCredentials.revokedAt),
          ),
        )
        .limit(1);

      if (conflict) failure('credential_name_conflict', 409, 'Choose a different passkey name.');
      const [value] = await db
        .update(accountPasskeyCredentials)
        .set({ label: body.label, updatedAt: new Date() })
        .where(
          and(
            eq(accountPasskeyCredentials.accountId, user.accountId),
            eq(accountPasskeyCredentials.userId, user.id),
            eq(accountPasskeyCredentials.credentialId, credentialId),
            isNull(accountPasskeyCredentials.revokedAt),
          ),
        )
        .returning();

      if (!value) failure('credential_not_found', 404);
      delete req.session?.passkeySecurityReauthenticatedAt;
      res.json({ data: credentialView(value), message: 'Passkey renamed.' });

      return;
    }
    const revoked = await revokeCredential(req, credentialId);

    if (revoked) {
      res.json({ data: credentialView(revoked), message: 'Passkey revoked.' });
    } else {
      res.status(204).send();
    }
  },
);
passkeyRouter.delete(
  '/credentials/:credentialId',
  validateRequest({ params: credentialIdPathSchema }),
  async (req, res) => {
    requireFreshSecurityReauthentication(req);
    await revokeCredential(req, pathCredentialId(req));
    res.status(204).send();
  },
);

function pathCredentialId(req: Parameters<typeof authedRequest>[0]): string {
  const value = req.params.credentialId;

  return typeof value === 'string' ? value : (value[0] ?? '');
}

async function revokeCredential(
  req: Parameters<typeof authedRequest>[0],
  credentialId: string,
): Promise<typeof accountPasskeyCredentials.$inferSelect | null> {
  const user = authedRequest(req).user;
  const active = await db
    .select()
    .from(accountPasskeyCredentials)
    .where(
      and(
        eq(accountPasskeyCredentials.accountId, user.accountId),
        eq(accountPasskeyCredentials.userId, user.id),
        eq(accountPasskeyCredentials.credentialId, credentialId),
        isNull(accountPasskeyCredentials.revokedAt),
      ),
    )
    .limit(1);

  if (!active.length) return null;
  const activeCredentials = await db
    .select({ id: accountPasskeyCredentials.id })
    .from(accountPasskeyCredentials)
    .where(
      and(
        eq(accountPasskeyCredentials.accountId, user.accountId),
        eq(accountPasskeyCredentials.userId, user.id),
        isNull(accountPasskeyCredentials.revokedAt),
      ),
    );

  if (activeCredentials.length <= 1)
    failure('last_passkey', 409, 'Keep another active passkey before revoking this credential.');
  await db
    .update(accountPasskeyCredentials)
    .set({ revokedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(accountPasskeyCredentials.accountId, user.accountId),
        eq(accountPasskeyCredentials.userId, user.id),
        eq(accountPasskeyCredentials.credentialId, credentialId),
        isNull(accountPasskeyCredentials.revokedAt),
      ),
    );
  delete req.session?.passkeySecurityReauthenticatedAt;

  return { ...active[0], revokedAt: new Date(), updatedAt: new Date() };
}

export { PASSKEY_ACCOUNT_UNAVAILABLE, passkeyOpenApiPaths, passkeyRouter };
