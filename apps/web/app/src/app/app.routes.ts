import { Route } from '@angular/router';

import { authGuard, guestGuard } from './core/auth/auth.guards';
import { AuthForm } from './features/auth/auth-form/auth-form';
import { VerifyEmail } from './features/auth/verify-email/verify-email';
import { Dashboard } from './features/dashboard/dashboard/dashboard';

export const appRoutes: Route[] = [
  {
    path: '',
    component: Dashboard,
    canActivate: [authGuard],
  },
  {
    path: 'sign-in',
    component: AuthForm,
    canActivate: [guestGuard],
    data: {
      mode: 'sign_in',
    },
  },
  {
    path: 'sign-up',
    component: AuthForm,
    canActivate: [guestGuard],
    data: {
      mode: 'sign_up',
    },
  },
  {
    path: 'verify-email',
    component: VerifyEmail,
    canActivate: [guestGuard],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
