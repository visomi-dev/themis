import type { APIRequestContext } from '@playwright/test';

type MailboxMessage = {
  email: string;
  pin: string;
  purpose: 'bootstrap_recovery';
};

export const clearMailbox = async (request: APIRequestContext) => {
  await request.delete('/api/test/mailbox');
};

export const readLatestPin = async (request: APIRequestContext, email: string) => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const response = await request.get(
      `/api/test/mailbox/latest?email=${encodeURIComponent(email)}&purpose=bootstrap_recovery`,
    );

    if (response.ok()) {
      const payload = (await response.json()) as MailboxMessage;

      if (payload.pin) {
        return payload.pin;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`No bootstrap or recovery mailbox entry was found for ${email}.`);
};
