import { getAuthConfig } from './auth-config';

describe('getAuthConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env['MAIL_TRANSPORT'];
    delete process.env['MAILGUN_API_KEY'];
    delete process.env['MAILGUN_DOMAIN'];
    delete process.env['MAILGUN_FROM'];
    delete process.env['COOKIE_SECURE'];
    delete process.env['NODE_ENV'];
    delete process.env['ENABLE_TEST_API'];
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('falls back to memory mail transport without mailgun credentials', () => {
    expect(getAuthConfig().mailTransport).toBe('memory');
  });

  it('infers mailgun transport when mailgun credentials are present', () => {
    process.env['MAILGUN_API_KEY'] = 'key';
    process.env['MAILGUN_DOMAIN'] = 'mg.example.com';
    process.env['MAILGUN_FROM'] = 'Themis <no-reply@example.com>';

    expect(getAuthConfig().mailTransport).toBe('mailgun');
  });

  it('prefers explicit environment flags over defaults', () => {
    process.env['COOKIE_SECURE'] = 'true';
    process.env['ENABLE_TEST_API'] = 'true';
    process.env['MAIL_TRANSPORT'] = 'memory';

    const config = getAuthConfig();

    expect(config.cookieSecure).toBe(true);
    expect(config.enableTestApi).toBe(true);
    expect(config.mailTransport).toBe('memory');
  });
  it('provides realtime and redis defaults when unset', () => {
    const config = getAuthConfig();

    expect(config.redisUrl).toBe('redis://127.0.0.1:6379');
    expect(config.realtimePath).toBe('/socket.io');
  });
});
