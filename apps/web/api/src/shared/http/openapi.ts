import { createDocument } from 'zod-openapi';

import { activationOpenApiPaths } from '../../activation/activation-router';
import { authOpenApiPaths } from '../../auth/auth-router';
import { passkeyOpenApiPaths } from '../../auth/passkey-router';
import { capabilityOpenApiPaths } from '../../capabilities/capability-router';
import { projectsOpenApiPaths } from '../../projects/projects-router';
import { opaqueSyncOpenApiPaths } from '../../sync/opaque-sync-router';
import { webAuthnOpenApiPaths } from '../../webauthn/webauthn-router';
import { testOpenApiPaths } from '../../testing/test-router';

function createOpenApiDocument() {
  const document = createDocument({
    openapi: '3.1.0',
    info: {
      title: 'Themis API',
      version: '0.1.0',
    },
    paths: {
      ...authOpenApiPaths,
      ...passkeyOpenApiPaths,
      ...activationOpenApiPaths,
      ...projectsOpenApiPaths,
      ...opaqueSyncOpenApiPaths,
      ...capabilityOpenApiPaths,
      ...webAuthnOpenApiPaths,
      ...testOpenApiPaths,
    },
  });

  const errorResponses = {
    400: {
      content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } },
      description: 'Invalid request.',
    },
    401: {
      content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } },
      description: 'Authentication required.',
    },
    403: {
      content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } },
      description: 'Access denied.',
    },
    404: {
      content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } },
      description: 'Resource not found.',
    },
    409: {
      content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } },
      description: 'Request conflicts with current state.',
    },
    500: {
      content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorEnvelope' } } },
      description: 'Internal server error.',
    },
  };

  document.components ??= {};
  document.components.schemas ??= {};
  document.components.schemas.ErrorEnvelope = {
    type: 'object',
    required: ['code', 'message'],
    properties: { code: { type: 'string' }, message: { type: 'string' }, data: {} },
  };

  for (const pathItem of Object.values(document.paths ?? {})) {
    for (const operation of Object.values(pathItem)) {
      if (operation && typeof operation === 'object' && 'responses' in operation) {
        Object.assign(operation.responses, errorResponses);
      }
    }
  }

  return document;
}

export { createOpenApiDocument };
