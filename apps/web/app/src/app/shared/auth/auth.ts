import type { Signal } from '@angular/core';

import type { AuthUser, EmailOtpDelivery, RestrictedAccount, SessionResponse } from './auth.models';

export abstract class Auth {
  abstract readonly isAuthenticated: Signal<boolean>;
  abstract readonly sessionLoaded: Signal<boolean>;
  abstract readonly user: Signal<AuthUser | null>;

  abstract ensureSessionLoaded(): Promise<void>;
  abstract requestEmailOtp(email: string): Promise<EmailOtpDelivery>;
  abstract verifyEmailOtp(flowId: string, pin: string): Promise<void>;
  abstract getRestrictedAccounts(): Promise<RestrictedAccount[]>;
  abstract selectRestrictedAccount(accountId: string): Promise<RestrictedAccount>;
  abstract acceptAuthenticatedUser(user: AuthUser): void;
  abstract signOut(): Promise<void>;
}

export type { SessionResponse };
