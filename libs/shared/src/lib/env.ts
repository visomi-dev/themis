import { config } from 'dotenv';
import { z } from 'zod';

const environmentSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    MAIL_TRANSPORT: z.enum(['mailgun', 'memory']).optional(),
    MAILGUN_API_KEY: z.string().default(''),
    MAILGUN_DOMAIN: z.string().default(''),
    MAILGUN_FROM: z.string().default('Themis <no-reply@themis.local>'),
    MAILGUN_URL: z.string().optional(),
    API_INTERNAL_URL: z.string().default('http://127.0.0.1:3000'),
    DATABASE_URL: z.string().default('postgresql://postgres:postgres@127.0.0.1:5432/themis'),
    APP_BASE_URL: z.url().default('http://localhost:8080/app'),
    COOKIE_SECURE: z.enum(['true', 'false']).optional(),
    DATABASE_AUTO_MIGRATE: z
      .enum(['true', 'false'])
      .optional()
      .transform((v) => v === 'true'),
    DATABASE_DRIVER: z.enum(['memory', 'pg']).default('pg'),
    DATABASE_SSL: z
      .enum(['true', 'false'])
      .optional()
      .transform((v) => v === 'true'),
    ENABLE_TEST_API: z
      .enum(['true', 'false'])
      .optional()
      .transform((v) => v === 'true'),
    PIN_EXPIRY_MINUTES: z.coerce.number().default(10),
    PIN_RESEND_COOLDOWN_SECONDS: z.coerce.number().default(45),
    REDIS_URL: z.string().default('redis://127.0.0.1:6379'),
    REALTIME_INTERNAL_URL: z.string().default('http://127.0.0.1:3001'),
    REALTIME_PATH: z.string().default('/socket.io'),
    SESSION_MAX_AGE_MS: z.coerce.number().default(1000 * 60 * 60 * 24 * 7),
    SESSION_SECRET: z.string().default('themis-dev-session-secret'),
  })
  .transform((data) => {
    const hasMailgunCredentials = Boolean(data.MAILGUN_API_KEY && data.MAILGUN_DOMAIN && data.MAILGUN_FROM);

    const mailTransport = data.MAIL_TRANSPORT ?? (hasMailgunCredentials ? 'mailgun' : 'memory');

    return {
      ...data,
      COOKIE_SECURE: data.COOKIE_SECURE === undefined ? data.NODE_ENV === 'production' : data.COOKIE_SECURE === 'true',
      MAIL_TRANSPORT: mailTransport,
    } as const;
  });

function getEnv({ filePath }: { filePath?: string } = {}) {
  config({ path: filePath });

  return environmentSchema.parse(process.env);
}

const env = getEnv();

export { env, getEnv };
