import { inject } from '@angular/core';
import { Router } from '@angular/router';

import { APP_URL } from '../constants/routes';

import { Auth } from './auth';

export async function guestGuard() {
  const auth = inject(Auth);
  const router = inject(Router);

  await auth.ensureSessionLoaded();

  return auth.isAuthenticated() ? router.createUrlTree([APP_URL]) : true;
}
