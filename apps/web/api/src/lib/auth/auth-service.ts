import { randomUUID } from 'node:crypto';

import { and, desc, eq, gt, isNull } from 'drizzle-orm';

import type { AuthConfig } from '../config/auth-config.js';
import { getDb } from '../db/client.js';
import { authVerificationChallenges, users } from '../db/schema.js';

import { generateVerificationPin, hashSecret, verifySecret } from './auth-crypto.js';
import { AuthError } from './auth-errors.js';
import { sendVerificationMessage } from './auth-mail.js';
import type { AuthChallengePayload, AuthUser, VerificationPurpose } from './auth-types.js';

const MAX_CHALLENGE_ATTEMPTS = 5;

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const mapUser = (user: typeof users.$inferSelect): AuthUser => ({
  email: user.email,
  emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
  id: user.id,
});

const createAuthService = (config: AuthConfig) => {
  const db = getDb(config);

  const findUserByEmail = async (email: string) => {
    const [user] = await db.select().from(users).where(eq(users.email, normalizeEmail(email))).limit(1);

    return user;
  };

  const findUserById = async (id: string) => {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);

    return user;
  };

  const verifyPassword = async (email: string, password: string) => {
    const user = await findUserByEmail(email);

    if (!user) {
      return null;
    }

    const matches = await verifySecret(password, user.passwordHash);

    return matches ? user : null;
  };

  const createChallenge = async (user: typeof users.$inferSelect, purpose: VerificationPurpose): Promise<AuthChallengePayload> => {
    const pin = generateVerificationPin();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + config.pinExpiryMinutes * 60 * 1000);
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

    await sendVerificationMessage(config, {
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
  };

  const signUp = async (email: string, password: string) => {
    const normalizedEmail = normalizeEmail(email);
    const existingUser = await findUserByEmail(normalizedEmail);

    if (existingUser) {
      throw new AuthError(409, 'email_already_registered', 'An account already exists for this email address.');
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

    return createChallenge(user, 'sign_up');
  };

  const beginSignIn = async (user: typeof users.$inferSelect) => {
    if (!user.emailVerifiedAt) {
      throw new AuthError(403, 'email_not_verified', 'Verify your email before signing in.');
    }

    return createChallenge(user, 'sign_in');
  };

  const resendChallenge = async (challengeId: string) => {
    const [challenge] = await db
      .select()
      .from(authVerificationChallenges)
      .where(eq(authVerificationChallenges.id, challengeId))
      .limit(1);

    if (!challenge) {
      throw new AuthError(404, 'challenge_not_found', 'The verification request could not be found.');
    }

    if (challenge.consumedAt) {
      throw new AuthError(409, 'challenge_consumed', 'This verification request has already been completed.');
    }

    const nextAllowedAt = challenge.lastSentAt.getTime() + config.pinResendCooldownSeconds * 1000;

    if (Date.now() < nextAllowedAt) {
      throw new AuthError(429, 'challenge_cooldown', 'Wait before requesting another verification code.');
    }

    const user = await findUserById(challenge.userId);

    if (!user) {
      throw new AuthError(404, 'user_not_found', 'The verification request is no longer valid.');
    }

    return createChallenge(user, challenge.purpose as VerificationPurpose);
  };

  const verifyChallenge = async (challengeId: string, pin: string, purpose: VerificationPurpose) => {
    const [challenge] = await db
      .select()
      .from(authVerificationChallenges)
      .where(eq(authVerificationChallenges.id, challengeId))
      .limit(1);

    if (!challenge || challenge.purpose !== purpose) {
      throw new AuthError(404, 'challenge_not_found', 'The verification request could not be found.');
    }

    if (challenge.consumedAt) {
      throw new AuthError(409, 'challenge_consumed', 'This verification request has already been completed.');
    }

    if (challenge.expiresAt <= new Date()) {
      throw new AuthError(410, 'challenge_expired', 'This verification code has expired.');
    }

    if (challenge.attemptCount >= MAX_CHALLENGE_ATTEMPTS) {
      throw new AuthError(429, 'challenge_attempt_limit', 'Too many invalid verification attempts.');
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

      throw new AuthError(401, 'invalid_verification_code', 'The verification code is invalid.');
    }

    const [user] = await db.select().from(users).where(eq(users.id, challenge.userId)).limit(1);

    if (!user) {
      throw new AuthError(404, 'user_not_found', 'The account could not be found.');
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

    return mapUser(nextUser);
  };

  const getLatestChallengeForUser = async (userId: string, purpose: VerificationPurpose) => {
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
  };

  return {
    beginSignIn,
    findUserByEmail,
    findUserById,
    getLatestChallengeForUser,
    resendChallenge,
    signUp,
    verifyChallenge,
    verifyPassword,
  };
};

export { createAuthService, normalizeEmail };
