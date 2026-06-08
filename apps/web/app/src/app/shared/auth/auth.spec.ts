import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID, REQUEST } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Auth } from './auth';

describe('Auth', () => {
  beforeEach(() => {
    sessionStorage.clear();

    TestBed.configureTestingModule({
      providers: [Auth, provideHttpClient(), provideHttpClientTesting()],
    });
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('stores the pending challenge after credential submission', async () => {
    const auth = TestBed.inject(Auth);

    const http = TestBed.inject(HttpTestingController);

    const submitPromise = auth.signUp({
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

  it('does not fetch the session on the server without a session cookie', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        Auth,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: REQUEST, useValue: new Request('http://localhost:8080/app/sign-in') },
      ],
    });

    const auth = TestBed.inject(Auth);

    await auth.ensureSessionLoaded();

    TestBed.inject(HttpTestingController).expectNone('/api/auth/session');
    expect(auth.sessionLoaded()).toBe(true);
    expect(auth.user()).toBeNull();
  });
});
