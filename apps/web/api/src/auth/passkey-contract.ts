type PasskeyFailure =
  | 'email_required'
  | 'email_unverified'
  | 'pin_required'
  | 'challenge_expired'
  | 'challenge_replayed'
  | 'challenge_mismatch'
  | 'origin_mismatch'
  | 'rp_id_mismatch'
  | 'user_verification_required'
  | 'credential_not_found'
  | 'credential_revoked'
  | 'sign_count_regression'
  | 'ceremony_cancelled'
  | 'platform_error';

type EmailGate = 'email_required' | 'email_unverified' | 'pin_required' | 'ready';
type PasskeyAttempt = 'passkey_default' | 'retry_available' | 'password_fallback' | 'authenticated';
type CredentialStatus = 'active' | 'revoked';
type UserVerification = 'required' | 'preferred' | 'discouraged';

type AccountSessionClaims = {
  accountId: string;
  authenticatedAt: Date;
  authenticationMethod: 'passkey' | 'password';
  credentialId?: string;
  userId: string;
};

type ChallengeExpectation = {
  challengeHash: string;
  consumedAt: Date | null;
  expiresAt: Date;
  origin: string;
  rpId: string;
  userVerification: UserVerification;
};

type CeremonyResult = { ok: true; nextSignCount: number } | { ok: false; failure: PasskeyFailure };

function emailGate(email: string | null, verifiedAt: Date | null, pinVerified: boolean): EmailGate {
  if (!email || !normalizeEmail(email)) return 'email_required';
  if (!verifiedAt) return 'email_unverified';
  if (!pinVerified) return 'pin_required';

  return 'ready';
}

function normalizeEmail(email: string): string {
  return email.normalize('NFKC').trim().toLocaleLowerCase('en-US');
}

function nextPasskeyAttempt(input: {
  ceremonyFailed?: boolean;
  explicitPassword?: boolean;
  retryRequested?: boolean;
}): PasskeyAttempt {
  if (input.explicitPassword) return 'password_fallback';
  if (input.retryRequested || input.ceremonyFailed) return 'retry_available';

  return 'passkey_default';
}

function revokeCredential(status: CredentialStatus): CredentialStatus {
  return status === 'active' ? 'revoked' : status;
}

function validateCeremony(input: {
  challenge: ChallengeExpectation;
  now: Date;
  receivedChallengeHash: string;
  receivedOrigin: string;
  receivedRpId: string;
  credentialStatus: CredentialStatus;
  userVerified: boolean;
  storedSignCount: number;
  receivedSignCount: number;
}): CeremonyResult {
  if (input.challenge.consumedAt) return { ok: false, failure: 'challenge_replayed' };
  if (input.now >= input.challenge.expiresAt) return { ok: false, failure: 'challenge_expired' };
  if (input.receivedChallengeHash !== input.challenge.challengeHash)
    return { ok: false, failure: 'challenge_mismatch' };
  if (input.receivedOrigin !== input.challenge.origin) return { ok: false, failure: 'origin_mismatch' };
  if (input.receivedRpId !== input.challenge.rpId) return { ok: false, failure: 'rp_id_mismatch' };
  if (input.credentialStatus === 'revoked') return { ok: false, failure: 'credential_revoked' };
  if (input.challenge.userVerification === 'required' && !input.userVerified)
    return { ok: false, failure: 'user_verification_required' };
  if (input.receivedSignCount < input.storedSignCount) return { ok: false, failure: 'sign_count_regression' };

  return { ok: true, nextSignCount: input.receivedSignCount };
}

export {
  emailGate,
  nextPasskeyAttempt,
  normalizeEmail,
  revokeCredential,
  validateCeremony,
  type AccountSessionClaims,
  type CeremonyResult,
  type ChallengeExpectation,
  type EmailGate,
  type PasskeyAttempt,
  type PasskeyFailure,
  type UserVerification,
};
