import { createHash, randomBytes, randomUUID } from 'node:crypto';

import { and, eq, gt, isNull } from 'drizzle-orm';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type WebAuthnCredential,
} from '@simplewebauthn/server';
import { Router } from 'express';

import { getValidated, validateRequest } from '../shared/http/route-schemas';
import { env } from '../shared/env';

import { authed, authedRequest } from './auth-middleware';
import { findUserByEmail, getPrimaryMembership, resolveAuthUser } from './auth-service';
import {
  authenticationBeginSchema,
  authenticationCompleteSchema,
  passkeyOpenApiPaths,
  registrationBeginSchema,
  registrationCompleteSchema,
} from './passkey-schemas';
import { emailGate, nextPasskeyAttempt } from './passkey-contract';
import { csrfProtection, passkeyRateLimit } from './passkey-security';

import { accountPasskeyCredentials, accountWebAuthnChallenges, db, HttpError, users } from 'shared';

const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const PASSKEY_ACCOUNT_UNAVAILABLE = 'credential_not_found';
const rpId = process.env.WEBAUTHN_RP_ID ?? 'localhost';
const origin = process.env.WEBAUTHN_ORIGIN ?? new URL(env.APP_BASE_URL).origin;

function hashChallenge(challenge: string): string {
  return createHash('sha256').update(challenge).digest('hex');
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
async function requireVerifiedEmail(email: string, pinVerified: boolean) {
  const user = await findUserByEmail(email);

  if (!user) failure(PASSKEY_ACCOUNT_UNAVAILABLE, 404);
  const gate = emailGate(email, user.emailVerifiedAt, pinVerified);

  if (gate === 'email_required') failure('email_required', 400, 'An email address is required.');
  if (gate === 'email_unverified') failure('email_unverified', 403, 'Verify the email address before using a passkey.');
  if (gate === 'pin_required') failure('pin_required', 403, 'Complete email PIN verification before using a passkey.');
  const membership = await getPrimaryMembership(user.id);

  if (!membership) failure('account_membership_missing', 500);

  return { user, membership };
}
async function createChallenge(
  accountId: string,
  userId: string | null,
  purpose: 'registration' | 'authentication',
  value: string,
) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CHALLENGE_TTL_MS);
  const id = randomUUID();

  await db.insert(accountWebAuthnChallenges).values({
    id,
    accountId,
    userId,
    challengeHash: hashChallenge(value),
    purpose,
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
async function consumeChallenge(id: string, value: string, purpose: 'registration' | 'authentication') {
  const now = new Date();
  const [updated] = await db
    .update(accountWebAuthnChallenges)
    .set({ consumedAt: now })
    .where(
      and(
        eq(accountWebAuthnChallenges.id, id),
        eq(accountWebAuthnChallenges.purpose, purpose),
        eq(accountWebAuthnChallenges.challengeHash, hashChallenge(value)),
        isNull(accountWebAuthnChallenges.consumedAt),
        gt(accountWebAuthnChallenges.expiresAt, now),
      ),
    )
    .returning();

  if (updated) return updated;
  const [existing] = await db
    .select()
    .from(accountWebAuthnChallenges)
    .where(eq(accountWebAuthnChallenges.id, id))
    .limit(1);

  if (!existing || existing.purpose !== purpose) failure('challenge_mismatch', 400);
  if (existing.consumedAt) failure('challenge_replayed', 409);
  if (existing.expiresAt <= now) failure('challenge_expired', 410);
  failure('challenge_mismatch', 400);
}
async function loginPasskey(
  req: Parameters<typeof authedRequest>[0],
  user: typeof users.$inferSelect,
  credentialId: string,
) {
  const authUser = await resolveAuthUser(user);
  const authenticatedUser = { ...authUser, authenticationMethod: 'passkey' as const, credentialId };

  await new Promise<void>((resolve, reject) =>
    req.login(authenticatedUser, (error) => (error ? reject(error) : resolve())),
  );

  return authenticatedUser;
}

const passkeyRouter = Router();

passkeyRouter.use(csrfProtection);
passkeyRouter.use(passkeyRateLimit);

passkeyRouter.post('/registration/begin', validateRequest({ body: registrationBeginSchema }), async (req, res) => {
  const { email, label, pinVerified } = getValidated<{ body: typeof registrationBeginSchema }>(req).body!;
  const { user, membership } = await requireVerifiedEmail(email, pinVerified);

  if (!req.isAuthenticated() || req.user.id !== user.id)
    failure('authentication_required', 401, 'Sign in before registering a passkey.');
  const existing = await db
    .select()
    .from(accountPasskeyCredentials)
    .where(
      and(
        eq(accountPasskeyCredentials.accountId, membership.accountId),
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
    authenticatorSelection: { residentKey: 'preferred', userVerification: 'required' },
  });
  const stored = await createChallenge(membership.accountId, user.id, 'registration', options.challenge);

  if (req.session)
    req.session.passkeyRegistration = { challengeId: stored.id, email: user.email, label, pinVerified: true };
  res.json({ data: { challengeId: stored.id, options }, message: 'Passkey registration options created.' });
});

passkeyRouter.post(
  '/registration/complete',
  validateRequest({ body: registrationCompleteSchema }),
  async (req, res) => {
    const body = getValidated<{ body: typeof registrationCompleteSchema }>(req).body!;
    const pending = req.session?.passkeyRegistration;

    if (!pending || pending.challengeId !== body.challengeId) failure('challenge_mismatch', 400);
    const { user, membership } = await requireVerifiedEmail(pending.email, pending.pinVerified);
    const [challenge] = await db
      .select()
      .from(accountWebAuthnChallenges)
      .where(eq(accountWebAuthnChallenges.id, body.challengeId))
      .limit(1);

    if (!challenge) failure('challenge_mismatch', 400);
    let verified;

    try {
      verified = await verifyRegistrationResponse({
        response: body.response as never,
        expectedChallenge: decodeChallengeFromResponse(body.response),
        expectedOrigin: origin,
        expectedRPID: rpId,
        requireUserPresence: true,
        requireUserVerification: true,
      });
    } catch {
      failure('platform_error', 400);
    }
    if (!verified.verified) failure('platform_error', 400);
    await consumeChallenge(body.challengeId, decodeChallengeFromResponse(body.response), 'registration');
    const credential = verified.registrationInfo.credential;
    const value = {
      id: randomUUID(),
      accountId: membership.accountId,
      userId: user.id,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString('base64url'),
      rpId,
      label: pending.label,
      transports: body.response.response.transports ?? [],
      signCount: credential.counter,
      backupEligible: verified.registrationInfo.credentialDeviceType === 'multiDevice',
      backupState: verified.registrationInfo.credentialBackedUp,
      createdAt: new Date(),
      lastUsedAt: null,
      revokedAt: null,
      updatedAt: new Date(),
    };

    await db.insert(accountPasskeyCredentials).values(value);
    delete req.session?.passkeyRegistration;
    res.status(201).json({ data: credentialView(value), message: 'Passkey registered.' });
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
  const { email, explicitPassword, retryRequested, pinVerified } = getValidated<{
    body: typeof authenticationBeginSchema;
  }>(req).body!;
  const { user, membership } = await requireVerifiedEmail(email, pinVerified);

  if (explicitPassword) {
    res.json({
      data: { attempt: 'password_fallback', challengeId: null, options: null },
      message: 'Password fallback selected.',
    });

    return;
  }

  const credentials = await db
    .select()
    .from(accountPasskeyCredentials)
    .where(
      and(
        eq(accountPasskeyCredentials.accountId, membership.accountId),
        eq(accountPasskeyCredentials.userId, user.id),
        isNull(accountPasskeyCredentials.revokedAt),
      ),
    );

  if (!credentials.length) failure(PASSKEY_ACCOUNT_UNAVAILABLE, 404);
  const challenge = randomBytes(32).toString('base64url');
  const options = await generateAuthenticationOptions({
    rpID: rpId,
    userVerification: 'required',
    timeout: 60000,
    challenge,
    allowCredentials: credentials.map((item) => ({ id: item.credentialId, transports: item.transports as never[] })),
  });
  const stored = await createChallenge(membership.accountId, user.id, 'authentication', options.challenge);

  res.json({
    data: { challengeId: stored.id, options, attempt: nextPasskeyAttempt({ explicitPassword, retryRequested }) },
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

    if (!challenge || !challenge.userId) failure('challenge_mismatch', 400);
    const [credential] = await db
      .select()
      .from(accountPasskeyCredentials)
      .where(eq(accountPasskeyCredentials.credentialId, body.response.id))
      .limit(1);

    if (!credential || credential.accountId !== challenge.accountId || credential.userId !== challenge.userId)
      failure('credential_not_found', 401);
    if (credential.revokedAt) failure('credential_revoked', 401);
    let verified;

    try {
      verified = await verifyAuthenticationResponse({
        response: body.response as never,
        expectedChallenge: decodeChallengeFromResponse(body.response),
        expectedOrigin: origin,
        expectedRPID: rpId,
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
    if (verified.authenticationInfo.newCounter < credential.signCount) failure('sign_count_regression', 401);
    await consumeChallenge(body.challengeId, decodeChallengeFromResponse(body.response), 'authentication');
    const now = new Date();

    await db
      .update(accountPasskeyCredentials)
      .set({ signCount: verified.authenticationInfo.newCounter, lastUsedAt: now, updatedAt: now })
      .where(eq(accountPasskeyCredentials.id, credential.id));
    const user = await findUserByEmail(
      (await db.select().from(users).where(eq(users.id, challenge.userId)).limit(1))[0]?.email ?? '',
    );

    if (!user) failure('credential_not_found', 401);
    const authUser = await loginPasskey(req, user, credential.credentialId);

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

  res.json({ data: { credentials: values.map(credentialView) }, message: 'Passkeys retrieved.' });
});
passkeyRouter.patch('/credentials/:credentialId', async (req, res) => {
  const user = authedRequest(req).user;
  const [value] = await db
    .update(accountPasskeyCredentials)
    .set({ revokedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(accountPasskeyCredentials.accountId, user.accountId),
        eq(accountPasskeyCredentials.userId, user.id),
        eq(accountPasskeyCredentials.credentialId, req.params.credentialId),
        isNull(accountPasskeyCredentials.revokedAt),
      ),
    )
    .returning();

  if (!value) failure('credential_not_found', 404);
  res.json({ data: credentialView(value), message: 'Passkey revoked.' });
});
passkeyRouter.delete('/credentials/:credentialId', async (req, res) => {
  const user = authedRequest(req).user;

  const [deleted] = await db
    .delete(accountPasskeyCredentials)
    .where(
      and(
        eq(accountPasskeyCredentials.accountId, user.accountId),
        eq(accountPasskeyCredentials.userId, user.id),
        eq(accountPasskeyCredentials.credentialId, req.params.credentialId),
      ),
    )
    .returning();

  if (!deleted) failure('credential_not_found', 404);

  res.status(204).send();
});

export { PASSKEY_ACCOUNT_UNAVAILABLE, passkeyOpenApiPaths, passkeyRouter };
