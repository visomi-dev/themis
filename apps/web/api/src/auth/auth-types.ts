export type VerificationPurpose = 'sign_in' | 'sign_up';

export type AuthUser = {
  accountId: string;
  email: string;
  emailVerifiedAt: string | null;
  id: string;
  role: string;
};

export type AuthChallengePayload = {
  challengeId: string;
  email: string;
  expiresAt: string;
  purpose: VerificationPurpose;
};
