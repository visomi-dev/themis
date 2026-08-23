import type { Route } from '@angular/router';

import { authenticatedGuard } from './shared/auth/authenticated-guard';
import { anonymousGuard } from './shared/auth/anonymous-guard';
import { verificationGuard } from './shared/auth/verification-guard';
import { activatedGuard } from './shared/activation/activated-guard';
import {
  ACTIVATION_PATH,
  APP_PATH,
  DASHBOARD_PATH,
  FORGOTTEN_PASSWORD_PATH,
  GALLERY_PATH,
  PROJECTS_PATH,
  PROJECT_ID_PATH,
  PROJECT_NEW_PATH,
  PROJECT_WORKSPACE_PATH,
  WORK_ITEM_PATH,
  TIMELINE_PATH,
  VALIDATION_PATH,
  ITERATION_PATH,
  RESET_PASSWORD_PATH,
  SIGN_IN_PATH,
  SIGN_UP_PATH,
  VERIFY_DEVICE_PATH,
  VERIFY_EMAIL_PATH,
} from './shared/constants/routes';

export const appRoutes: Route[] = [
  {
    path: APP_PATH,
    pathMatch: 'full',
    canActivate: [activatedGuard],
    loadComponent: () => import('./projects/projects').then((module) => module.Projects),
  },

  {
    path: SIGN_IN_PATH,
    canActivate: [anonymousGuard],
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
    data: { hideAppShell: true, verificationPurpose: 'sign_up' },
    loadComponent: () => import('./auth/verify-email/verify-email').then((module) => module.VerifyEmail),
  },
  {
    path: VERIFY_DEVICE_PATH,
    canActivate: [verificationGuard],
    data: { hideAppShell: true, verificationPurpose: 'sign_in' },
    loadComponent: () => import('./auth/verify-device/verify-device').then((module) => module.VerifyDevice),
  },
  {
    path: FORGOTTEN_PASSWORD_PATH,
    canActivate: [anonymousGuard],
    data: { hideAppShell: true },
    loadComponent: () =>
      import('./auth/forgotten-password/forgotten-password').then((module) => module.ForgottenPassword),
  },
  {
    path: RESET_PASSWORD_PATH,
    canActivate: [anonymousGuard],
    data: { hideAppShell: true },
    loadComponent: () => import('./auth/reset-password/reset-password').then((module) => module.ResetPassword),
  },

  {
    path: DASHBOARD_PATH,
    canActivate: [activatedGuard],
    loadComponent: () => import('./dashboard/dashboard').then((module) => module.Dashboard),
  },
  {
    path: ACTIVATION_PATH,
    canActivate: [authenticatedGuard],
    loadComponent: () => import('./activation/activation').then((module) => module.Activation),
  },
  {
    path: PROJECTS_PATH,
    canActivate: [activatedGuard],
    loadComponent: () => import('./projects/projects').then((module) => module.Projects),
    pathMatch: 'full',
  },
  {
    path: `${PROJECTS_PATH}/${PROJECT_NEW_PATH}`,
    canActivate: [activatedGuard],
    loadComponent: () => import('./projects/project-new/project-new').then((module) => module.ProjectNew),
  },
  {
    path: `${PROJECTS_PATH}/${PROJECT_ID_PATH}`,
    pathMatch: 'full',
    redirectTo: `${PROJECTS_PATH}/:projectId/${PROJECT_WORKSPACE_PATH}`,
  },
  {
    path: `${PROJECTS_PATH}/${PROJECT_ID_PATH}/${PROJECT_WORKSPACE_PATH}`,
    canActivate: [activatedGuard],
    loadComponent: () => import('./projects/project-detail/project-detail').then((module) => module.ProjectDetail),
  },
  {
    path: `${PROJECTS_PATH}/${PROJECT_ID_PATH}/${WORK_ITEM_PATH}`,
    canActivate: [activatedGuard],
    loadComponent: () => import('./projects/work-item-detail/work-item-detail').then((module) => module.WorkItemDetail),
  },
  {
    path: `${PROJECTS_PATH}/${PROJECT_ID_PATH}/${TIMELINE_PATH}`,
    canActivate: [activatedGuard],
    loadComponent: () => import('./projects/timeline/timeline').then((module) => module.Timeline),
  },
  {
    path: `${PROJECTS_PATH}/${PROJECT_ID_PATH}/${VALIDATION_PATH}`,
    canActivate: [activatedGuard],
    loadComponent: () => import('./projects/validation/validation').then((module) => module.Validation),
  },
  {
    path: `${PROJECTS_PATH}/${PROJECT_ID_PATH}/${ITERATION_PATH}`,
    canActivate: [activatedGuard],
    loadComponent: () => import('./projects/iteration/iteration').then((module) => module.Iteration),
  },

  {
    path: GALLERY_PATH,
    canActivate: [authenticatedGuard],
    data: { hideAppShell: true },
    loadComponent: () => import('./gallery/gallery').then((module) => module.Gallery),
  },

  {
    path: '**',
    redirectTo: APP_PATH,
  },
];
