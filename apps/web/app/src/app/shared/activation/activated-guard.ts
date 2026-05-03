import { inject } from '@angular/core';
import { Router, type ActivatedRouteSnapshot, type RouterStateSnapshot } from '@angular/router';

import { ACTIVATION_URL } from '../constants/routes';

import { Activation } from './activation';
import type { ActivationMilestone } from './activation.models';

function hasCompletedActivation(milestones: ActivationMilestone[]) {
  return milestones.includes('activation_completed') || milestones.includes('activation_skipped');
}

export async function activatedGuard(_route: ActivatedRouteSnapshot, _state: RouterStateSnapshot) {
  const activation = inject(Activation);

  const router = inject(Router);

  const activationState = await activation.loadState();

  return hasCompletedActivation(activationState.milestones) ? true : router.createUrlTree([ACTIVATION_URL]);
}
