import express, { json, type Express } from 'express';
import morgan from 'morgan';
import passport from 'passport';

import { activationRouter } from './activation/activation-router';
import { authRouter } from './auth/auth-router';
import './auth/passport';
import { projectSeedService } from './jobs/project-seed-service';
import { projectsRouter } from './projects/projects-router';
import { runMigrationsIfEnabled } from './shared/db/migrate';
import { getPool } from './shared/db/pool';
import { env } from './shared/env';
import { createOpenApiDocument } from './shared/http/openapi';
import { testRouter } from './testing/test-router';

import { createSessionMiddleware, createSessionStore, errorHandler } from 'web-shared';

let appPromise: Promise<Express> | undefined;

const morganFormat = process.env['MORGAN_FORMAT'] ?? 'dev';

async function buildApp() {
  await runMigrationsIfEnabled();
  projectSeedService.ensureWorker();

  const app = express();
  const sessionConfig = {
    cookieSecure: env.COOKIE_SECURE,
    databaseDriver: env.DATABASE_DRIVER,
    sessionMaxAgeMs: env.SESSION_MAX_AGE_MS,
    sessionSecret: env.SESSION_SECRET,
  };
  const sessionStore = createSessionStore(sessionConfig, env.DATABASE_DRIVER === 'pg' ? getPool() : undefined);
  const sessionMiddleware = createSessionMiddleware(sessionConfig, sessionStore);

  app.use(json());
  app.use(morgan(morganFormat));
  app.use(sessionMiddleware);
  app.use(passport.initialize());
  app.use(passport.session());

  app.get('/', (_req, res) => {
    res.send({ message: 'Hello Themis API' });
  });

  app.get('/health', (_req, res) => {
    res.send({ status: 'ok' });
  });

  app.get('/openapi.json', (_req, res) => {
    res.send(createOpenApiDocument());
  });

  app.use('/auth', authRouter);
  app.use('/activation', activationRouter);
  app.use('/projects', projectsRouter);

  if (env.ENABLE_TEST_API) {
    app.use('/test', testRouter);
  }

  app.use(errorHandler);

  return app;
}

function createApp() {
  appPromise ??= buildApp();
  return appPromise;
}

export { createApp };
