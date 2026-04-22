import { Router } from 'express';

import { emailSchema, readValidated, validateRequest, z } from '../http/route-schemas.js';
import { clearMailbox, listSentMessages } from '../auth/auth-mail.js';

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

const buildTestRouter = () => {
  const router = Router();

  router.get('/mailbox/latest', validateRequest({ query: mailboxQuerySchema }), (req, res) => {
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
  });

  router.delete('/mailbox', (_req, res) => {
    clearMailbox();
    res.status(204).send();
  });

  return router;
};

export { buildTestRouter, testOpenApiPaths };
