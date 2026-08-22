import { emailGate, nextPasskeyAttempt, normalizeEmail, revokeCredential, validateCeremony } from './passkey-contract';

import { accountPasskeyCredentials, accountWebAuthnChallenges } from 'shared';

describe('account passkey contract', () => {
  it('requires email, verification, and PIN before account authentication', () => {
    expect(emailGate(null, null, false)).toBe('email_required');
    expect(emailGate('person@example.test', null, false)).toBe('email_unverified');
    expect(emailGate('person@example.test', new Date(), false)).toBe('pin_required');
    expect(emailGate('person@example.test', new Date(), true)).toBe('ready');
  });

  it('normalizes equivalent email representations before identity use', () => {
    expect(normalizeEmail('  Person@Example.TEST ')).toBe('person@example.test');
    expect(normalizeEmail('Ｐｅｒｓｏｎ＠Ｅｘａｍｐｌｅ．ｔｅｓｔ')).toBe('person@example.test');
    expect(emailGate('  Person@Example.TEST ', new Date(), true)).toBe('ready');
  });

  it('keeps passkey default and exposes retry before password fallback', () => {
    expect(nextPasskeyAttempt({})).toBe('passkey_default');
    expect(nextPasskeyAttempt({ ceremonyFailed: true })).toBe('retry_available');
    expect(nextPasskeyAttempt({ explicitPassword: true })).toBe('password_fallback');
  });

  it('keeps credential lifecycle independent for multiple passkeys and excludes vault data', () => {
    expect(revokeCredential('active')).toBe('revoked');
    expect(revokeCredential('revoked')).toBe('revoked');

    const credentialColumns = Object.keys(accountPasskeyCredentials);
    const challengeColumns = Object.keys(accountWebAuthnChallenges);

    expect(credentialColumns).toEqual(
      expect.arrayContaining(['accountId', 'credentialId', 'publicKey', 'signCount', 'revokedAt']),
    );
    expect(challengeColumns).toEqual(
      expect.arrayContaining(['challengeHash', 'expiresAt', 'consumedAt', 'origin', 'rpId']),
    );
    expect(credentialColumns).not.toEqual(expect.arrayContaining(['privateKey', 'prfOutput', 'vaultPlaintext']));
    expect(challengeColumns).not.toEqual(expect.arrayContaining(['pin', 'password', 'prfOutput']));
  });

  it('rejects replay, expiry, binding failures, missing UV, and counter regression', () => {
    const base = {
      challenge: {
        challengeHash: 'challenge-hash-1',
        consumedAt: null,
        expiresAt: new Date('2026-08-22T00:01:00Z'),
        origin: 'https://app.example.test',
        rpId: 'app.example.test',
        userVerification: 'required' as const,
      },
      now: new Date('2026-08-22T00:00:00Z'),
      receivedChallengeHash: 'challenge-hash-1',
      receivedOrigin: 'https://app.example.test',
      receivedRpId: 'app.example.test',
      credentialStatus: 'active' as const,
      userVerified: true,
      storedSignCount: 3,
      receivedSignCount: 4,
    };

    expect(validateCeremony({ ...base, challenge: { ...base.challenge, consumedAt: new Date() } })).toEqual({
      ok: false,
      failure: 'challenge_replayed',
    });
    expect(validateCeremony({ ...base, now: new Date('2026-08-22T00:01:00Z') })).toEqual({
      ok: false,
      failure: 'challenge_expired',
    });
    expect(validateCeremony({ ...base, receivedChallengeHash: 'challenge-hash-2' })).toEqual({
      ok: false,
      failure: 'challenge_mismatch',
    });
    expect(validateCeremony({ ...base, credentialStatus: 'revoked' })).toEqual({
      ok: false,
      failure: 'credential_revoked',
    });
    expect(validateCeremony({ ...base, receivedOrigin: 'https://evil.example.test' })).toEqual({
      ok: false,
      failure: 'origin_mismatch',
    });
    expect(validateCeremony({ ...base, userVerified: false })).toEqual({
      ok: false,
      failure: 'user_verification_required',
    });
    expect(validateCeremony({ ...base, receivedSignCount: 2 })).toEqual({
      ok: false,
      failure: 'sign_count_regression',
    });
    expect(validateCeremony(base)).toEqual({ ok: true, nextSignCount: 4 });
  });
});
