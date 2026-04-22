import { createDocument } from 'zod-openapi';

import { activationOpenApiPaths } from '../activation/activation-router.js';
import { authOpenApiPaths } from '../auth/auth-router.js';
import { projectsOpenApiPaths } from '../projects/projects-router.js';
import { testOpenApiPaths } from '../testing/test-router.js';

const createOpenApiDocument = () =>
  createDocument({
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

export { createOpenApiDocument };
