import { spawn, type ChildProcess } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import type { Express, NextFunction, Request, Response } from 'express';

import { createGatewayApp } from './gateway';

import { logger } from 'shared';

type ApiModule = {
  appPromise?: Promise<Express>;
};

type RealtimeModule = {
  attachRealtimeServer?: (server: ReturnType<Express['listen']>) => Promise<unknown>;
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

const realtimeEntryFile = resolve(serverDistFolder, '..', 'realtime', 'main.js');

const workerEntryFile = resolve(serverDistFolder, '..', '..', 'worker', 'main.js');

let workerProcess: ChildProcess | undefined;

let shuttingDown = false;

function startWorkerRuntime() {
  workerProcess = spawn(process.execPath, [workerEntryFile], {
    env: process.env,
    stdio: 'inherit',
  });

  workerProcess.on('exit', (code, signal) => {
    if (shuttingDown) {
      return;
    }

    const reason = signal ? `signal ${signal}` : `code ${code ?? 0}`;

    logger.error({ reason }, 'Worker process exited');

    process.exit(code ?? 1);
  });
}

function shutdown() {
  shuttingDown = true;
  workerProcess?.kill('SIGTERM');
}

async function loadApiApp() {
  const apiModule = (await import(pathToFileURL(apiEntryFile).href)) as ApiModule;

  if (!apiModule.appPromise) {
    throw new Error(`Could not load the API app from '${apiEntryFile}'.`);
  }

  return apiModule.appPromise;
}

async function loadRealtimeAttacher() {
  const realtimeModule = (await import(pathToFileURL(realtimeEntryFile).href)) as RealtimeModule;

  if (typeof realtimeModule.attachRealtimeServer !== 'function') {
    throw new Error(`Could not load the realtime attacher from '${realtimeEntryFile}'.`);
  }

  return realtimeModule.attachRealtimeServer;
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
  const [apiHandler, angularHandler, astroRequestHandler, attachRealtimeServer] = await Promise.all([
    loadApiApp(),
    loadAngularHandler(),
    loadAstroRequestHandler(),
    loadRealtimeAttacher(),
  ]);

  startWorkerRuntime();

  const app = createGatewayApp({
    apiHandler,
    angularHandler,
    astroClientFolder,
    astroRequestHandler,
  });

  const httpServer = app.listen(port, host, () => {
    logger.info({ host, port }, 'Gateway server ready');
  });

  await attachRealtimeServer(httpServer);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

bootstrap().catch((error: unknown) => {
  logger.error({ err: error }, 'Failed to bootstrap gateway server');

  process.exit(1);
});
