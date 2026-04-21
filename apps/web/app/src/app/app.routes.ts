import type { Route } from '@angular/router';

import { authenticatedGuard } from './shared/auth/authenticated.guard';
import { guestGuard } from './shared/auth/guest.guard';
import { verificationGuard } from './shared/auth/verification.guard';
import {
  APP_PATH,
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
    canActivate: [authenticatedGuard],
    loadComponent: () => import('./pages/home/home').then((module) => module.Home),
  },
  {
    path: PROJECTS_PATH,
    canActivate: [authenticatedGuard],
    loadComponent: () => import('./pages/projects/projects').then((module) => module.Projects),
    pathMatch: 'full',
  },
  {
    path: `${PROJECTS_PATH}/${PROJECT_NEW_PATH}`,
    canActivate: [authenticatedGuard],
    loadComponent: () => import('./pages/projects/project-new/project-new').then((module) => module.ProjectNew),
  },
  {
    path: `${PROJECTS_PATH}/${PROJECT_ID_PATH}`,
    canActivate: [authenticatedGuard],
    loadComponent: () =>
      import('./pages/projects/project-detail/project-detail').then((module) => module.ProjectDetail),
  },
  {
    path: SIGN_IN_PATH,
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/auth/sign-in/sign-in').then((module) => module.SignIn),
  },
  {
    path: SIGN_UP_PATH,
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/auth/sign-up/sign-up').then((module) => module.SignUp),
  },
  {
    path: VERIFY_EMAIL_PATH,
    canActivate: [verificationGuard],
    loadComponent: () => import('./pages/auth/verify-email/verify-email').then((module) => module.VerifyEmail),
  },
  {
    path: FORGOTTEN_PASSWORD_PATH,
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./pages/auth/forgotten-password/forgotten-password').then((module) => module.ForgottenPassword),
  },
  {
    path: '**',
    redirectTo: APP_PATH,
  },
];
