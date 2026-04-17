import FormData from 'form-data';
import Mailgun from 'mailgun.js';

import type { AuthConfig } from '../config/auth-config.js';

import { AuthError } from './auth-errors.js';
import type { VerificationPurpose } from './auth-types.js';

type VerificationMessage = {
  challengeId: string;
  email: string;
  expiresAt: Date;
  pin: string;
  purpose: VerificationPurpose;
};

type SentVerificationMessage = VerificationMessage & {
  sentAt: Date;
};

const mailbox: SentVerificationMessage[] = [];

let mailgunClient: ReturnType<InstanceType<typeof Mailgun>['client']> | undefined;

const getMailgunClient = (config: AuthConfig) => {
  if (!config.mailgunApiKey || !config.mailgunDomain) {
    throw new AuthError(500, 'mailgun_not_configured', 'Mailgun credentials are not configured.');
  }

  if (!mailgunClient) {
    const mailgun = new Mailgun(FormData);
    mailgunClient = mailgun.client({
      key: config.mailgunApiKey,
      url: config.mailgunUrl,
      username: 'api',
    });
  }

  return mailgunClient;
};

const createMessageBody = (message: VerificationMessage) => {
  const intent = message.purpose === 'sign_in' ? 'sign in' : 'finish creating your account';

  return {
    html: `<p>Your Themis verification code is <strong>${message.pin}</strong>.</p><p>Use it to ${intent}. This code expires at ${message.expiresAt.toISOString()}.</p>`,
    subject: 'Your Themis verification code',
    text: `Your Themis verification code is ${message.pin}. Use it to ${intent}. This code expires at ${message.expiresAt.toISOString()}.`,
  };
};

const sendVerificationMessage = async (config: AuthConfig, message: VerificationMessage) => {
  const body = createMessageBody(message);

  if (config.mailTransport === 'memory') {
    mailbox.push({
      ...message,
      sentAt: new Date(),
    });

    return;
  }

  const client = getMailgunClient(config);

  await client.messages.create(config.mailgunDomain, {
    from: config.mailFrom,
    html: body.html,
    subject: body.subject,
    text: body.text,
    to: [message.email],
  });
};

const listSentMessages = () => mailbox.map((message) => ({ ...message }));

const clearMailbox = () => {
  mailbox.length = 0;
};

export { clearMailbox, listSentMessages, sendVerificationMessage };
export type { SentVerificationMessage };
