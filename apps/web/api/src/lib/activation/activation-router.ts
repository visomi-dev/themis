import { Router, type NextFunction, type Request, type Response } from 'express';

import type { AuthConfig } from '../config/auth-config.js';
import { apiKeyIdParamSchema, readValidated, validateRequest, z } from '../http/route-schemas.js';
import { AuthError } from '../auth/auth-errors.js';

import { createActivationService } from './activation-service.js';
import type { ActivationMilestone } from './activation-types.js';

const activationMilestoneSchema = z.enum([
  'activation_completed',
  'activation_skipped',
  'api_key_created',
  'config_copied',
  'seed_prompt_copied',
]);

const metadataSchema = z.record(z.string(), z.string().nullable());

const activationStateSchema = z
  .object({
    apiKeys: z.array(
      z.object({
        createdAt: z.string(),
        id: z.string(),
        label: z.string(),
        lastUsedAt: z.string().nullable(),
        revokedAt: z.string().nullable(),
        tokenPrefix: z.string(),
      }),
    ),
    milestones: z.array(activationMilestoneSchema),
    seedPrompt: z.string(),
  })
  .meta({ id: 'ActivationState' });

const createApiKeySchema = z
  .object({
    label: z.string().min(1).max(80).meta({ description: 'API key label.', example: 'Primary workspace key' }),
  })
  .meta({ id: 'CreateApiKeyRequest' });

const createdApiKeySchema = z
  .object({
    createdAt: z.string(),
    id: z.string(),
    label: z.string(),
    lastUsedAt: z.string().nullable(),
    plaintextToken: z.string(),
    revokedAt: z.string().nullable(),
    tokenPrefix: z.string(),
  })
  .meta({ id: 'CreatedApiKey' });

const milestoneBodySchema = z
  .object({
    metadata: metadataSchema.optional(),
    milestone: activationMilestoneSchema,
  })
  .meta({ id: 'ActivationMilestoneRequest' });

const apiKeyParamsSchema = z.object({ apiKeyId: apiKeyIdParamSchema });

const activationOpenApiPaths = {
  '/activation': {
    get: {
      responses: {
        200: { content: { 'application/json': { schema: activationStateSchema } }, description: 'Activation state.' },
      },
    },
  },
  '/activation/api-keys': {
    post: {
      requestBody: { content: { 'application/json': { schema: createApiKeySchema } } },
      responses: {
        201: { content: { 'application/json': { schema: createdApiKeySchema } }, description: 'API key created.' },
      },
    },
  },
  '/activation/milestones': {
    post: {
      requestBody: { content: { 'application/json': { schema: milestoneBodySchema } } },
      responses: { 204: { description: 'Milestone recorded.' } },
    },
  },
  '/activation/api-keys/{apiKeyId}/revoke': {
    post: {
      requestParams: { path: apiKeyParamsSchema },
      responses: { 204: { description: 'API key revoked.' } },
    },
  },
};

const requireAuthenticatedUser = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.isAuthenticated() || !req.user) {
    next(new AuthError(401, 'authentication_required', 'Sign in to access activation settings.'));
    return;
  }

  next();
};

const authenticatedContext = (req: Request) => {
  if (!req.user) {
    throw new AuthError(401, 'authentication_required', 'Sign in to access activation settings.');
  }

  return {
    accountId: req.user.accountId,
    userId: req.user.id,
  };
};

const buildActivationRouter = (config: AuthConfig) => {
  const router = Router();
  const service = createActivationService(config);

  router.use(requireAuthenticatedUser);

  router.get('/', async (req, res) => {
    res.send(await service.getActivationState(authenticatedContext(req)));
  });

  router.post('/api-keys', validateRequest({ body: createApiKeySchema }), async (req, res) => {
    const { label } = readValidated<{ body: typeof createApiKeySchema }>(req).body!;
    const key = await service.createApiKey(authenticatedContext(req), label);

    res.status(201).send(key);
  });

  router.post('/milestones', validateRequest({ body: milestoneBodySchema }), async (req, res) => {
    const { metadata, milestone } = readValidated<{ body: typeof milestoneBodySchema }>(req).body!;

    await service.recordMilestone(authenticatedContext(req), milestone as ActivationMilestone, metadata);

    res.status(204).send();
  });

  router.post('/api-keys/:apiKeyId/revoke', validateRequest({ params: apiKeyParamsSchema }), async (req, res) => {
    const { apiKeyId } = readValidated<{ params: typeof apiKeyParamsSchema }>(req).params!;
    await service.revokeApiKey(authenticatedContext(req), apiKeyId);
    res.status(204).send();
  });

  return router;
};

export { activationOpenApiPaths, buildActivationRouter };
