import { randomUUID } from 'node:crypto';

import { and, asc, desc, eq, gt, isNull } from 'drizzle-orm';
import type { z } from 'zod';

import { env } from '../shared/env';

import { generateUserDeviceToken, generateVerificationPin, hashSecret, verifySecret } from './auth-crypto';
import { sendVerificationMessage } from './auth-mail';
import { authUserSchema, challengeSchema } from './auth-schemas';

import { accountMemberships, accounts, authVerificationChallenges, db, HttpError, userDevices, users } from 'shared';

type VerificationPurpose = z.infer<typeof challengeSchema>['purpose'];
type AuthUser = z.infer<typeof authUserSchema>;
type AuthChallengePayload = z.infer<typeof challengeSchema>;

const MAX_CHALLENGE_ATTEMPTS = 5;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function normalizeAccountSlug(email: string) {
  return normalizeEmail(email)
    .split('@')[0]
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
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

export async function getLatestChallengeForUser(userId: string, purpose: VerificationPurpose) {
  const [challenge] = await db
    .select()
    .from(authVerificationChallenges)
    .where(
      and(
        eq(authVerificationChallenges.userId, userId),
        eq(authVerificationChallenges.purpose, purpose),
        isNull(authVerificationChallenges.consumedAt),
        gt(authVerificationChallenges.expiresAt, new Date()),
      ),
    )
    .orderBy(desc(authVerificationChallenges.createdAt))
    .limit(1);

  return challenge;
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

export async function createChallenge(
  user: typeof users.$inferSelect,
  purpose: VerificationPurpose,
): Promise<AuthChallengePayload> {
  const pin = generateVerificationPin();

  const now = new Date();

  const expiresAt = new Date(now.getTime() + env.PIN_EXPIRY_MINUTES * 60 * 1000);

  const challengeId = randomUUID();

  await db
    .update(authVerificationChallenges)
    .set({
      consumedAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(authVerificationChallenges.userId, user.id),
        eq(authVerificationChallenges.purpose, purpose),
        isNull(authVerificationChallenges.consumedAt),
      ),
    );

  await db.insert(authVerificationChallenges).values({
    attemptCount: 0,
    createdAt: now,
    expiresAt,
    id: challengeId,
    lastSentAt: now,
    pinHash: await hashSecret(pin),
    purpose,
    updatedAt: now,
    userId: user.id,
  });

  await sendVerificationMessage({
    challengeId,
    email: user.email,
    expiresAt,
    pin,
    purpose,
  });

  return {
    challengeId,
    email: user.email,
    expiresAt: expiresAt.toISOString(),
    purpose,
  };
}

export async function getOrCreateActiveChallenge(user: typeof users.$inferSelect, purpose: VerificationPurpose) {
  const challenge = await getLatestChallengeForUser(user.id, purpose);

  if (challenge) {
    return {
      challengeId: challenge.id,
      email: user.email,
      expiresAt: challenge.expiresAt.toISOString(),
      purpose: challenge.purpose as VerificationPurpose,
    };
  }

  return createChallenge(user, purpose);
}

export async function createUserDevice(userId: string) {
  const token = generateUserDeviceToken();
  const now = new Date();

  await db.insert(userDevices).values({
    createdAt: now,
    expiresAt: new Date(now.getTime() + env.REMEMBERED_DEVICE_MAX_AGE_MS),
    id: randomUUID(),
    tokenHash: await hashSecret(token),
    updatedAt: now,
    userId,
  });

  return token;
}

export async function isRememberedDevice(userId: string, token: string | undefined) {
  if (!token) {
    return false;
  }

  const devices = await db
    .select()
    .from(userDevices)
    .where(and(eq(userDevices.userId, userId), gt(userDevices.expiresAt, new Date())));

  for (const device of devices) {
    if (await verifySecret(token, device.tokenHash)) {
      await db
        .update(userDevices)
        .set({
          lastUsedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(userDevices.id, device.id));

      return true;
    }
  }

  return false;
}

export async function beginSignIn(user: typeof users.$inferSelect, rememberedDeviceToken?: string) {
  if (!user.emailVerifiedAt) {
    return getOrCreateActiveChallenge(user, 'sign_up');
  }

  const rememberDevice = await isRememberedDevice(user.id, rememberedDeviceToken);

  if (rememberDevice) {
    return null;
  }

  return getOrCreateActiveChallenge(user, 'sign_in');
}

export async function signUp(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);

  const existingUser = await findUserByEmail(normalizedEmail);

  if (existingUser) {
    throw new HttpError({
      code: 'email_already_registered',
      message: 'An account already exists for this email address.',
      statusCode: 409,
    });
  }

  const now = new Date();

  const [user] = await db
    .insert(users)
    .values({
      createdAt: now,
      email: normalizedEmail,
      id: randomUUID(),
      passwordHash: await hashSecret(password),
      updatedAt: now,
    })
    .returning();

  const accountId = randomUUID();

  const baseSlug = normalizeAccountSlug(normalizedEmail);

  const [existingAccount] = await db.select().from(accounts).where(eq(accounts.slug, baseSlug)).limit(1);

  const accountSlug = existingAccount ? `${baseSlug}-${user.id.slice(0, 8)}` : baseSlug;

  await db.insert(accounts).values({
    createdAt: now,
    id: accountId,
    name: normalizedEmail.split('@')[0],
    ownerUserId: user.id,
    slug: accountSlug,
    updatedAt: now,
  });

  await db.insert(accountMemberships).values({
    accountId,
    createdAt: now,
    id: randomUUID(),
    role: 'owner',
    updatedAt: now,
    userId: user.id,
  });

  return createChallenge(user, 'sign_up');
}

export async function resendChallenge(challengeId: string) {
  const [challenge] = await db
    .select()
    .from(authVerificationChallenges)
    .where(eq(authVerificationChallenges.id, challengeId))
    .limit(1);

  if (!challenge) {
    throw new HttpError({
      code: 'challenge_not_found',
      message: 'The verification request could not be found.',
      statusCode: 404,
    });
  }

  if (challenge.consumedAt) {
    throw new HttpError({
      code: 'challenge_consumed',
      message: 'This verification request has already been completed.',
      statusCode: 409,
    });
  }

  const nextAllowedAt = challenge.lastSentAt.getTime() + env.PIN_RESEND_COOLDOWN_SECONDS * 1000;

  if (Date.now() < nextAllowedAt) {
    throw new HttpError({
      code: 'challenge_cooldown',
      message: 'Wait before requesting another verification code.',
      statusCode: 429,
    });
  }

  const user = await findUserById(challenge.userId);

  if (!user) {
    throw new HttpError({
      code: 'user_not_found',
      message: 'The verification request is no longer valid.',
      statusCode: 404,
    });
  }

  return createChallenge(user, challenge.purpose as VerificationPurpose);
}

export async function verifyChallenge(challengeId: string, pin: string, purpose: VerificationPurpose) {
  const [challenge] = await db
    .select()
    .from(authVerificationChallenges)
    .where(eq(authVerificationChallenges.id, challengeId))
    .limit(1);

  if (!challenge || challenge.purpose !== purpose) {
    throw new HttpError({
      code: 'challenge_not_found',
      message: 'The verification request could not be found.',
      statusCode: 404,
    });
  }

  if (challenge.consumedAt) {
    throw new HttpError({
      code: 'challenge_consumed',
      message: 'This verification request has already been completed.',
      statusCode: 409,
    });
  }

  if (challenge.expiresAt <= new Date()) {
    throw new HttpError({
      code: 'challenge_expired',
      message: 'This verification code has expired.',
      statusCode: 410,
    });
  }

  if (challenge.attemptCount >= MAX_CHALLENGE_ATTEMPTS) {
    throw new HttpError({
      code: 'challenge_attempt_limit',
      message: 'Too many invalid verification attempts.',
      statusCode: 429,
    });
  }

  const isValid = await verifySecret(pin, challenge.pinHash);

  if (!isValid) {
    await db
      .update(authVerificationChallenges)
      .set({
        attemptCount: challenge.attemptCount + 1,
        updatedAt: new Date(),
      })
      .where(eq(authVerificationChallenges.id, challenge.id));

    throw new HttpError({
      code: 'invalid_verification_code',
      message: 'The verification code is invalid.',
      statusCode: 401,
    });
  }

  const [user] = await db.select().from(users).where(eq(users.id, challenge.userId)).limit(1);

  if (!user) {
    throw new HttpError({
      code: 'user_not_found',
      message: 'The account could not be found.',
      statusCode: 404,
    });
  }

  const now = new Date();

  await db
    .update(authVerificationChallenges)
    .set({
      consumedAt: now,
      updatedAt: now,
    })
    .where(eq(authVerificationChallenges.id, challenge.id));

  let nextUser = user;

  if (purpose === 'sign_up' && !user.emailVerifiedAt) {
    const [updatedUser] = await db
      .update(users)
      .set({
        emailVerifiedAt: now,
        updatedAt: now,
      })
      .where(eq(users.id, user.id))
      .returning();

    nextUser = updatedUser;
  }

  return resolveAuthUser(nextUser);
}

export async function verifyPassword(email: string, password: string) {
  const user = await findUserByEmail(email);

  if (!user) {
    return null;
  }

  const matches = await verifySecret(password, user.passwordHash);

  return matches ? user : null;
}

export async function requestPasswordReset(email: string) {
  const user = await findUserByEmail(email);

  if (!user || !user.emailVerifiedAt) {
    return;
  }

  await createChallenge(user, 'sign_in');
}
