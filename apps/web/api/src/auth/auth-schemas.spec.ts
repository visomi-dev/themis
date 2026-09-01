import { emailOtpRequestSchema, emailOtpVerifySchema } from './auth-schemas';
import { clientContextHash, normalizeEmail } from './auth-service';
import { authenticationBeginSchema, registrationBeginSchema } from './passkey-schemas';

describe('passwordless email OTP contract', () => {
  it('canonicalizes email with NFKC, trim, and invariant lowercase', () => {
    expect(normalizeEmail('  Ｐｅｒｓｏｎ＠Ｅｘａｍｐｌｅ．ＴＥＳＴ  ')).toBe('person@example.test');
  });

  it('rejects browser-asserted verification and password fields', () => {
    expect(emailOtpRequestSchema.safeParse({ email: 'person@example.test', password: 'not-accepted' }).success).toBe(
      false,
    );
    expect(
      emailOtpVerifySchema.safeParse({
        flowId: '8cefd33e-43db-42b6-8e12-a607c394e327',
        pin: '123456',
        pinVerified: true,
      }).success,
    ).toBe(false);
    expect(
      registrationBeginSchema.safeParse({
        email: 'person@example.test',
        label: 'Laptop',
        pinVerified: true,
      }).success,
    ).toBe(false);
    expect(
      authenticationBeginSchema.safeParse({
        email: 'person@example.test',
        explicitPassword: true,
      }).success,
    ).toBe(false);
  });

  it('binds client context without exposing its source values', () => {
    const first = clientContextHash('127.0.0.1', 'test-agent');

    expect(first).toBe(clientContextHash('127.0.0.1', 'test-agent'));
    expect(first).not.toBe(clientContextHash('127.0.0.2', 'test-agent'));
    expect(first).not.toContain('127.0.0.1');
    expect(first).not.toContain('test-agent');
  });
});
