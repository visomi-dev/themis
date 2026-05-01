import type { Route } from '@angular/router';

import { authenticatedGuard } from './shared/auth/authenticated-guard';
import { anonymousGuard } from './shared/auth/anonymous-guard';
import { verificationGuard } from './shared/auth/verification-guard';
import {
  ACTIVATION_PATH,
  APP_PATH,
  DASHBOARD_PATH,
  FORGOTTEN_PASSWORD_PATH,
  PROJECTS_PATH,
  PROJECT_ID_PATH,
  PROJECT_NEW_PATH,
  SIGN_IN_PATH,
  SIGN_UP_PATH,
  VERIFY_EMAIL_PATH,
} from './shared/constants/routes';

export const appRoutes: Route[] = [
  {
    path: APP_PATH,
    pathMatch: 'full',
    redirectTo: DASHBOARD_PATH,
  },

  {
    path: SIGN_IN_PATH,
    data: { hideAppShell: true },
    loadComponent: () => import('./auth/sign-in/sign-in').then((module) => module.SignIn),
  },
  {
    path: SIGN_UP_PATH,
    canActivate: [anonymousGuard],
    data: { hideAppShell: true },
    loadComponent: () => import('./auth/sign-up/sign-up').then((module) => module.SignUp),
  },
  {
    path: VERIFY_EMAIL_PATH,
    canActivate: [verificationGuard],
    data: { hideAppShell: true },
    loadComponent: () => import('./auth/verify-email/verify-email').then((module) => module.VerifyEmail),
  },
  {
    path: FORGOTTEN_PASSWORD_PATH,
    canActivate: [anonymousGuard],
    data: { hideAppShell: true },
    loadComponent: () =>
      import('./auth/forgotten-password/forgotten-password').then((module) => module.ForgottenPassword),
  },

  {
    path: DASHBOARD_PATH,
    canActivate: [authenticatedGuard],
    loadComponent: () => import('./dashboard/dashboard').then((module) => module.Dashboard),
  },
  {
    path: ACTIVATION_PATH,
    canActivate: [authenticatedGuard],
    loadComponent: () => import('./activation/activation').then((module) => module.Activation),
  },
  {
    path: PROJECTS_PATH,
    canActivate: [authenticatedGuard],
    loadComponent: () => import('./projects/projects').then((module) => module.Projects),
    pathMatch: 'full',
  },
  {
    path: `${PROJECTS_PATH}/${PROJECT_NEW_PATH}`,
    canActivate: [authenticatedGuard],
    loadComponent: () => import('./projects/project-new/project-new').then((module) => module.ProjectNew),
  },
  {
    path: `${PROJECTS_PATH}/${PROJECT_ID_PATH}`,
    canActivate: [authenticatedGuard],
    loadComponent: () => import('./projects/project-detail/project-detail').then((module) => module.ProjectDetail),
  },

  {
    path: '**',
    redirectTo: APP_PATH,
  },
];
