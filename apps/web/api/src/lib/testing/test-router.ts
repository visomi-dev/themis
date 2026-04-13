import { Router } from 'express';

import { clearMailbox, listSentMessages } from '../auth/auth-mail.js';

const buildTestRouter = () => {
  const router = Router();

  router.get('/mailbox/latest', (req, res) => {
    const email = typeof req.query['email'] === 'string' ? req.query['email'] : undefined;
    const purpose = typeof req.query['purpose'] === 'string' ? req.query['purpose'] : undefined;
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

export { buildTestRouter };
