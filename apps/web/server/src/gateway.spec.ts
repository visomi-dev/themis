import express from 'express';
import request from 'supertest';

import { createGatewayApp } from './gateway';

describe('createGatewayApp', () => {
  const createDeps = () => {
    const apiHandler = express();
    apiHandler.get('/hello', (_req, res) => {
      res.send({ message: 'hello' });
    });

    const angularHandler = express();
    angularHandler.get('/sign-in', (_req, res) => {
      res.type('html').send('<base href="/app/en/" /><app-root></app-root>');
    });

    const astroRequestHandler = (_req: express.Request, res: express.Response) => {
      res.type('html').send('<main>Themis</main>');
    };

    return {
      apiHandler,
      angularHandler,
      astroClientFolder: __dirname,
      astroRequestHandler,
    };
  };

  it('exposes the health endpoint', async () => {
    const app = createGatewayApp(createDeps());
    const response = await request(app).get('/healthz');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('redirects the root path to the english site', async () => {
    const app = createGatewayApp(createDeps());
    const response = await request(app).get('/');

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/en/');
  });

  it('mounts the api and angular handlers on their prefixes', async () => {
    const app = createGatewayApp(createDeps());
    const apiResponse = await request(app).get('/api/hello');
    const angularResponse = await request(app).get('/app/sign-in');

    expect(apiResponse.status).toBe(200);
    expect(apiResponse.body).toEqual({ message: 'hello' });
    expect(angularResponse.status).toBe(200);
    expect(angularResponse.text).toContain('<app-root>');
  });
});
