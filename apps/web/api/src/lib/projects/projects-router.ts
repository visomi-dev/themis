import { Router, type NextFunction, type Request, type Response } from 'express';

import type { AuthConfig } from '../config/auth-config.js';
import { AuthError } from '../auth/auth-errors.js';
import { createProjectSeedService } from '../jobs/project-seed-service.js';

import { createProjectsService } from './projects-service.js';
import type { ProjectDocumentStatus, ProjectDocumentType, ProjectSourceType, ProjectStatus } from './projects-types.js';

const requireAuthenticatedUser = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.isAuthenticated() || !req.user) {
    next(new AuthError(401, 'authentication_required', 'Sign in to access your projects.'));
    return;
  }
  next();
};
const authenticatedUserId = (req: Request) => {
  if (!req.user) {
    throw new AuthError(401, 'authentication_required', 'Sign in to access your projects.');
  }

  return req.user.id;
};

const readProjectBody = (body: unknown) => {
  if (!body || typeof body !== 'object') {
    throw new AuthError(400, 'invalid_request', 'Request body is required.');
  }
  return body as Record<string, unknown>;
};

const readProjectIdParam = (params: unknown) => {
  if (!params || typeof params !== 'object') {
    throw new AuthError(400, 'invalid_request', 'Route parameters are required.');
  }
  const projectId = (params as Record<string, string>)['projectId'];
  if (!projectId) {
    throw new AuthError(400, 'invalid_request', 'Project ID is required.');
  }
  return projectId;
};

const buildProjectsRouter = (config: AuthConfig) => {
  const router = Router();
  const projectSeedService = createProjectSeedService(config);
  const service = createProjectsService(config);

  router.use(requireAuthenticatedUser);

  router.get('/', async (req, res) => {
    res.send({ projects: await service.listProjects(authenticatedUserId(req)) });
  });

  router.get('/:projectId', async (req, res) => {
    const project = await service.getProject(authenticatedUserId(req), readProjectIdParam(req.params));
    if (!project) {
      throw new AuthError(404, 'project_not_found', 'The project could not be found.');
    }
    res.send(project);
  });

  router.post('/', async (req, res) => {
    const body = readProjectBody(req.body);
    const project = await service.createProject(authenticatedUserId(req), {
      name: typeof body['name'] === 'string' ? body['name'].trim() : '',
      sourceType: typeof body['sourceType'] === 'string' ? (body['sourceType'] as ProjectSourceType) : undefined,
      summary: typeof body['summary'] === 'string' ? body['summary'].trim() || undefined : undefined,
    });
    res.status(201).send(project);
  });

  router.patch('/:projectId', async (req, res) => {
    const body = readProjectBody(req.body);
    const project = await service.updateProject(authenticatedUserId(req), readProjectIdParam(req.params), {
      name: typeof body['name'] === 'string' ? body['name'].trim() : undefined,
      status: typeof body['status'] === 'string' ? (body['status'] as ProjectStatus) : undefined,
      summary:
        body['summary'] === null
          ? null
          : typeof body['summary'] === 'string'
            ? body['summary'].trim() || null
            : undefined,
    });
    res.send(project);
  });

  router.delete('/:projectId', async (req, res) => {
    await service.deleteProject(authenticatedUserId(req), readProjectIdParam(req.params));
    res.status(204).send();
  });

  router.post('/:projectId/documents', async (req, res) => {
    const body = readProjectBody(req.body);
    const document = await service.createDocument(authenticatedUserId(req), readProjectIdParam(req.params), {
      contentMarkdown: typeof body['contentMarkdown'] === 'string' ? body['contentMarkdown'] : '',
      documentType: (typeof body['documentType'] === 'string'
        ? body['documentType']
        : 'overview') as ProjectDocumentType,
      source: typeof body['source'] === 'string' ? body['source'] : undefined,
      status: typeof body['status'] === 'string' ? (body['status'] as ProjectDocumentStatus) : undefined,
      title: typeof body['title'] === 'string' ? body['title'].trim() : '',
    });
    res.status(201).send(document);
  });

  router.get('/:projectId/jobs', async (req, res) => {
    const projectId = readProjectIdParam(req.params);
    res.send({ jobs: await projectSeedService.listProjectJobs(authenticatedUserId(req), projectId) });
  });

  router.post('/:projectId/seed', async (req, res) => {
    const projectId = readProjectIdParam(req.params);
    const job = await projectSeedService.queueProjectSeed(authenticatedUserId(req), projectId);
    res.status(202).send(job);
  });

  return router;
};

export { buildProjectsRouter };
