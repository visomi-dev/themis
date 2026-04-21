import express, {
  json,
  static as serveStatic,
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from 'express';

type AstroRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<void> | void;

type GatewayDeps = {
  apiApp: Express;
  angularHandler: Express;
  astroClientFolder: string;
  astroRequestHandler: AstroRequestHandler;
};

const createGatewayApp = ({ angularHandler, apiApp, astroClientFolder, astroRequestHandler }: GatewayDeps) => {
  const app = express();

  app.use(json());
  app.get('/healthz', (_req, res) => {
    res.send({ status: 'ok' });
  });
  app.get('/', (_req, res) => {
    res.redirect(302, '/en/');
  });
  app.use('/api', apiApp);
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
};

export { createGatewayApp };
export type { GatewayDeps };
