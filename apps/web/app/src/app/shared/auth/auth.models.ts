export type ResponseEnvelope<T> = {
  status?: number;
  message: string;
  data: T;
  meta?: Record<string, unknown>;
};

export type AuthUser = {
  accountId: string;
  email: string;
  emailVerifiedAt: string | null;
  id: string;
  role: string;
};

export type SessionResponse = ResponseEnvelope<{
  authenticated: boolean;
  kind: 'anonymous' | 'restricted' | 'full';
  user: AuthUser | null;
  expiresAt?: string;
  verifiedEmail?: string;
}>;

export type EmailOtpDelivery = {
  flowId: string;
  resendAvailableAt: string;
};

export type RestrictedAccount = {
  accountId: string;
  name: string;
  role: string;
  selected: boolean;
};
