import express, { json, type Request } from 'express';
import request from 'supertest';

import { passkeyOpenApiPaths, passkeyRouter } from './passkey-router';
import { findUserByEmail } from './auth-service';

import { errorHandler } from 'shared';

jest.mock('./auth-service', () => ({
  findUserByEmail: jest.fn(async () => ({ email: 'person@example.test', emailVerifiedAt: null, id: 'user-1' })),
  getPrimaryMembership: jest.fn(async () => ({ accountId: 'account-1', role: 'owner', userId: 'user-1' })),
  resolveAuthUser: jest.fn(),
}));

function createApp(authenticated = false): express.Express {
  const app = express();

  app.use(json());
  app.use((req: Request, _res, next) => {
    req.user = {
      accountId: 'account-1',
      email: 'person@example.test',
      emailVerifiedAt: null,
      id: 'user-1',
      role: 'owner',
    };
    (req as unknown as { isAuthenticated: () => boolean }).isAuthenticated = () => authenticated;
    next();
  });
  app.use('/auth/passkey', passkeyRouter);
  app.use(errorHandler);

  return app;
}

describe('passkey account ceremony router', () => {
  it('documents every account ceremony and lifecycle operation', () => {
    expect(passkeyOpenApiPaths).toEqual(
      expect.objectContaining({
        '/auth/passkey/registration/begin': expect.any(Object),
        '/auth/passkey/registration/complete': expect.any(Object),
        '/auth/passkey/authentication/begin': expect.any(Object),
        '/auth/passkey/authentication/complete': expect.any(Object),
        '/auth/passkey/credentials': expect.any(Object),
      }),
    );
  });

  it('requires the explicit verified-PIN state on both begin ceremonies', async () => {
    const app = createApp(true);
    const registration = await request(app)
      .post('/auth/passkey/registration/begin')
      .send({ email: 'person@example.test', label: 'Laptop' });
    const authentication = await request(app)
      .post('/auth/passkey/authentication/begin')
      .send({ email: 'person@example.test' });

    expect(registration.status).toBe(400);
    expect(authentication.status).toBe(400);
    expect(registration.body.code).toBe('invalid_request');
    expect(authentication.body.code).toBe('invalid_request');
  });

  it('rejects unverified email before any ceremony state is created', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/auth/passkey/authentication/begin')
      .send({ email: 'person@example.test', pinVerified: true });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('email_unverified');
  });

  it('returns an explicit password fallback signal only after the verified-PIN gate', async () => {
    jest.mocked(findUserByEmail).mockResolvedValueOnce({
      email: 'person@example.test',
      emailVerifiedAt: new Date(),
      id: 'user-1',
    } as Awaited<ReturnType<typeof findUserByEmail>>);
    const app = createApp();
    const response = await request(app)
      .post('/auth/passkey/authentication/begin')
      .send({ email: 'person@example.test', explicitPassword: true, pinVerified: true });

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({ attempt: 'password_fallback', challengeId: null, options: null });
  });

  it('rejects malformed completion payloads and unauthenticated lifecycle access', async () => {
    const app = createApp();
    const registration = await request(app)
      .post('/auth/passkey/registration/complete')
      .send({ challengeId: 'missing' });
    const authentication = await request(app)
      .post('/auth/passkey/authentication/complete')
      .send({ challengeId: 'missing' });
    const credentials = await request(app).get('/auth/passkey/credentials');

    expect(registration.status).toBe(400);
    expect(authentication.status).toBe(400);
    expect(credentials.status).toBe(401);
    expect(JSON.stringify({ registration: registration.body, authentication: authentication.body })).not.toContain(
      'privateKey',
    );
  });
});
