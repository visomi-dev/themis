import { randomUUID } from 'node:crypto';

import axios from 'axios';

const email = 'engineer@themis.dev';

const origin = 'http://localhost:8080';

const toCookieHeader = (setCookie: string[] | undefined) =>
  setCookie?.map((cookie) => cookie.split(';', 1)[0]).join('; ') ?? '';

async function registerSession(suffix: string): Promise<{ cookie: string; workspaceId: string }> {
  const account = `webauthn-${suffix}-${Date.now()}@themis.dev`;
  const session = await axios.post('/test/auth/session', { email: account });
  const cookie = toCookieHeader(session.headers['set-cookie']);
  const project = await axios.post(
    '/projects',
    { name: `WebAuthn ${suffix}`, sourceType: 'manual' },
    { headers: { Cookie: cookie } },
  );

  return { cookie, workspaceId: project.data.data.id as string };
}

describe('auth API', () => {
  beforeEach(async () => {
    await axios.delete('/test/mailbox');
  });

  it('should return a message from the API root', async () => {
    const res = await axios.get(`/`);

    expect(res.status).toBe(200);
    expect(res.data).toEqual({ message: 'Hello Themis API' });
  });

  it('serves the OpenAPI document', async () => {
    const res = await axios.get('/openapi.json');

    expect(res.status).toBe(200);
    expect(res.data.openapi).toBe('3.1.0');
    expect(res.data.info.title).toBe('Themis API');
    expect(res.data.paths['/auth/session']).toBeDefined();
    expect(res.data.paths['/projects/{projectId}/seed']).toBeDefined();
  });

  it('documents only the passwordless OTP lifecycle', async () => {
    const res = await axios.get('/openapi.json');
    const paths = res.data.paths as Record<string, Record<string, { responses: Record<string, unknown> }>>;

    for (const [path, method] of [
      ['/auth/email-otp/request', 'post'],
      ['/auth/email-otp/verify', 'post'],
      ['/auth/email-otp/resend', 'post'],
    ] as const) {
      expect(paths[path]?.[method]?.responses['429']).toEqual(
        expect.objectContaining({ description: expect.stringContaining('cooldown') }),
      );
    }
    for (const removedPath of [
      '/auth/sign-up',
      '/auth/sign-up/verify',
      '/auth/sign-in/password',
      '/auth/password/forgotten',
      '/auth/password/reset',
      '/auth/security/password',
    ]) {
      expect(paths[removedPath]).toBeUndefined();
    }
    expect(JSON.stringify(paths)).not.toMatch(/pinVerified|explicitPassword|password_fallback/);
  });

  it('rejects removed password endpoints and client-authoritative passkey flags over HTTP', async () => {
    for (const removedPath of [
      '/auth/sign-up',
      '/auth/sign-up/verify',
      '/auth/sign-in/password',
      '/auth/password/forgotten',
      '/auth/password/reset',
      '/auth/security/password',
    ]) {
      const response = await axios.post(removedPath, {}, { headers: { Origin: origin }, validateStatus: () => true });

      expect(response.status).toBe(404);
    }

    const registrationFlag = await axios.post(
      '/auth/passkey/registration/begin',
      { email: 'flags@example.test', label: 'Browser assertion', pinVerified: true },
      { headers: { Origin: origin }, validateStatus: () => true },
    );
    const authenticationFlags = await axios.post(
      '/auth/passkey/authentication/begin',
      { email: 'flags@example.test', explicitPassword: true },
      { headers: { Origin: origin }, validateStatus: () => true },
    );

    expect(registrationFlag.status).toBe(400);
    expect(registrationFlag.data.code).toBe('invalid_request');
    expect(authenticationFlags.status).toBe(400);
    expect(authenticationFlags.data.code).toBe('invalid_request');
  });

  it('does not grant anonymous passkey registration authority or create identity rows', async () => {
    const email = `anonymous-passkey-${randomUUID()}@example.test`;
    const response = await axios.post(
      '/auth/passkey/registration/begin',
      { label: 'Anonymous registration' },
      { headers: { Origin: origin }, validateStatus: () => true },
    );

    expect(response.status).toBe(401);
    expect(response.data.code).toBe('restricted_session_required');
    expect((await axios.get('/test/auth/identity', { params: { email } })).data).toEqual({
      users: 0,
      accounts: 0,
      memberships: 0,
    });
  });

  it('covers WebAuthn metadata negative cases over real HTTP', async () => {
    const owner = await registerSession('owner');
    const otherTenant = await registerSession('other');
    const credential = {
      credentialId: 'AQIDBA',
      rpId: 'example.test',
      origin: 'https://example.test',
      prfSupported: true,
      transports: ['internal'],
    };
    const ownerHeaders = { headers: { Cookie: owner.cookie }, validateStatus: () => true };
    const otherHeaders = { headers: { Cookie: otherTenant.cookie }, validateStatus: () => true };

    const unauthorizedWorkspace = await axios.get(`/webauthn/${owner.workspaceId}/credentials`, otherHeaders);

    expect(unauthorizedWorkspace.status).toBe(404);
    expect(unauthorizedWorkspace.data).toEqual({
      code: 'workspace_not_found',
      message: 'The workspace could not be found.',
    });

    const malformedCredential = await axios.post(
      `/webauthn/${owner.workspaceId}/credentials`,
      { ...credential, credentialId: 'not canonical!' },
      ownerHeaders,
    );

    expect(malformedCredential.status).toBe(400);
    expect(malformedCredential.data.code).toBe('invalid_request');

    const secretField = await axios.post(
      `/webauthn/${owner.workspaceId}/credentials`,
      { ...credential, privateKey: 'must-not-cross-the-api' },
      ownerHeaders,
    );

    expect(secretField.status).toBe(400);
    expect(JSON.stringify(secretField.data)).not.toContain('must-not-cross-the-api');

    const enrolled = await axios.post(
      `/webauthn/${owner.workspaceId}/recovery`,
      { requestId: 'enroll-once', confirmed: true },
      ownerHeaders,
    );

    expect(enrolled.status).toBe(201);
    expect(enrolled.data.data).not.toHaveProperty('material');
    const replayedEnrollment = await axios.post(
      `/webauthn/${owner.workspaceId}/recovery`,
      { requestId: 'enroll-once', confirmed: true },
      ownerHeaders,
    );

    expect(replayedEnrollment.status).toBe(409);
    expect(replayedEnrollment.data).toEqual({
      code: 'webauthn_replay',
      message: 'The recovery operation was already processed.',
    });

    const recoveryId = enrolled.data.data.recoveryId as string;
    const crossTenant = await axios.post(
      `/webauthn/${owner.workspaceId}/recovery/${recoveryId}/use`,
      { requestId: 'cross-tenant', confirmed: true },
      otherHeaders,
    );

    expect(crossTenant.status).toBe(404);

    const revoked = await axios.post(
      `/webauthn/${otherTenant.workspaceId}/recovery`,
      { requestId: 'revoke-me', confirmed: true },
      otherHeaders,
    );

    const revokedId = revoked.data.data.recoveryId as string;

    expect(
      (await axios.delete(`/webauthn/${otherTenant.workspaceId}/recovery/${revokedId}`, otherHeaders)).status,
    ).toBe(200);

    const revokedUse = await axios.post(
      `/webauthn/${otherTenant.workspaceId}/recovery/${revokedId}/use`,
      { requestId: 'revoked-use', confirmed: true },
      otherHeaders,
    );

    expect(revokedUse.status).toBe(409);

    const used = await axios.post(
      `/webauthn/${owner.workspaceId}/recovery/${recoveryId}/use`,
      { requestId: 'use-once', confirmed: true },
      ownerHeaders,
    );

    expect(used.status).toBe(200);
    const replayedUse = await axios.post(
      `/webauthn/${owner.workspaceId}/recovery/${recoveryId}/use`,
      { requestId: 'use-again', confirmed: true },
      ownerHeaders,
    );

    expect(replayedUse.status).toBe(409);
  }, 30_000);

  it('creates one identity transactionally and grants only a restricted session', async () => {
    const request = await axios.post('/auth/email-otp/request', { email }, { headers: { Origin: origin } });

    expect(request.status).toBe(202);
    expect(request.data.data).toEqual({
      flowId: expect.any(String),
      resendAvailableAt: expect.any(String),
    });
    const before = await axios.get('/test/auth/identity', { params: { email } });

    expect(before.data).toEqual({ users: 0, accounts: 0, memberships: 0 });
    const mailbox = await axios.get('/test/mailbox/latest', {
      params: { email, purpose: 'bootstrap_recovery' },
    });
    const verified = await axios.post(
      '/auth/email-otp/verify',
      { flowId: request.data.data.flowId, pin: mailbox.data.pin },
      { headers: { Origin: origin } },
    );

    expect(verified.data.data).toEqual({
      authenticated: false,
      kind: 'restricted',
      expiresAt: expect.any(String),
      user: null,
      verifiedEmail: email,
    });
    const cookie = toCookieHeader(verified.headers['set-cookie']);
    const session = await axios.get('/auth/session', { headers: { Cookie: cookie } });

    expect(session.data.data.kind).toBe('restricted');
    expect(session.data.data).toMatchObject({ authenticated: false, user: null });
    const productAccess = await axios.get('/projects', { headers: { Cookie: cookie }, validateStatus: () => true });

    expect(productAccess.status).toBe(401);
    expect((await axios.get('/test/auth/identity', { params: { email } })).data).toEqual({
      users: 1,
      accounts: 1,
      memberships: 1,
    });
  });

  it('is non-enumerating, rejects replay and browser assertions, and creates no rows for an existing email request', async () => {
    const knownEmail = `known-${Date.now()}@themis.dev`;
    const unknownEmail = `unknown-${Date.now()}@themis.dev`;

    await axios.post('/test/auth/session', { email: knownEmail });
    const unknown = await axios.post(
      '/auth/email-otp/request',
      { email: unknownEmail },
      { headers: { Origin: origin } },
    );
    const knownBefore = await axios.get('/test/auth/identity', { params: { email: knownEmail } });
    const known = await axios.post('/auth/email-otp/request', { email: knownEmail }, { headers: { Origin: origin } });
    const knownAfter = await axios.get('/test/auth/identity', { params: { email: knownEmail } });

    expect(known.status).toBe(unknown.status);
    expect(known.data.message).toBe(unknown.data.message);
    expect(Object.keys(known.data.data).sort()).toEqual(Object.keys(unknown.data.data).sort());
    expect(knownAfter.data).toEqual(knownBefore.data);

    const mail = await axios.get('/test/mailbox/latest', {
      params: { email: unknownEmail, purpose: 'bootstrap_recovery' },
    });
    const body = { flowId: unknown.data.data.flowId, pin: mail.data.pin };
    const [first, second] = await Promise.all([
      axios.post('/auth/email-otp/verify', body, { headers: { Origin: origin }, validateStatus: () => true }),
      axios.post('/auth/email-otp/verify', body, { headers: { Origin: origin }, validateStatus: () => true }),
    ]);

    expect([first.status, second.status].sort()).toEqual([200, 401]);
    expect((await axios.get('/test/auth/identity', { params: { email: unknownEmail } })).data).toEqual({
      users: 1,
      accounts: 1,
      memberships: 1,
    });
    expect((await axios.get('/test/auth/identity', { params: { email: knownEmail } })).data).toEqual(knownBefore.data);

    const asserted = await axios.post(
      '/auth/email-otp/verify',
      { ...body, pinVerified: true },
      { headers: { Origin: origin }, validateStatus: () => true },
    );

    expect(asserted.status).toBe(400);
  });

  it('enforces CSRF, attempt consumption, resend cooldown, and configurable delivery limits', async () => {
    const csrf = await axios.post(
      '/auth/email-otp/request',
      { email: `csrf-${Date.now()}@themis.dev` },
      { validateStatus: () => true },
    );

    expect(csrf.status).toBe(403);
    const cooldownEmail = `cooldown-${Date.now()}@themis.dev`;
    const cooldownStartedAt = Date.now();
    const cooldownRequest = await axios.post(
      '/auth/email-otp/request',
      { email: cooldownEmail },
      { headers: { Origin: origin } },
    );
    const cooldownDelay = Date.parse(cooldownRequest.data.data.resendAvailableAt) - cooldownStartedAt;
    const activeCooldown = await axios.post(
      '/auth/email-otp/resend',
      { flowId: cooldownRequest.data.data.flowId },
      { headers: { Origin: origin }, validateStatus: () => true },
    );

    expect(cooldownDelay).toBeGreaterThanOrEqual(59_000);
    expect(cooldownDelay).toBeLessThanOrEqual(61_000);
    expect(activeCooldown.status).toBe(429);
    expect(activeCooldown.data.code).toBe('rate_limited');

    const attemptEmail = `attempt-${Date.now()}@themis.dev`;
    const requested = await axios.post(
      '/auth/email-otp/request',
      { email: attemptEmail },
      { headers: { Origin: origin } },
    );

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const invalid = await axios.post(
        '/auth/email-otp/verify',
        { flowId: requested.data.data.flowId, pin: '000000' },
        { headers: { Origin: origin }, validateStatus: () => true },
      );

      expect(invalid.status).toBe(401);
      expect(invalid.data.code).toBe('verification_failed');
    }
    expect((await axios.get('/test/auth/identity', { params: { email: attemptEmail } })).data.users).toBe(0);
    const resend = await axios.post(
      '/auth/email-otp/resend',
      { flowId: requested.data.data.flowId },
      { headers: { Origin: origin }, validateStatus: () => true },
    );

    expect(resend.status).toBe(202);

    const limitedEmail = `limited-${Date.now()}@themis.dev`;
    const statuses: number[] = [];

    for (let delivery = 0; delivery < 6; delivery += 1) {
      statuses.push(
        (
          await axios.post(
            '/auth/email-otp/request',
            { email: limitedEmail },
            { headers: { Origin: origin }, validateStatus: () => true },
          )
        ).status,
      );
    }
    expect(statuses).toEqual([202, 202, 202, 202, 202, 429]);
  });

  it('rolls back challenge consumption and every JIT identity row after an induced transaction failure', async () => {
    const rollbackEmail = `rollback-${Date.now()}@themis.dev`;
    const requested = await axios.post(
      '/auth/email-otp/request',
      { email: rollbackEmail },
      { headers: { Origin: origin } },
    );
    const mailbox = await axios.get('/test/mailbox/latest', {
      params: { email: rollbackEmail, purpose: 'bootstrap_recovery' },
    });
    const body = { flowId: requested.data.data.flowId, pin: mailbox.data.pin };

    expect((await axios.post('/test/auth/induce-jit-failure')).status).toBe(204);
    const failed = await axios.post('/auth/email-otp/verify', body, {
      headers: { Origin: origin },
      validateStatus: () => true,
    });

    expect(failed.status).toBe(500);
    expect((await axios.get('/test/auth/identity', { params: { email: rollbackEmail } })).data).toEqual({
      users: 0,
      accounts: 0,
      memberships: 0,
    });

    const retried = await axios.post('/auth/email-otp/verify', body, { headers: { Origin: origin } });

    expect(retried.status).toBe(200);
    expect(retried.data.data.kind).toBe('restricted');
    expect((await axios.get('/test/auth/identity', { params: { email: rollbackEmail } })).data).toEqual({
      users: 1,
      accounts: 1,
      memberships: 1,
    });
  });
});
