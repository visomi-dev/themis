import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { Auth } from './auth';

describe('Auth', () => {
  beforeEach(() => {
    sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [Auth, provideHttpClient(), provideHttpClientTesting()],
    });
  });

  it('stores the pending challenge after credential submission', async () => {
    const auth = TestBed.inject(Auth);
    const http = TestBed.inject(HttpTestingController);

    const submitPromise = auth.submitCredentials('sign_up', {
      email: 'engineer@themis.dev',
      password: 'S3cureAuth!',
    });

    http.expectOne('/api/auth/sign-up').flush({
      data: {
        challengeId: 'challenge-1',
        email: 'engineer@themis.dev',
        expiresAt: '2026-01-01T00:00:00.000Z',
        purpose: 'sign_up',
      },
    });

    await submitPromise;

    expect(auth.pendingChallenge()?.challengeId).toBe('challenge-1');
    expect(sessionStorage.getItem('themis.pendingChallenge')).toContain('challenge-1');
  });
});
