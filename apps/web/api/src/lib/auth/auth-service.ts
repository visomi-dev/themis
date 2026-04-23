import { randomUUID } from 'node:crypto';

import { and, asc, desc, eq, gt, isNull } from 'drizzle-orm';

import type { AuthConfig } from '../config/auth-config';
import { getDb } from '../db/client';
import { accountMemberships, accounts, authVerificationChallenges, users } from '../db/schema';

import { generateVerificationPin, hashSecret, verifySecret } from './auth-crypto';
import { AuthError } from './auth-errors';
import { sendVerificationMessage } from './auth-mail';
import type { AuthChallengePayload, AuthUser, VerificationPurpose } from './auth-types';

const MAX_CHALLENGE_ATTEMPTS = 5;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeAccountSlug(email: string) {
  return normalizeEmail(email)
    .split('@')[0]
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

class AuthService {
  private config?: AuthConfig;

  configure(config: AuthConfig) {
    this.config = config;

    return this;
  }

  async beginSignIn(user: typeof users.$inferSelect) {
    if (!user.emailVerifiedAt) {
      return this.getOrCreateActiveChallenge(user, 'sign_up');
    }

    return this.createChallenge(user, 'sign_in');
  }

  async findUserByEmail(email: string) {
    const [user] = await this.getDb()
      .select()
      .from(users)
      .where(eq(users.email, normalizeEmail(email)))
      .limit(1);

    return user;
  }

  async findUserById(id: string) {
    const [user] = await this.getDb().select().from(users).where(eq(users.id, id)).limit(1);

    return user;
  }

  async getLatestChallengeForUser(userId: string, purpose: VerificationPurpose) {
    const [challenge] = await this.getDb()
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

  async getPrimaryMembership(userId: string) {
    const [membership] = await this.getDb()
      .select()
      .from(accountMemberships)
      .where(eq(accountMemberships.userId, userId))
      .orderBy(asc(accountMemberships.createdAt))
      .limit(1);

    return membership;
  }

  async requestPasswordReset(email: string) {
    const user = await this.findUserByEmail(email);

    if (!user || !user.emailVerifiedAt) {
      return;
    }

    await this.createChallenge(user, 'sign_in');
  }

  async resendChallenge(challengeId: string) {
    const [challenge] = await this.getDb()
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

    const nextAllowedAt = challenge.lastSentAt.getTime() + this.getConfig().pinResendCooldownSeconds * 1000;

    if (Date.now() < nextAllowedAt) {
      throw new AuthError(429, 'challenge_cooldown', 'Wait before requesting another verification code.');
    }

    const user = await this.findUserById(challenge.userId);

    if (!user) {
      throw new AuthError(404, 'user_not_found', 'The verification request is no longer valid.');
    }

    return this.createChallenge(user, challenge.purpose as VerificationPurpose);
  }

  async resolveAuthUser(user: typeof users.$inferSelect): Promise<AuthUser> {
    const membership = await this.getPrimaryMembership(user.id);

    if (!membership) {
      throw new AuthError(500, 'account_membership_missing', 'The account membership could not be found.');
    }

    return {
      accountId: membership.accountId,
      email: user.email,
      emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
      id: user.id,
      role: membership.role,
    };
  }

  async signUp(email: string, password: string) {
    const normalizedEmail = normalizeEmail(email);
    const existingUser = await this.findUserByEmail(normalizedEmail);

    if (existingUser) {
      throw new AuthError(409, 'email_already_registered', 'An account already exists for this email address.');
    }

    const now = new Date();
    const [user] = await this.getDb()
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
    const [existingAccount] = await this.getDb().select().from(accounts).where(eq(accounts.slug, baseSlug)).limit(1);
    const accountSlug = existingAccount ? `${baseSlug}-${user.id.slice(0, 8)}` : baseSlug;

    await this.getDb()
      .insert(accounts)
      .values({
        createdAt: now,
        id: accountId,
        name: normalizedEmail.split('@')[0],
        ownerUserId: user.id,
        slug: accountSlug,
        updatedAt: now,
      });

    await this.getDb().insert(accountMemberships).values({
      accountId,
      createdAt: now,
      id: randomUUID(),
      role: 'owner',
      updatedAt: now,
      userId: user.id,
    });

    return this.createChallenge(user, 'sign_up');
  }

  async verifyChallenge(challengeId: string, pin: string, purpose: VerificationPurpose) {
    const [challenge] = await this.getDb()
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
      await this.getDb()
        .update(authVerificationChallenges)
        .set({
          attemptCount: challenge.attemptCount + 1,
          updatedAt: new Date(),
        })
        .where(eq(authVerificationChallenges.id, challenge.id));

      throw new AuthError(401, 'invalid_verification_code', 'The verification code is invalid.');
    }

    const [user] = await this.getDb().select().from(users).where(eq(users.id, challenge.userId)).limit(1);

    if (!user) {
      throw new AuthError(404, 'user_not_found', 'The account could not be found.');
    }

    const now = new Date();

    await this.getDb()
      .update(authVerificationChallenges)
      .set({
        consumedAt: now,
        updatedAt: now,
      })
      .where(eq(authVerificationChallenges.id, challenge.id));

    let nextUser = user;

    if (purpose === 'sign_up' && !user.emailVerifiedAt) {
      const [updatedUser] = await this.getDb()
        .update(users)
        .set({
          emailVerifiedAt: now,
          updatedAt: now,
        })
        .where(eq(users.id, user.id))
        .returning();

      nextUser = updatedUser;
    }

    return this.resolveAuthUser(nextUser);
  }

  async verifyPassword(email: string, password: string) {
    const user = await this.findUserByEmail(email);

    if (!user) {
      return null;
    }

    const matches = await verifySecret(password, user.passwordHash);

    return matches ? user : null;
  }

  private async createChallenge(
    user: typeof users.$inferSelect,
    purpose: VerificationPurpose,
  ): Promise<AuthChallengePayload> {
    const pin = generateVerificationPin();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.getConfig().pinExpiryMinutes * 60 * 1000);
    const challengeId = randomUUID();

    await this.getDb()
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

    await this.getDb()
      .insert(authVerificationChallenges)
      .values({
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

    await sendVerificationMessage(this.getConfig(), {
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

  private getChallengePayload(
    challenge: typeof authVerificationChallenges.$inferSelect,
    user: typeof users.$inferSelect,
  ): AuthChallengePayload {
    return {
      challengeId: challenge.id,
      email: user.email,
      expiresAt: challenge.expiresAt.toISOString(),
      purpose: challenge.purpose as VerificationPurpose,
    };
  }

  private getConfig() {
    if (!this.config) {
      throw new Error('AuthService.configure() must be called before use.');
    }

    return this.config;
  }

  private getDb() {
    return getDb(this.getConfig());
  }

  private async getOrCreateActiveChallenge(user: typeof users.$inferSelect, purpose: VerificationPurpose) {
    const challenge = await this.getLatestChallengeForUser(user.id, purpose);

    if (challenge) {
      return this.getChallengePayload(challenge, user);
    }

    return this.createChallenge(user, purpose);
  }
}

const authService = new AuthService();

export { authService, normalizeEmail };
