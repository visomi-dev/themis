type MailTransport = 'mailgun' | 'memory';
type DatabaseDriver = 'memory' | 'pg';

type AuthConfig = {
  appBaseUrl: string;
  cookieSecure: boolean;
  databaseAutoMigrate: boolean;
  databaseDriver: DatabaseDriver;
  databaseSsl: boolean;
  databaseUrl: string;
  enableTestApi: boolean;
  mailFrom: string;
  mailTransport: MailTransport;
  mailgunApiKey: string;
  mailgunDomain: string;
  mailgunUrl: string | undefined;
  pinExpiryMinutes: number;
  pinResendCooldownSeconds: number;
  redisUrl: string;
  realtimePath: string;
  sessionMaxAgeMs: number;
  sessionSecret: string;
};

const parseBoolean = (value: string | undefined, fallback = false) =>
  value === undefined ? fallback : value === 'true';

const getAuthConfig = (): AuthConfig => {
  const inferredTransport = process.env['MAIL_TRANSPORT'] as MailTransport | undefined;
  const hasMailgunCredentials = Boolean(
    process.env['MAILGUN_API_KEY'] && process.env['MAILGUN_DOMAIN'] && process.env['MAILGUN_FROM'],
  );

  return {
    appBaseUrl: process.env['APP_BASE_URL'] ?? 'http://localhost:8080/app',
    cookieSecure: parseBoolean(process.env['COOKIE_SECURE'], process.env['NODE_ENV'] === 'production'),
    databaseAutoMigrate: parseBoolean(process.env['DATABASE_AUTO_MIGRATE']),
    databaseDriver: (process.env['DATABASE_DRIVER'] as DatabaseDriver | undefined) ?? 'pg',
    databaseSsl: parseBoolean(process.env['DATABASE_SSL']),
    databaseUrl: process.env['DATABASE_URL'] ?? 'postgresql://postgres:postgres@127.0.0.1:5432/themis',
    enableTestApi: parseBoolean(process.env['ENABLE_TEST_API']),
    mailFrom: process.env['MAILGUN_FROM'] ?? 'Themis <no-reply@themis.local>',
    mailTransport: inferredTransport ?? (hasMailgunCredentials ? 'mailgun' : 'memory'),
    mailgunApiKey: process.env['MAILGUN_API_KEY'] ?? '',
    mailgunDomain: process.env['MAILGUN_DOMAIN'] ?? '',
    mailgunUrl: process.env['MAILGUN_URL'],
    pinExpiryMinutes: Number(process.env['PIN_EXPIRY_MINUTES'] ?? '10'),
    pinResendCooldownSeconds: Number(process.env['PIN_RESEND_COOLDOWN_SECONDS'] ?? '45'),
    redisUrl: process.env['REDIS_URL'] ?? 'redis://127.0.0.1:6379',
    realtimePath: process.env['REALTIME_PATH'] ?? '/socket.io',
    sessionMaxAgeMs: Number(process.env['SESSION_MAX_AGE_MS'] ?? String(1000 * 60 * 60 * 24 * 7)),
    sessionSecret: process.env['SESSION_SECRET'] ?? 'themis-dev-session-secret',
  };
};

export { getAuthConfig };
export type { AuthConfig, DatabaseDriver };
