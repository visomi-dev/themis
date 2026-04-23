import { Router } from 'express';

import { clearMailbox, listSentMessages } from '../auth/auth-mail';
import { emailSchema, readValidated, validateRequest, z } from '../shared/http/route-schemas';

const mailboxQuerySchema = z
  .object({
    email: emailSchema.optional(),
    purpose: z.enum(['sign_in', 'sign_up']).optional(),
  })
  .meta({ id: 'TestMailboxQuery' });

const mailboxMessageSchema = z
  .object({
    challengeId: z.string(),
    email: emailSchema,
    expiresAt: z.string(),
    pin: z.string(),
    purpose: z.enum(['sign_in', 'sign_up']),
  })
  .meta({ id: 'MailboxMessage' });

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
    delete: {
      responses: { 204: { description: 'Mailbox cleared.' } },
    },
  },
};

class TestRouter {
  private configured = false;

  private readonly router = Router();

  configure() {
    if (this.configured) {
      return this.router;
    }

    this.router.get(
      '/mailbox/latest',
      validateRequest({ query: mailboxQuerySchema }),
      function mailboxLatestHandler(req, res) {
        const { email, purpose } = readValidated<{ query: typeof mailboxQuerySchema }>(req).query!;
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

    this.router.delete('/mailbox', function clearMailboxHandler(_req, res) {
      clearMailbox();
      res.status(204).send();
    });

    this.configured = true;

    return this.router;
  }
}

const testRouter = new TestRouter();

export { testOpenApiPaths, testRouter };
