declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
    interface User {
      accountId: string;
      email: string;
      emailVerifiedAt: string | null;
      id: string;
      role: string;
      authenticationMethod?: 'passkey';
      credentialId?: string;
    }
  }
}

declare module 'express-session' {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface SessionData {
    passport?: {
      user?: {
        accountId: string;
        id: string;
      };
    };
    restrictedAuth?: {
      allowedOperations: Array<'accounts:read' | 'accounts:select' | 'passkeys:enroll' | 'passkeys:verify'>;
      eligibleAccounts: Array<{ accountId: string; name: string; role: string }>;
      expiresAt: number;
      flowId: string;
      issuedAt: number;
      purpose: 'bootstrap_recovery';
      selectedAccountId?: string;
      userId: string;
      verifiedEmail: string;
    };
    passkeyRegistration?: {
      accountId: string;
      challengeId: string;
      flowId: string;
      label: string;
      userId: string;
    };
    authenticatedAt?: number;
    reauthenticatedAt?: number;
    passkeySecurityReauthenticatedAt?: number;
  }
}

export {};
