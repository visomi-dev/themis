import { HttpClient } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { PENDING_CHALLENGE_KEY } from '../constants/storage';

import type { AuthChallenge, AuthMode, AuthUser, CredentialsPayload, SessionResponse } from './auth.models';

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);

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

    if (!isPlatformBrowser(this.platformId)) {
      this.userState.set(null);
      this.sessionLoadedState.set(true);
      return;
    }

    try {
      const response = await firstValueFrom(this.http.get<SessionResponse>('/api/auth/session'));

      this.userState.set(response.user);
    } catch {
      this.userState.set(null);
    } finally {
      this.sessionLoadedState.set(true);
    }
  }

  async signInWithPassword(payload: CredentialsPayload) {
    this.submittingState.set(true);

    try {
      const response = await firstValueFrom(this.http.post<AuthChallenge>('/api/auth/sign-in/password', payload));

      this.setPendingChallenge(response);

      return response;
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
      const response = await firstValueFrom(this.http.post<AuthChallenge>('/api/auth/sign-up', payload));

      this.setPendingChallenge(response);

      return response;
    } catch (error) {
      console.error(error);

      throw error;
    } finally {
      this.submittingState.set(false);
    }
  }

  async submitCredentials(mode: AuthMode, payload: CredentialsPayload) {
    this.submittingState.set(true);

    try {
      const endpoint = mode === 'sign_in' ? '/api/auth/sign-in/password' : '/api/auth/sign-up';
      const challenge = await firstValueFrom(this.http.post<AuthChallenge>(endpoint, payload));

      this.setPendingChallenge(challenge);

      return challenge;
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
        this.http.post<{ authenticated: boolean; user: AuthUser }>(endpoint, {
          challengeId: challenge.challengeId,
          pin,
        }),
      );

      this.userState.set(response.user);
      this.sessionLoadedState.set(true);
      this.setPendingChallenge(null);

      return response.user;
    } finally {
      this.verificationSubmittingState.set(false);
    }
  }

  async resendVerification() {
    const challenge = this.pendingChallengeState();

    if (!challenge) {
      throw new Error('No pending verification challenge is available.');
    }

    const nextChallenge = await firstValueFrom(
      this.http.post<AuthChallenge>('/api/auth/verification/resend', {
        challengeId: challenge.challengeId,
      }),
    );

    this.setPendingChallenge(nextChallenge);

    return nextChallenge;
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
