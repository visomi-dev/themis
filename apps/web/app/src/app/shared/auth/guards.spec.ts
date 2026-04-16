import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { Auth } from './auth';
import { authenticatedGuard } from './authenticated.guard';
import { guestGuard } from './guest.guard';
import { verificationGuard } from './verification.guard';

describe('auth guards', () => {
  const createRouter = () => ({
    createUrlTree: (segments: string[]) => segments.join('/'),
  });

  const createAuth = (authenticated: boolean, hasChallenge = false) => ({
    ensureSessionLoaded: vi.fn().mockResolvedValue(undefined),
    isAuthenticated: () => authenticated,
    pendingChallenge: () => (hasChallenge ? { challengeId: 'challenge-1' } : null),
  });

  it('redirects unauthenticated users away from protected routes', async () => {
    const router = createRouter();

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: Auth, useValue: createAuth(false) },
      ],
    });

    const result = await TestBed.runInInjectionContext(() => authenticatedGuard());

    expect(result).toBe('/sign-in');
  });

  it('redirects authenticated guests back to the app', async () => {
    const router = createRouter();

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: Auth, useValue: createAuth(true) },
      ],
    });

    const result = await TestBed.runInInjectionContext(() => guestGuard());

    expect(result).toBe('/');
  });

  it('allows verification only when a challenge is active', async () => {
    const router = createRouter();

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: Auth, useValue: createAuth(false) },
      ],
    });

    const result = await TestBed.runInInjectionContext(() => verificationGuard());

    expect(result).toBe('/sign-in');
  });

  it('allows authenticated navigation when a session exists', async () => {
    const router = createRouter();

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: Auth, useValue: createAuth(true) },
      ],
    });

    const result = await TestBed.runInInjectionContext(() => authenticatedGuard());

    expect(result).toBe(true);
  });

  it('allows verification when a challenge is active', async () => {
    const router = createRouter();

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: Auth, useValue: createAuth(false, true) },
      ],
    });

    const result = await TestBed.runInInjectionContext(() => verificationGuard());

    expect(result).toBe(true);
  });
});
