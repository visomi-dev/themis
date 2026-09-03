import express, { json, type Request } from 'express';
import request from 'supertest';

import { PASSKEY_ACCOUNT_UNAVAILABLE, passkeyOpenApiPaths, passkeyRouter } from './passkey-router';
import { resetPasskeySecurityState } from './passkey-security';

import { errorHandler } from 'shared';

jest.mock('shared', () => {
  const actual = jest.requireActual<typeof import('shared')>('shared');

  return {
    ...actual,
    db: {
      insert: jest.fn(() => ({ values: jest.fn().mockResolvedValue([]) })),
    },
  };
});

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
  beforeEach(() => resetPasskeySecurityState());

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

  it('rejects client-authoritative verification and password fallback fields', async () => {
    const app = createApp(true);
    const registration = await request(app)
      .post('/auth/passkey/registration/begin')
      .set('Origin', 'http://localhost:8080')
      .send({ email: 'person@example.test', label: 'Laptop', pinVerified: true });
    const authentication = await request(app)
      .post('/auth/passkey/authentication/begin')
      .set('Origin', 'http://localhost:8080')
      .send({ email: 'person@example.test', explicitPassword: true });

    expect(registration.status).toBe(400);
    expect(authentication.status).toBe(400);
    expect(registration.body.code).toBe('invalid_request');
    expect(authentication.body.code).toBe('invalid_request');
  });

  it('starts identifier-less discoverable authentication without accepting an email hint', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/auth/passkey/authentication/begin')
      .set('Origin', 'http://localhost:8080')
      .send({});

    expect(response.status).toBe(200);
    expect(response.body.data.options.allowCredentials).toBeUndefined();
    expect(response.body.data.options.userVerification).toBe('required');
  });

  it('does not expose a password fallback branch', async () => {
    const app = createApp();
    const response = await request(app)
      .post('/auth/passkey/authentication/begin')
      .set('Origin', 'http://localhost:8080')
      .send({ email: 'person@example.test', explicitPassword: true });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('invalid_request');
  });

  it('rejects malformed completion payloads and unauthenticated lifecycle access', async () => {
    const app = createApp();
    const registration = await request(app)
      .post('/auth/passkey/registration/complete')
      .set('Origin', 'http://localhost:8080')
      .send({ challengeId: 'missing' });
    const authentication = await request(app)
      .post('/auth/passkey/authentication/complete')
      .set('Origin', 'http://localhost:8080')
      .send({ challengeId: 'missing' });
    const malformedBegin = await request(app)
      .post('/auth/passkey/authentication/begin')
      .set('Origin', 'http://localhost:8080')
      .send({ email: 'person@example.test', pinVerified: 'false' });
    const credentials = await request(app).get('/auth/passkey/credentials');

    expect(registration.status).toBe(400);
    expect(authentication.status).toBe(400);
    expect(malformedBegin.status).toBe(400);
    expect(credentials.status).toBe(401);
    expect(JSON.stringify({ registration: registration.body, authentication: authentication.body })).not.toContain(
      'privateKey',
    );
  });

  it('rejects cross-site mutating requests before ceremony handling', async () => {
    const response = await request(createApp())
      .post('/auth/passkey/authentication/begin')
      .set('Origin', 'https://evil.example.test')
      .send({ email: 'person@example.test' });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('csrf_origin_invalid');
  });

  it('applies the per-IP and per-account rate limit with a retry signal', async () => {
    const app = createApp();

    for (let index = 0; index < 60; index += 1) {
      await request(app)
        .post('/auth/passkey/authentication/begin')
        .set('Origin', 'http://localhost:8080')
        .send({ email: 'rate@example.test' });
    }

    const response = await request(app)
      .post('/auth/passkey/authentication/begin')
      .set('Origin', 'http://localhost:8080')
      .send({ email: 'rate@example.test' });

    expect(response.status).toBe(429);
    expect(response.headers['retry-after']).toBeDefined();
    expect(response.body.code).toBe('rate_limited');
  });

  it('does not accept identity hints on the discoverable ceremony', async () => {
    const app = createApp();
    const unknown = await request(app)
      .post('/auth/passkey/authentication/begin')
      .set('Origin', 'http://localhost:8080')
      .send({ email: 'unknown@example.test' });

    expect(unknown.status).toBe(400);
    expect(unknown.body.code).toBe('invalid_request');
    expect(PASSKEY_ACCOUNT_UNAVAILABLE).toBe('credential_not_found');
  });
});
