import express, { json, type Express, type NextFunction, type Request, type Response } from 'express';
import morgan from 'morgan';
import passport from 'passport';

import { activationRouter } from './lib/activation/activation-router';
import { authRouter } from './lib/auth/auth-router';
import { configurePassport } from './lib/auth/passport';
import { getAuthConfig } from './lib/config/auth-config';
import { runMigrationsIfEnabled } from './lib/db/migrate';
import { getPool } from './lib/db/pool';
import { createOpenApiDocument } from './lib/http/openapi';
import { projectSeedService } from './lib/jobs/project-seed-service';
import { projectsRouter } from './lib/projects/projects-router';
import { testRouter } from './lib/testing/test-router';

import { createSessionMiddleware, createSessionStore } from 'web-shared';

let appPromise: Promise<Express> | undefined;

const morganFormat = process.env['MORGAN_FORMAT'] ?? 'dev';

async function buildApp() {
  const config = getAuthConfig();

  await runMigrationsIfEnabled(config);
  configurePassport();
  projectSeedService.configure(config).ensureWorker();

  const app = express();
  const sessionStore = createSessionStore(config, config.databaseDriver === 'pg' ? getPool(config) : undefined);
  const sessionMiddleware = createSessionMiddleware(config, sessionStore);

  app.use(json());
  app.use(morgan(morganFormat));
  app.use(sessionMiddleware);
  app.use(passport.initialize());
  app.use(passport.session());

  app.get('/', function rootHandler(_req, res) {
    res.send({ message: 'Hello Themis API' });
  });

  app.get('/health', function healthHandler(_req, res) {
    res.send({ status: 'ok' });
  });

  app.get('/openapi.json', function openApiHandler(_req, res) {
    res.send(createOpenApiDocument());
  });

  app.use('/auth', authRouter.configure(config));
  app.use('/activation', activationRouter.configure(config));
  app.use('/projects', projectsRouter.configure(config));

  if (config.enableTestApi) {
    app.use('/test', testRouter.configure());
  }

  app.use(function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
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
}

function createApp() {
  appPromise ??= buildApp();
  return appPromise;
}

export { createApp };
