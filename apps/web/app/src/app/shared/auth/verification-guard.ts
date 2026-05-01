import { inject } from '@angular/core';
import { Router } from '@angular/router';

import { APP_URL, SIGN_IN_URL } from '../constants/routes';

import { Auth } from './auth';

export async function verificationGuard() {
  const auth = inject(Auth);

  const router = inject(Router);

  await auth.ensureSessionLoaded();

  if (auth.isAuthenticated()) {
    return router.createUrlTree([APP_URL]);
  }

  return auth.pendingChallenge() ? true : router.createUrlTree([SIGN_IN_URL]);
}
