import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

import { and, asc, eq, gt, isNull, lt, sql } from 'drizzle-orm';

import { env } from '../shared/env';

import { generateVerificationPin } from './auth-crypto';
import { sendVerificationMessage } from './auth-mail';
import type { AuthUser } from './auth-schemas';

import { accountMemberships, accounts, authEmailChallenges, db, HttpError, users } from 'shared';

const OTP_PURPOSE = 'bootstrap_recovery' as const;
const MAX_CHALLENGE_ATTEMPTS = 5;
let failNextJitTransactionForTest = false;

type EmailOtpDelivery = {
  flowId: string;
  resendAvailableAt: string;
};

type RestrictedIdentity = {
  accounts: Array<{ accountId: string; name: string; role: string }>;
  email: string;
  userId: string;
};

export function normalizeEmail(email: string): string {
  return email.normalize('NFKC').trim().toLowerCase();
}

export function normalizeAccountSlug(email: string): string {
  const base = normalizeEmail(email)
    .split('@')[0]
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);

  return base || 'account';
}

export function clientContextHash(ip: string | undefined, userAgent: string | undefined): string {
  return createHmac('sha256', env.SESSION_SECRET)
    .update(`${ip ?? 'unknown'}\u0000${userAgent ?? 'unknown'}`)
    .digest('hex');
}

export function induceNextJitTransactionFailureForTest(): void {
  if (!env.ENABLE_TEST_API) throw new Error('The JIT failure hook is available only through the test API.');
  failNextJitTransactionForTest = true;
}

function hashPin(flowId: string, normalizedEmail: string, contextHash: string, pin: string): string {
  return createHmac('sha256', env.SESSION_SECRET)
    .update(`${flowId}\u0000${normalizedEmail}\u0000${contextHash}\u0000${pin}`)
    .digest('hex');
}

function pinMatches(expectedHash: string, actualHash: string): boolean {
  const expected = Buffer.from(expectedHash, 'hex');
  const actual = Buffer.from(actualHash, 'hex');

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function genericVerificationFailure(): never {
  throw new HttpError({
    code: 'verification_failed',
    message: 'The verification request could not be completed.',
    statusCode: 401,
  });
}

export async function findUserByEmail(email: string) {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizeEmail(email)))
    .limit(1);

  return user;
}

export async function findUserById(id: string) {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);

  return user;
}

export async function getPrimaryMembership(userId: string) {
  const [membership] = await db
    .select()
    .from(accountMemberships)
    .where(eq(accountMemberships.userId, userId))
    .orderBy(asc(accountMemberships.createdAt))
    .limit(1);

  return membership;
}

export async function resolveAuthUser(user: typeof users.$inferSelect): Promise<AuthUser> {
  const membership = await getPrimaryMembership(user.id);

  if (!membership) {
    throw new HttpError({
      code: 'account_membership_missing',
      message: 'The account membership could not be found.',
      statusCode: 500,
    });
  }

  return {
    accountId: membership.accountId,
    email: user.email,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    id: user.id,
    role: membership.role,
  };
}

export async function resolveAuthUserForAccount(user: typeof users.$inferSelect, accountId: string): Promise<AuthUser> {
  const [membership] = await db
    .select()
    .from(accountMemberships)
    .where(and(eq(accountMemberships.userId, user.id), eq(accountMemberships.accountId, accountId)))
    .limit(1);

  if (!membership) {
    throw new HttpError({
      code: 'account_membership_missing',
      message: 'The account membership could not be found.',
      statusCode: 500,
    });
  }

  return {
    accountId,
    email: user.email,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    id: user.id,
    role: membership.role,
  };
}

// AUTH-PWL-005 replaces the legacy pre-OTP registration ceremony. Until then,
// fail closed rather than recreating identity rows before server OTP verification.
export async function createPasskeyEnrollment(
  _email: string,
  _label: string,
  _existingUser?: typeof users.$inferSelect,
): Promise<{
  enrollmentId: string;
  membership: typeof accountMemberships.$inferSelect;
  user: typeof users.$inferSelect;
  verificationChallengeId: string;
}> {
  throw new HttpError({
    code: 'restricted_session_required',
    message: 'Verify an email code before registering a passkey.',
    statusCode: 401,
  });
}

async function deliverChallenge(
  flowId: string,
  normalizedEmail: string,
  contextHash: string,
): Promise<EmailOtpDelivery> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + env.PIN_EXPIRY_MINUTES * 60_000);
  const resendAvailableAt = new Date(now.getTime() + env.PIN_RESEND_COOLDOWN_SECONDS * 1_000);
  const pin = generateVerificationPin();
  const challengeId = randomUUID();

  await db.transaction(async (tx) => {
    await tx
      .update(authEmailChallenges)
      .set({ supersededAt: now, updatedAt: now })
      .where(
        and(
          eq(authEmailChallenges.flowId, flowId),
          isNull(authEmailChallenges.consumedAt),
          isNull(authEmailChallenges.supersededAt),
        ),
      );
    await tx.insert(authEmailChallenges).values({
      attemptCount: 0,
      clientContextHash: contextHash,
      createdAt: now,
      expiresAt,
      flowId,
      id: challengeId,
      lastSentAt: now,
      normalizedEmail,
      pinHash: hashPin(flowId, normalizedEmail, contextHash, pin),
      purpose: OTP_PURPOSE,
      updatedAt: now,
    });
  });

  try {
    await sendVerificationMessage({
      challengeId,
      email: normalizedEmail,
      expiresAt,
      flowId,
      pin,
      purpose: OTP_PURPOSE,
    });
  } catch {
    // Delivery failures are intentionally hidden from the public response.
  }

  return { flowId, resendAvailableAt: resendAvailableAt.toISOString() };
}

