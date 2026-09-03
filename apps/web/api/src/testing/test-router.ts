import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { Router } from 'express';

import { clearMailbox, listSentMessages } from '../auth/auth-mail';
import {
  findUserByEmail,
  induceNextJitTransactionFailureForTest,
  normalizeAccountSlug,
  resolveAuthUser,
} from '../auth/auth-service';
import { emailSchema, getValidated, validateRequest, z } from '../shared/http/route-schemas';

import { accountMemberships, accounts, db, users } from 'shared';

const mailboxQuerySchema = z
  .object({
    email: emailSchema.optional(),
    purpose: z.literal('bootstrap_recovery').optional(),
  })
  .meta({ id: 'TestMailboxQuery' });

const mailboxMessageSchema = z
  .object({
    challengeId: z.string(),
    email: emailSchema,
    expiresAt: z.date(),
    flowId: z.uuid(),
    pin: z.string(),
    purpose: z.literal('bootstrap_recovery'),
    sentAt: z.date(),
  })
  .meta({ id: 'MailboxMessage' });

// Unknown legacy fields are stripped so older non-auth E2E helpers can migrate
// independently without keeping a password in this test-only session contract.
const deterministicSessionSchema = z
  .object({ email: emailSchema, accountId: z.string().min(1).optional() })
  .meta({ id: 'DeterministicTestSession' });
const identityQuerySchema = z.object({ email: emailSchema });

const testOpenApiPaths = {
  '/test/mailbox/latest': {
    get: {
      requestParams: { query: mailboxQuerySchema },
      responses: {
        200: {
          content: { 'application/json': { schema: mailboxMessageSchema } },
          description: 'Latest mailbox message.',
        },
      },
    },
  },
  '/test/mailbox': {
    delete: { responses: { 204: { description: 'Mailbox cleared.' } } },
  },
};

const testRouter = Router();

testRouter.post('/auth/induce-jit-failure', function induceJitFailureHandler(_req, res) {
  induceNextJitTransactionFailureForTest();
  res.status(204).send();
});

testRouter.get(
  '/auth/identity',
  validateRequest({ query: identityQuerySchema }),
  async function identityStateHandler(req, res) {
    const { email } = getValidated<{ query: typeof identityQuerySchema }>(req).query!;
    const user = await findUserByEmail(email);

    if (!user) {
      res.send({ users: 0, accounts: 0, memberships: 0 });

      return;
    }

    const memberships = await db.select().from(accountMemberships).where(eq(accountMemberships.userId, user.id));
    const ownedAccounts = await db.select().from(accounts).where(eq(accounts.ownerUserId, user.id));

    res.send({ users: 1, accounts: ownedAccounts.length, memberships: memberships.length });
  },
);

testRouter.post(
  '/auth/session',
  validateRequest({ body: deterministicSessionSchema }),
  async function deterministicSessionHandler(req, res, next) {
    try {
      const { email, accountId: requestedAccountId } = getValidated<{ body: typeof deterministicSessionSchema }>(
        req,
      ).body!;
      let user = await findUserByEmail(email);

      if (!user) {
        const now = new Date();
        const userId = randomUUID();
        const accountId = requestedAccountId ?? randomUUID();

        user = await db.transaction(async (tx) => {
          const [created] = await tx
            .insert(users)
            .values({ id: userId, email: email.toLowerCase(), emailVerifiedAt: now, createdAt: now, updatedAt: now })
            .returning();

          if (!created) throw new Error('Test user creation failed.');
          if (!requestedAccountId) {
            await tx.insert(accounts).values({
              id: accountId,
              name: email.split('@')[0] || 'Test account',
              ownerUserId: userId,
              slug: `${normalizeAccountSlug(email)}-${accountId.slice(0, 8)}`,
              createdAt: now,
              updatedAt: now,
            });
          }
          await tx.insert(accountMemberships).values({
            accountId,
            createdAt: now,
            id: randomUUID(),
            role: requestedAccountId ? 'member' : 'owner',
            updatedAt: now,
            userId,
          });

          return created;
        });
      } else if (requestedAccountId) {
        const [membership] = await db
          .select()
          .from(accountMemberships)
          .where(eq(accountMemberships.userId, user.id))
          .limit(1);

        if (membership?.accountId !== requestedAccountId) {
          await db.delete(accountMemberships).where(eq(accountMemberships.userId, user.id));
          await db.insert(accountMemberships).values({
            accountId: requestedAccountId,
            createdAt: new Date(),
            id: randomUUID(),
            role: 'member',
            updatedAt: new Date(),
            userId: user.id,
          });
        }
      }

      const authUser = { ...(await resolveAuthUser(user)), authenticationMethod: 'passkey' as const };

      await new Promise<void>((resolve, reject) => {
        req.login(authUser, (error) => (error ? reject(error) : resolve()));
      });
      await new Promise<void>((resolve, reject) => {
        req.session.save((error) => (error ? reject(error) : resolve()));
      });

      res.status(200).send({ data: { accountId: authUser.accountId, userId: authUser.id } });
    } catch (error: unknown) {
      next(error);
    }
  },
);

testRouter.get(
  '/mailbox/latest',
  validateRequest({ query: mailboxQuerySchema }),
  function mailboxLatestHandler(req, res) {
    const { email, purpose } = getValidated<{ query: typeof mailboxQuerySchema }>(req).query!;
    const messages = listSentMessages();
    const matchingMessages = messages.filter(
      (message) => (!email || message.email === email) && (!purpose || message.purpose === purpose),
    );
    const match = matchingMessages[matchingMessages.length - 1];

    if (!match) {
      res.status(404).send({ error: 'mail_not_found' });

      return;
    }

    res.send(match);
  },
);

testRouter.delete('/mailbox', function clearMailboxHandler(_req, res) {
  clearMailbox();
  res.status(204).send();
});

export { testOpenApiPaths, testRouter };
