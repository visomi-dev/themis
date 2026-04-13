import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthStateService } from './auth-state.service';

const authGuard: CanActivateFn = async () => {
  const authState = inject(AuthStateService);
  const router = inject(Router);

  await authState.ensureSessionLoaded();

  return authState.isAuthenticated() ? true : router.createUrlTree(['/sign-in']);
};

const guestGuard: CanActivateFn = async () => {
  const authState = inject(AuthStateService);
  const router = inject(Router);

  await authState.ensureSessionLoaded();

  return authState.isAuthenticated() ? router.createUrlTree(['/']) : true;
};

export { authGuard, guestGuard };
