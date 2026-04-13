import { Route } from '@angular/router';

import { authGuard, guestGuard } from './core/auth/auth.guards';
import { DashboardPageComponent } from './features/dashboard/dashboard-page.component';
import { AuthFormPageComponent } from './features/auth/auth-form-page.component';
import { VerifyEmailPageComponent } from './features/auth/verify-email-page.component';

export const appRoutes: Route[] = [
  {
    path: '',
    component: DashboardPageComponent,
    canActivate: [authGuard],
  },
  {
    path: 'sign-in',
    component: AuthFormPageComponent,
    canActivate: [guestGuard],
    data: {
      mode: 'sign_in',
    },
  },
  {
    path: 'sign-up',
    component: AuthFormPageComponent,
    canActivate: [guestGuard],
    data: {
      mode: 'sign_up',
    },
  },
  {
    path: 'verify-email',
    component: VerifyEmailPageComponent,
    canActivate: [guestGuard],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
