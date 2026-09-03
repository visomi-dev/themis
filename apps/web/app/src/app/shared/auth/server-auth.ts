import { HttpClient } from '@angular/common/http';
import { REQUEST, computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AUTH_REQUEST_CONTEXT } from './auth-request-context.token';
import { Auth } from './auth';
import type { AuthUser, EmailOtpDelivery, ResponseEnvelope, RestrictedAccount, SessionResponse } from './auth.models';

@Injectable()
export class ServerAuth extends Auth {
  private readonly http = inject(HttpClient);
  private readonly request = inject(REQUEST, { optional: true });
  private readonly requestContext = inject(AUTH_REQUEST_CONTEXT, { optional: true });
  private readonly $sessionLoaded = signal(false);
  private readonly $user = signal<AuthUser | null>(this.requestContext?.user ?? null);

  readonly isAuthenticated = computed(() => this.$user() !== null);
  readonly sessionLoaded = this.$sessionLoaded.asReadonly();
  readonly user = this.$user.asReadonly();

  async ensureSessionLoaded(): Promise<void> {
    if (this.$sessionLoaded()) return;

    if (this.requestContext !== null && this.requestContext !== undefined) {
      this.$user.set(this.requestContext.user);
      this.$sessionLoaded.set(true);

      return;
    }

    if (!this.hasSessionCookie()) {
      this.$user.set(null);
      this.$sessionLoaded.set(true);

      return;
    }

    try {
      const response = await firstValueFrom(this.http.get<SessionResponse>('/api/auth/session'));

      this.$user.set(response.data.kind === 'full' ? response.data.user : null);
    } catch {
      this.$user.set(null);
    } finally {
      this.$sessionLoaded.set(true);
    }
  }

  async requestEmailOtp(email: string): Promise<EmailOtpDelivery> {
    const response = await firstValueFrom(
      this.http.post<ResponseEnvelope<EmailOtpDelivery>>('/api/auth/email-otp/request', { email }),
    );

    return response.data;
  }

  async verifyEmailOtp(flowId: string, pin: string): Promise<void> {
    await firstValueFrom(this.http.post('/api/auth/email-otp/verify', { flowId, pin }));
  }

  async getRestrictedAccounts(): Promise<RestrictedAccount[]> {
    const response = await firstValueFrom(
      this.http.get<ResponseEnvelope<{ accounts: RestrictedAccount[] }>>('/api/auth/restricted/accounts'),
    );

    return response.data.accounts;
  }

  async selectRestrictedAccount(accountId: string): Promise<RestrictedAccount> {
    const response = await firstValueFrom(
      this.http.post<ResponseEnvelope<RestrictedAccount>>('/api/auth/restricted/accounts/select', { accountId }),
    );

    return response.data;
  }

  acceptAuthenticatedUser(user: AuthUser): void {
    this.$user.set(user);
    this.$sessionLoaded.set(true);
  }

  async signOut(): Promise<void> {
    await firstValueFrom(this.http.post('/api/auth/sign-out', {}, { responseType: 'text' }));
    this.$user.set(null);
    this.$sessionLoaded.set(true);
  }

  private hasSessionCookie(): boolean {
    const cookieHeader = this.request?.headers.get('cookie');

    return cookieHeader?.split(';').some((cookie) => cookie.trim().startsWith('connect.sid=')) ?? false;
  }
}
