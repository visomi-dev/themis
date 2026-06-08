import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { PLATFORM_ID, REQUEST, REQUEST_CONTEXT, computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { PENDING_CHALLENGE_KEY } from '../constants/storage';

import type {
  AuthChallenge,
  AuthUser,
  AuthenticatedResponse,
  ChallengeOrAuthenticatedResponse,
  ChallengeResponse,
  CredentialsPayload,
  SessionResponse,
} from './auth.models';

type AuthRequestContext = {
  user?: AuthUser;
};

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly request = inject(REQUEST, { optional: true });
  private readonly requestContext = inject<AuthRequestContext | null>(REQUEST_CONTEXT, { optional: true });

  private readonly $pendingChallenge = signal<AuthChallenge | null>(this.readStoredChallenge());
  private readonly $sessionLoaded = signal(false);
  private readonly $submitting = signal(false);
  private readonly $user = signal<AuthUser | null>(null);
  private readonly $verificationSubmitting = signal(false);

  readonly isAuthenticated = computed(() => this.$user() !== null);
  readonly pendingChallenge = this.$pendingChallenge.asReadonly();
  readonly sessionLoaded = this.$sessionLoaded.asReadonly();
  readonly submitting = this.$submitting.asReadonly();
  readonly user = this.$user.asReadonly();
  readonly verificationSubmitting = this.$verificationSubmitting.asReadonly();

  async ensureSessionLoaded() {
    if (this.$sessionLoaded()) {
      return;
    }

    if (isPlatformServer(this.platformId) && this.requestContext?.user) {
      this.$user.set(this.requestContext.user);
      this.$sessionLoaded.set(true);

      return;
    }

    if (isPlatformServer(this.platformId) && !this.hasSessionCookie()) {
      this.$user.set(null);
      this.$sessionLoaded.set(true);

      return;
    }

    try {
      const response = await firstValueFrom(this.http.get<SessionResponse>('/api/auth/session'));

      this.$user.set(response.data.user);
    } catch {
      this.$user.set(null);
    } finally {
      this.$sessionLoaded.set(true);
    }
  }

  private hasSessionCookie() {
    const cookieHeader = this.request?.headers.get('cookie');

    return cookieHeader?.split(';').some((cookie) => cookie.trim().startsWith('connect.sid=')) ?? false;
  }

  async signInWithPassword(payload: CredentialsPayload) {
    this.$submitting.set(true);

    try {
      const response = await firstValueFrom(
        this.http.post<ChallengeOrAuthenticatedResponse>('/api/auth/sign-in/password', payload),
      );

      if ('authenticated' in response.data) {
        this.$user.set(response.data.user);
        this.$sessionLoaded.set(true);
        this.setPendingChallenge(null);

        return response.data;
      }

      this.setPendingChallenge({
        ...response.data,
        rememberDevice: payload.rememberDevice ?? false,
      });

      return response.data;
    } catch (error) {
      console.error(error);

      throw error;
    } finally {
      this.$submitting.set(false);
    }
  }

  async signUp(payload: CredentialsPayload) {
    this.$submitting.set(true);

    try {
      const response = await firstValueFrom(this.http.post<ChallengeResponse>('/api/auth/sign-up', payload));

      this.setPendingChallenge(response.data);

      return response.data;
    } catch (error) {
      console.error(error);

      throw error;
    } finally {
      this.$submitting.set(false);
    }
  }

  async submitVerification(pin: string) {
    const challenge = this.$pendingChallenge();

    if (!challenge) {
      throw new Error('No pending verification challenge is available.');
    }

    this.$verificationSubmitting.set(true);

    try {
      const endpoint = challenge.purpose === 'sign_in' ? '/api/auth/sign-in/verify' : '/api/auth/sign-up/verify';

      const response = await firstValueFrom(
        this.http.post<AuthenticatedResponse>(endpoint, {
          challengeId: challenge.challengeId,
          pin,
          rememberDevice: challenge.purpose === 'sign_in' ? (challenge.rememberDevice ?? false) : false,
        }),
      );

      this.$user.set(response.data.user);
      this.$sessionLoaded.set(true);
      this.setPendingChallenge(null);

      return response.data.user;
    } finally {
      this.$verificationSubmitting.set(false);
    }
  }

  async resendVerification() {
    const challenge = this.$pendingChallenge();

    if (!challenge) {
      throw new Error('No pending verification challenge is available.');
    }

    const response = await firstValueFrom(
      this.http.post<ChallengeResponse>('/api/auth/verification/resend', {
        challengeId: challenge.challengeId,
      }),
    );

    this.setPendingChallenge(response.data);

    return response.data;
  }

  async signOut() {
    await firstValueFrom(this.http.post('/api/auth/sign-out', {}, { responseType: 'text' }));

    this.$user.set(null);
    this.setPendingChallenge(null);
    this.$sessionLoaded.set(true);
  }

  async requestPasswordReset(email: string) {
    await firstValueFrom(this.http.post('/api/auth/password/forgotten', { email }));
  }

  private readStoredChallenge() {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    const storedChallenge = window.sessionStorage.getItem(PENDING_CHALLENGE_KEY);

    if (!storedChallenge) {
      return null;
    }

    try {
      return JSON.parse(storedChallenge) as AuthChallenge;
    } catch {
      window.sessionStorage.removeItem(PENDING_CHALLENGE_KEY);

      return null;
    }
  }

  private setPendingChallenge(challenge: AuthChallenge | null) {
    this.$pendingChallenge.set(challenge);

    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (!challenge) {
      window.sessionStorage.removeItem(PENDING_CHALLENGE_KEY);

      return;
    }

    window.sessionStorage.setItem(PENDING_CHALLENGE_KEY, JSON.stringify(challenge));
  }
}
