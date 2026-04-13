export type AuthMode = 'sign_in' | 'sign_up';

export type AuthUser = {
  email: string;
  emailVerifiedAt: string | null;
  id: string;
};

export type AuthChallenge = {
  challengeId: string;
  email: string;
  expiresAt: string;
  purpose: AuthMode;
};

export type SessionResponse = {
  authenticated: boolean;
  user: AuthUser | null;
};
