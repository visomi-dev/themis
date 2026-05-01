import express, { json, type Express } from 'express';
import morgan from 'morgan';

import { activationRouter } from './activation/activation-router';
import { authRouter } from './auth/auth-router';
import './auth/passport';
import { projectsRouter } from './projects/projects-router';
import { env } from './shared/env';
import { createOpenApiDocument } from './shared/http/openapi';
import { testRouter } from './testing/test-router';

import { createAuthRuntimeMiddleware, errorHandler, runMigrationsIfEnabled } from 'shared';

let embeddedAppPromise: Promise<Express> | undefined;

let standaloneAppPromise: Promise<Express> | undefined;

type CreateAppOptions = {
  mountAuthRuntime?: boolean;
};

const morganFormat = process.env['MORGAN_FORMAT'] ?? 'dev';

async function buildApp({ mountAuthRuntime = true }: CreateAppOptions = {}) {
  await runMigrationsIfEnabled();

  const app = express();

  app.use(json());
  app.use(morgan(morganFormat));

  if (mountAuthRuntime) {
    app.use(...createAuthRuntimeMiddleware());
  }

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

function createApp(options?: CreateAppOptions) {
  if (options?.mountAuthRuntime === false) {
    embeddedAppPromise ??= buildApp(options);
    return embeddedAppPromise;
  }

  standaloneAppPromise ??= buildApp(options);
  return standaloneAppPromise;
}

export { createApp };
