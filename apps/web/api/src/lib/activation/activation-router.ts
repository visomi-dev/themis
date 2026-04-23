import { Router } from 'express';

import type { AuthConfig } from '../config/auth-config';
import { authMiddleware } from '../auth/auth-middleware';
import { apiKeyIdParamSchema, readValidated, validateRequest, z } from '../http/route-schemas';

import { activationService } from './activation-service';
import type { ActivationMilestone } from './activation-types';

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

class ActivationRouter {
  private configured = false;

  private readonly router = Router();

  configure(config: AuthConfig) {
    if (this.configured) {
      return this.router;
    }

    activationService.configure(config);

    this.router.use(authMiddleware.authenticated());

    this.router.get('/', async function activationStateHandler(req, res) {
      res.send(await activationService.getActivationState(authMiddleware.context(req)));
    });

    this.router.post(
      '/api-keys',
      validateRequest({ body: createApiKeySchema }),
      async function createApiKeyHandler(req, res) {
        const { label } = readValidated<{ body: typeof createApiKeySchema }>(req).body!;
        const key = await activationService.createApiKey(authMiddleware.context(req), label);

        res.status(201).send(key);
      },
    );

    this.router.post(
      '/milestones',
      validateRequest({ body: milestoneBodySchema }),
      async function milestoneHandler(req, res) {
        const { metadata, milestone } = readValidated<{ body: typeof milestoneBodySchema }>(req).body!;

        await activationService.recordMilestone(
          authMiddleware.context(req),
          milestone as ActivationMilestone,
          metadata,
        );

        res.status(204).send();
      },
    );

    this.router.post(
      '/api-keys/:apiKeyId/revoke',
      validateRequest({ params: apiKeyParamsSchema }),
      async function revokeApiKeyHandler(req, res) {
        const { apiKeyId } = readValidated<{ params: typeof apiKeyParamsSchema }>(req).params!;
        await activationService.revokeApiKey(authMiddleware.context(req), apiKeyId);
        res.status(204).send();
      },
    );

    this.configured = true;

    return this.router;
  }
}

const activationRouter = new ActivationRouter();

export { activationOpenApiPaths, activationRouter };
