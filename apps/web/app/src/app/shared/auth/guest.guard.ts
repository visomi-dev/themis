import { inject } from '@angular/core';
import type { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';

import { APP_URL } from '../constants/routes';

import { Auth } from './auth';

export const guestGuard: CanActivateFn = async () => {
  const auth = inject(Auth);
  const router = inject(Router);

  await auth.ensureSessionLoaded();

  return auth.isAuthenticated() ? router.createUrlTree([APP_URL]) : true;
};
