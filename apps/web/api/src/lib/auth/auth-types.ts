type VerificationPurpose = 'sign_in' | 'sign_up';

type AuthUser = {
  email: string;
  emailVerifiedAt: string | null;
  id: string;
};

type AuthChallengePayload = {
  challengeId: string;
  email: string;
  expiresAt: string;
  purpose: VerificationPurpose;
};

export type { AuthChallengePayload, AuthUser, VerificationPurpose };
