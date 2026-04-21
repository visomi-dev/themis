import { Router, type NextFunction, type Request, type Response } from 'express';

import type { AuthConfig } from '../config/auth-config.js';
import { AuthError } from '../auth/auth-errors.js';

import { createActivationService } from './activation-service.js';
import type { ActivationMilestone } from './activation-types.js';

const asNonEmptyString = (value: unknown, fieldName: string) => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new AuthError(400, 'invalid_request', `${fieldName} is required.`);
  }

  return value.trim();
};

const readMetadata = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(value).flatMap(([key, entryValue]) => {
      if (typeof entryValue === 'string' || entryValue === null) {
        return [[key, entryValue]];
      }

      return [];
    }),
  );
};

const requireAuthenticatedUser = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.isAuthenticated() || !req.user) {
    next(new AuthError(401, 'authentication_required', 'Sign in to access activation settings.'));
    return;
  }

  next();
};
const authenticatedUserId = (req: Request) => {
  if (!req.user) {
    throw new AuthError(401, 'authentication_required', 'Sign in to access activation settings.');
  }

  return req.user.id;
};

const buildActivationRouter = (config: AuthConfig) => {
  const router = Router();
  const service = createActivationService(config);

  router.use(requireAuthenticatedUser);

  router.get('/', async (req, res) => {
    res.send(await service.getActivationState(authenticatedUserId(req)));
  });

  router.post('/api-keys', async (req, res) => {
    const label = asNonEmptyString(req.body?.label, 'label');
    const key = await service.createApiKey(authenticatedUserId(req), label);

    res.status(201).send(key);
  });

  router.post('/milestones', async (req, res) => {
    const milestone = asNonEmptyString(req.body?.milestone, 'milestone') as ActivationMilestone;
    const metadata = readMetadata(req.body?.metadata);

    await service.recordMilestone(authenticatedUserId(req), milestone, metadata);

    res.status(204).send();
  });

  router.post('/api-keys/:apiKeyId/revoke', async (req, res) => {
    const apiKeyId = asNonEmptyString(req.params.apiKeyId, 'apiKeyId');
    await service.revokeApiKey(authenticatedUserId(req), apiKeyId);
    res.status(204).send();
  });

  return router;
};

export { buildActivationRouter };
