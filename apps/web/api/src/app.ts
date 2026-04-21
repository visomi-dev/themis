import connectPgSimple from 'connect-pg-simple';
import express, { json, type Express, type NextFunction, type Request, type Response } from 'express';
import session, { MemoryStore } from 'express-session';
import morgan from 'morgan';
import passport from 'passport';

import { getAuthConfig } from './lib/config/auth-config.js';
import { buildActivationRouter } from './lib/activation/activation-router.js';
import { buildProjectsRouter } from './lib/projects/projects-router.js';
import { buildAuthRouter } from './lib/auth/auth-router.js';
import { configurePassport } from './lib/auth/passport.js';
import { runMigrationsIfEnabled } from './lib/db/migrate.js';
import { getPool } from './lib/db/pool.js';
import { buildTestRouter } from './lib/testing/test-router.js';

let appPromise: Promise<Express> | undefined;

const morganFormat = process.env['MORGAN_FORMAT'] ?? 'dev';

const buildApp = async () => {
  const config = getAuthConfig();

  await runMigrationsIfEnabled(config);
  configurePassport();

  const app = express();
  const sessionStore =
    config.databaseDriver === 'memory'
      ? new MemoryStore()
      : new (connectPgSimple(session))({
          pool: getPool(config),
          createTableIfMissing: true,
          tableName: 'user_sessions',
        });

  app.use(json());
  app.use(morgan(morganFormat));
  app.use(
    session({
      cookie: {
        httpOnly: true,
        maxAge: config.sessionMaxAgeMs,
        sameSite: 'lax',
        secure: config.cookieSecure,
      },
      resave: false,
      rolling: true,
      saveUninitialized: false,
      secret: config.sessionSecret,
      store: sessionStore,
    }),
  );
  app.use(passport.initialize());
  app.use(passport.session());

  app.get('/', (_req, res) => {
    res.send({ message: 'Hello Themis API' });
  });

  app.get('/health', (_req, res) => {
    res.send({ status: 'ok' });
  });

  app.use('/auth', buildAuthRouter(config));
  app.use('/activation', buildActivationRouter(config));
  app.use('/projects', buildProjectsRouter(config));

  if (config.enableTestApi) {
    app.use('/test', buildTestRouter());
  }

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[ error ] API request failed', error);

    if (typeof error === 'object' && error && 'statusCode' in error) {
      const payload = error as { code?: string; message?: string; statusCode: number };
      res.status(payload.statusCode).send({
        error: payload.code ?? 'request_failed',
        message: payload.message ?? 'The request could not be completed.',
      });
      return;
    }

    res.status(500).send({
      error: 'internal_server_error',
      message: 'The request could not be completed.',
    });
  });

  return app;
};

const createApp = () => {
  appPromise ??= buildApp();

  return appPromise;
};

export { createApp };
