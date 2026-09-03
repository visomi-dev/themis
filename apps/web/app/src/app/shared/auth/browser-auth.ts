import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { SESSION_PRESENCE_KEY } from '../constants/storage';

import { Auth } from './auth';
import type { AuthUser, EmailOtpDelivery, ResponseEnvelope, RestrictedAccount, SessionResponse } from './auth.models';

@Injectable({ providedIn: 'root' })
export class BrowserAuth extends Auth {
  private readonly http = inject(HttpClient);
  private readonly document = inject(DOCUMENT);
  private readonly $sessionLoaded = signal(false);
  private readonly $user = signal<AuthUser | null>(null);

  readonly isAuthenticated = computed(() => this.$user() !== null);
  readonly sessionLoaded = this.$sessionLoaded.asReadonly();
  readonly user = this.$user.asReadonly();

  async ensureSessionLoaded(): Promise<void> {
    if (this.$sessionLoaded()) return;

    if (!this.hasSessionHint()) {
      this.$user.set(null);
      this.$sessionLoaded.set(true);

      return;
    }

    try {
      const response = await firstValueFrom(this.http.get<SessionResponse>('/api/auth/session'));

      this.$user.set(response.data.kind === 'full' ? response.data.user : null);

      if (response.data.kind !== 'full') this.clearSessionHint();
    } catch {
      this.$user.set(null);
      this.clearSessionHint();
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
    this.clearSessionHint();
  }

  private hasSessionHint(): boolean {
    return this.readCookie(SESSION_PRESENCE_KEY) === '1';
  }

  private clearSessionHint(): void {
    this.document.cookie = `${SESSION_PRESENCE_KEY}=; Path=/; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }

  private readCookie(name: string): string | null {
    for (const cookie of this.document.cookie ? this.document.cookie.split(';') : []) {
      const [rawKey, ...rest] = cookie.trim().split('=');

      if (rawKey === name) return rest.join('=');
    }

    return null;
  }
}
