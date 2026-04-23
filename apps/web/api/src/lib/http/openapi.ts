import { createDocument } from 'zod-openapi';

import { activationOpenApiPaths } from '../activation/activation-router';
import { authOpenApiPaths } from '../auth/auth-router';
import { projectsOpenApiPaths } from '../projects/projects-router';
import { testOpenApiPaths } from '../testing/test-router';

function createOpenApiDocument() {
  return createDocument({
    openapi: '3.1.0',
    info: {
      title: 'Themis API',
      version: '0.1.0',
    },
    paths: {
      ...authOpenApiPaths,
      ...activationOpenApiPaths,
      ...projectsOpenApiPaths,
      ...testOpenApiPaths,
    },
  });
}

export { createOpenApiDocument };
