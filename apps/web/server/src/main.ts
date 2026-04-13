import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import express, {
  json,
  static as serveStatic,
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from 'express';

type ApiModule = {
  app?: Express;
};

type AstroMiddlewareModule = {
  handler?: (req: Request, res: Response, next: NextFunction) => Promise<void> | void;
};

const host = process.env.HOST ?? '0.0.0.0';
const port = process.env.PORT ? Number(process.env.PORT) : 8080;

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const apiEntryFile = resolve(serverDistFolder, '..', 'api', 'main.js');
const astroClientFolder = resolve(serverDistFolder, '..', 'site', 'client');
const astroEntryFile = resolve(serverDistFolder, '..', 'site', 'server', 'entry.mjs');

const loadApiApp = async () => {
  const apiModule = (await import(pathToFileURL(apiEntryFile).href)) as ApiModule;

  if (!apiModule.app) {
    throw new Error(`Could not load the API app from '${apiEntryFile}'.`);
  }

  return apiModule.app;
};

const loadAstroRequestHandler = async () => {
  const astroModule = (await import(pathToFileURL(astroEntryFile).href)) as AstroMiddlewareModule;

  if (typeof astroModule.handler !== 'function') {
    throw new TypeError(`Could not load the Astro request handler from '${astroEntryFile}'.`);
  }

  return astroModule.handler;
};

const bootstrap = async () => {
  const [apiApp, astroRequestHandler] = await Promise.all([loadApiApp(), loadAstroRequestHandler()]);
  const app = express();

  app.use(json());
  app.use('/api', apiApp);
  app.use(
    serveStatic(astroClientFolder, {
      index: false,
      maxAge: '1y',
      redirect: false,
    }),
  );
  app.use((req, res, next) => astroRequestHandler(req, res, next));

  app.listen(port, host, () => {
    console.log(`[ ready ] http://${host}:${port}`);
  });
};

bootstrap().catch((error: unknown) => {
  console.error('[ error ] Failed to bootstrap gateway server', error);
  process.exit(1);
});