export async function requestEmailOtp(email: string, contextHash: string): Promise<EmailOtpDelivery> {
  return deliverChallenge(randomUUID(), normalizeEmail(email), contextHash);
}

export async function resendEmailOtp(flowId: string, contextHash: string): Promise<EmailOtpDelivery> {
  const [challenge] = await db
    .select()
    .from(authEmailChallenges)
    .where(
      and(
        eq(authEmailChallenges.flowId, flowId),
        isNull(authEmailChallenges.consumedAt),
        isNull(authEmailChallenges.supersededAt),
      ),
    )
    .limit(1);
  const now = Date.now();
  const genericResult = {
    flowId,
    resendAvailableAt: new Date(now + env.PIN_RESEND_COOLDOWN_SECONDS * 1_000).toISOString(),
  };

  if (!challenge || challenge.clientContextHash !== contextHash) return genericResult;

  const nextAllowedAt = challenge.lastSentAt.getTime() + env.PIN_RESEND_COOLDOWN_SECONDS * 1_000;

  if (now < nextAllowedAt) {
    throw new HttpError({
      code: 'rate_limited',
      message: 'Wait before requesting another verification code.',
      statusCode: 429,
    });
  }

  return deliverChallenge(flowId, challenge.normalizedEmail, contextHash);
}

export async function verifyEmailOtp(flowId: string, pin: string, contextHash: string): Promise<RestrictedIdentity> {
  const [challenge] = await db
    .select()
    .from(authEmailChallenges)
    .where(
      and(
        eq(authEmailChallenges.flowId, flowId),
        isNull(authEmailChallenges.consumedAt),
        isNull(authEmailChallenges.supersededAt),
      ),
    )
    .limit(1);

  if (
    !challenge ||
    challenge.clientContextHash !== contextHash ||
    challenge.expiresAt <= new Date() ||
    challenge.attemptCount >= MAX_CHALLENGE_ATTEMPTS
  ) {
    genericVerificationFailure();
  }

  const submittedHash = hashPin(flowId, challenge.normalizedEmail, contextHash, pin);

  if (!pinMatches(challenge.pinHash, submittedHash)) {
    const now = new Date();

    await db
      .update(authEmailChallenges)
      .set({
        attemptCount: sql`${authEmailChallenges.attemptCount} + 1`,
        consumedAt: sql`CASE WHEN ${authEmailChallenges.attemptCount} + 1 >= ${MAX_CHALLENGE_ATTEMPTS} THEN ${now} ELSE ${authEmailChallenges.consumedAt} END`,
        updatedAt: now,
      })
      .where(
        and(
          eq(authEmailChallenges.id, challenge.id),
          isNull(authEmailChallenges.consumedAt),
          isNull(authEmailChallenges.supersededAt),
          lt(authEmailChallenges.attemptCount, MAX_CHALLENGE_ATTEMPTS),
        ),
      );
    genericVerificationFailure();
  }

  const identity = await db.transaction(async (tx) => {
    const now = new Date();
    const [consumed] = await tx
      .update(authEmailChallenges)
      .set({ consumedAt: now, updatedAt: now })
      .where(
        and(
          eq(authEmailChallenges.id, challenge.id),
          eq(authEmailChallenges.clientContextHash, contextHash),
          isNull(authEmailChallenges.consumedAt),
          isNull(authEmailChallenges.supersededAt),
          gt(authEmailChallenges.expiresAt, now),
          lt(authEmailChallenges.attemptCount, MAX_CHALLENGE_ATTEMPTS),
        ),
      )
      .returning();

    if (!consumed) return null;

    const [createdUser] = await tx
      .insert(users)
      .values({
        createdAt: now,
        email: challenge.normalizedEmail,
        emailVerifiedAt: now,
        id: randomUUID(),
        updatedAt: now,
      })
      .onConflictDoNothing({ target: users.email })
      .returning();
    const [user] = createdUser
      ? [createdUser]
      : await tx.select().from(users).where(eq(users.email, challenge.normalizedEmail)).limit(1);

    if (!user) throw new Error('Verified email identity could not be resolved.');

    if (createdUser) {
      const accountId = randomUUID();

      await tx.insert(accounts).values({
        createdAt: now,
        id: accountId,
        name: challenge.normalizedEmail.split('@')[0] || 'Personal account',
        ownerUserId: user.id,
        slug: `${normalizeAccountSlug(challenge.normalizedEmail)}-${accountId.slice(0, 8)}`,
        updatedAt: now,
      });
      await tx.insert(accountMemberships).values({
        accountId,
        createdAt: now,
        id: randomUUID(),
        role: 'owner',
        updatedAt: now,
        userId: user.id,
      });
      if (failNextJitTransactionForTest) {
        failNextJitTransactionForTest = false;
        throw new Error('Induced JIT transaction failure.');
      }
    }

    const memberships = await tx
      .select({ accountId: accountMemberships.accountId, name: accounts.name, role: accountMemberships.role })
      .from(accountMemberships)
      .innerJoin(accounts, eq(accounts.id, accountMemberships.accountId))
      .where(eq(accountMemberships.userId, user.id))
      .orderBy(asc(accountMemberships.createdAt));

    if (!memberships.length) throw new Error('Verified email identity has no account membership.');

    return { accounts: memberships, email: user.email, userId: user.id };
  });

  if (!identity) genericVerificationFailure();

  return identity;
}
