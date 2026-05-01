import express, {
  type RequestHandler,
  static as serveStatic,
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from 'express';

type AstroRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<void> | void;

type GatewayDeps = {
  apiHandler: RequestHandler;
  angularHandler: Express;
  astroClientFolder: string;
  astroRequestHandler: AstroRequestHandler;
  authRuntimeHandlers: RequestHandler[];
};

function createGatewayApp({
  angularHandler,
  apiHandler,
  astroClientFolder,
  astroRequestHandler,
  authRuntimeHandlers,
}: GatewayDeps) {
  const app = express();

  app.use(...authRuntimeHandlers);
  app.get('/healthz', (_req, res) => {
    res.send({ status: 'ok' });
  });
  app.get('/', (_req, res) => {
    res.redirect(302, '/en/');
  });
  app.use('/api', apiHandler);
  app.use('/app', angularHandler);
  app.use(
    serveStatic(astroClientFolder, {
      index: false,
      maxAge: '1y',
      redirect: false,
    }),
  );
  app.use((req, res, next) => astroRequestHandler(req, res, next));

  return app;
}

export { createGatewayApp };
export type { GatewayDeps };
