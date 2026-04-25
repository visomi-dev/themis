import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import type { Express, NextFunction, Request, Response } from 'express';

import { createGatewayApp } from './gateway';
import { createRealtimeServer } from './realtime/socket';

import { logger } from 'shared';

type ApiModule = {
  appPromise?: Promise<Express>;
};

type AngularModule = {
  reqHandler?: Express;
};

type AstroMiddlewareModule = {
  handler?: (req: Request, res: Response, next: NextFunction) => Promise<void> | void;
};

const host = process.env.HOST ?? '0.0.0.0';
const port = process.env.PORT ? Number(process.env.PORT) : 8080;

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const apiEntryFile = resolve(serverDistFolder, '..', 'api', 'main.js');
const angularEntryFile = resolve(serverDistFolder, '..', 'app', 'server', 'server.mjs');
const astroClientFolder = resolve(serverDistFolder, '..', 'site', 'client');
const astroEntryFile = resolve(serverDistFolder, '..', 'site', 'server', 'entry.mjs');

async function loadApiApp() {
  const apiModule = (await import(pathToFileURL(apiEntryFile).href)) as ApiModule;

  if (!apiModule.appPromise) {
    throw new Error(`Could not load the API app from '${apiEntryFile}'.`);
  }

  return apiModule.appPromise;
}

async function loadAstroRequestHandler() {
  const astroModule = (await import(pathToFileURL(astroEntryFile).href)) as AstroMiddlewareModule;

  if (typeof astroModule.handler !== 'function') {
    throw new TypeError(`Could not load the Astro request handler from '${astroEntryFile}'.`);
  }

  return astroModule.handler;
}

async function loadAngularHandler() {
  const angularModule = (await import(pathToFileURL(angularEntryFile).href)) as AngularModule;

  if (!angularModule.reqHandler) {
    throw new Error(`Could not load the Angular request handler from '${angularEntryFile}'.`);
  }

  return angularModule.reqHandler;
}

async function bootstrap() {
  const [apiApp, angularHandler, astroRequestHandler] = await Promise.all([
    loadApiApp(),
    loadAngularHandler(),
    loadAstroRequestHandler(),
  ]);
  const app = createGatewayApp({
    apiApp,
    angularHandler,
    astroClientFolder,
    astroRequestHandler,
  });

  const httpServer = app.listen(port, host, () => {
    logger.info({ host, port }, 'Gateway server ready');
  });

  createRealtimeServer(httpServer);
}

bootstrap().catch((error: unknown) => {
  logger.error({ error }, 'Failed to bootstrap gateway server');
  process.exit(1);
});
