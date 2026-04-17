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
  appPromise?: Promise<Express>;
};

type AstroMiddlewareModule = {
  handler?: (req: Request, res: Response, next: NextFunction) => Promise<void> | void;
};

type AngularAppModule = {
  reqHandler?: (req: Request, res: Response, next: NextFunction) => Promise<void> | void;
};

const host = process.env.HOST ?? '0.0.0.0';
const port = process.env.PORT ? Number(process.env.PORT) : 8080;

const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const apiEntryFile = resolve(serverDistFolder, '..', 'api', 'main.js');
const angularBrowserFolder = resolve(serverDistFolder, '..', 'app', 'browser');
const angularEntryFile = resolve(serverDistFolder, '..', 'app', 'server', 'server.mjs');
const astroClientFolder = resolve(serverDistFolder, '..', 'site', 'client');
const astroEntryFile = resolve(serverDistFolder, '..', 'site', 'server', 'entry.mjs');
const defaultAngularLocale = 'en-US';

const loadApiApp = async () => {
  const apiModule = (await import(pathToFileURL(apiEntryFile).href)) as ApiModule;

  if (!apiModule.appPromise) {
    throw new Error(`Could not load the API app from '${apiEntryFile}'.`);
  }

  return apiModule.appPromise;
};

const loadAngularRequestHandler = async () => {
  const angularModule = (await import(pathToFileURL(angularEntryFile).href)) as AngularAppModule;

  if (typeof angularModule.reqHandler !== 'function') {
    throw new TypeError(`Could not load the Angular request handler from '${angularEntryFile}'.`);
  }

  return angularModule.reqHandler;
};

const loadAstroRequestHandler = async () => {
  const astroModule = (await import(pathToFileURL(astroEntryFile).href)) as AstroMiddlewareModule;

  if (typeof astroModule.handler !== 'function') {
    throw new TypeError(`Could not load the Astro request handler from '${astroEntryFile}'.`);
  }

  return astroModule.handler;
};

const bootstrap = async () => {
  const [apiApp, angularRequestHandler, astroRequestHandler] = await Promise.all([
    loadApiApp(),
    loadAngularRequestHandler(),
    loadAstroRequestHandler(),
  ]);
  const app = express();

  app.use(json());
  app.get('/healthz', (_req, res) => {
    res.send({ status: 'ok' });
  });
  app.use('/api', apiApp);
  app.use('/app', (req, res, next) => {
    if (req.path === `/${defaultAngularLocale}` || req.path.startsWith(`/${defaultAngularLocale}/`) || req.path === '/es' || req.path.startsWith('/es/')) {
      next();
      return;
    }

    const redirectPath = req.path === '/' ? '' : req.path;
    const redirectQuery = req.url.slice(req.path.length);

    res.redirect(302, `/app/${defaultAngularLocale}${redirectPath}${redirectQuery}`);
  });
  app.use(
    '/app',
    serveStatic(angularBrowserFolder, {
      index: false,
      maxAge: '1y',
      redirect: false,
    }),
  );
  app.use('/app', (req, res, next) => angularRequestHandler(req, res, next));
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
