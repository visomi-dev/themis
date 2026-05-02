import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { PLATFORM_ID, REQUEST, REQUEST_CONTEXT, computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { PENDING_CHALLENGE_KEY } from '../constants/storage';

import type {
  AuthChallenge,
  AuthUser,
  AuthenticatedResponse,
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

  private readonly pendingChallengeState = signal<AuthChallenge | null>(this.readStoredChallenge());
  private readonly sessionLoadedState = signal(false);
  private readonly submittingState = signal(false);
  private readonly userState = signal<AuthUser | null>(null);
  private readonly verificationSubmittingState = signal(false);

  readonly isAuthenticated = computed(() => this.userState() !== null);
  readonly pendingChallenge = this.pendingChallengeState.asReadonly();
  readonly sessionLoaded = this.sessionLoadedState.asReadonly();
  readonly submitting = this.submittingState.asReadonly();
  readonly user = this.userState.asReadonly();
  readonly verificationSubmitting = this.verificationSubmittingState.asReadonly();

  async ensureSessionLoaded() {
    if (this.sessionLoadedState()) {
      return;
    }

    if (isPlatformServer(this.platformId) && this.requestContext?.user) {
      this.userState.set(this.requestContext.user);
      this.sessionLoadedState.set(true);

      return;
    }

    if (isPlatformServer(this.platformId) && !this.requestContext?.user) {
      this.userState.set(null);
      this.sessionLoadedState.set(true);

      return;
    }

    try {
      const response = await firstValueFrom(this.http.get<SessionResponse>('/api/auth/session'));

      this.userState.set(response.data.user);
    } catch {
      this.userState.set(null);
    } finally {
      this.sessionLoadedState.set(true);
    }
  }

  async signInWithPassword(payload: CredentialsPayload) {
    this.submittingState.set(true);

    try {
      const response = await firstValueFrom(this.http.post<ChallengeResponse>('/api/auth/sign-in/password', payload));

      this.setPendingChallenge(response.data);

      return response.data;
    } catch (error) {
      console.error(error);

      throw error;
    } finally {
      this.submittingState.set(false);
    }
  }

  async signUp(payload: CredentialsPayload) {
    this.submittingState.set(true);

    try {
      const response = await firstValueFrom(this.http.post<ChallengeResponse>('/api/auth/sign-up', payload));

      this.setPendingChallenge(response.data);

      return response.data;
    } catch (error) {
      console.error(error);

      throw error;
    } finally {
      this.submittingState.set(false);
    }
  }

  async submitVerification(pin: string) {
    const challenge = this.pendingChallengeState();

    if (!challenge) {
      throw new Error('No pending verification challenge is available.');
    }

    this.verificationSubmittingState.set(true);

    try {
      const endpoint = challenge.purpose === 'sign_in' ? '/api/auth/sign-in/verify' : '/api/auth/sign-up/verify';

      const response = await firstValueFrom(
        this.http.post<AuthenticatedResponse>(endpoint, {
          challengeId: challenge.challengeId,
          pin,
        }),
      );

      this.userState.set(response.data.user);
      this.sessionLoadedState.set(true);
      this.setPendingChallenge(null);

      return response.data.user;
    } finally {
      this.verificationSubmittingState.set(false);
    }
  }

  async resendVerification() {
    const challenge = this.pendingChallengeState();

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

    this.userState.set(null);
    this.setPendingChallenge(null);
    this.sessionLoadedState.set(true);
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
    this.pendingChallengeState.set(challenge);

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
