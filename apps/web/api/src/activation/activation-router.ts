import { Router } from 'express';

import { authMiddleware } from '../auth/auth-middleware';
import { readValidated, validateRequest } from '../shared/http/route-schemas';

import {
  createApiKeySchema,
  milestoneBodySchema,
  apiKeyParamsSchema,
  activationOpenApiPaths,
} from './activation-schemas';
import { createApiKey, getActivationState, recordMilestone, revokeApiKey } from './activation-service';
import type { ActivationMilestone } from './activation-types';

const activationRouter = Router();

activationRouter.use(authMiddleware.authenticated());

activationRouter.get('/', async function activationStateHandler(req, res) {
  res.send(await getActivationState(authMiddleware.context(req)));
});

activationRouter.post(
  '/api-keys',
  validateRequest({ body: createApiKeySchema }),
  async function createApiKeyHandler(req, res) {
    const { label } = readValidated<{ body: typeof createApiKeySchema }>(req).body!;
    const key = await createApiKey(authMiddleware.context(req), label);

    res.status(201).send(key);
  },
);

activationRouter.post(
  '/milestones',
  validateRequest({ body: milestoneBodySchema }),
  async function milestoneHandler(req, res) {
    const { metadata, milestone } = readValidated<{ body: typeof milestoneBodySchema }>(req).body!;

    await recordMilestone(authMiddleware.context(req), milestone as ActivationMilestone, metadata);

    res.status(204).send();
  },
);

activationRouter.post(
  '/api-keys/:apiKeyId/revoke',
  validateRequest({ params: apiKeyParamsSchema }),
  async function revokeApiKeyHandler(req, res) {
    const { apiKeyId } = readValidated<{ params: typeof apiKeyParamsSchema }>(req).params!;
    await revokeApiKey(authMiddleware.context(req), apiKeyId);
    res.status(204).send();
  },
);

export { activationOpenApiPaths, activationRouter };
