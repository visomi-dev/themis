import { Router, type NextFunction, type Request, type Response } from 'express';

import type { AuthConfig } from '../config/auth-config.js';

import { AuthError } from '../auth/auth-errors.js';

import { createProjectsService } from './projects-service.js';
import type { ProjectDocumentStatus, ProjectSourceType, ProjectStatus } from './projects-types.js';

const requireAuthenticatedUser = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.isAuthenticated() || !req.user) {
    next(new AuthError(401, 'authentication_required', 'Sign in to access your projects.'));
    return;
  }

  next();
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

  const p = params as Record<string, string>;
  const projectId = p['projectId'];

  if (!projectId || typeof projectId !== 'string') {
    throw new AuthError(400, 'invalid_request', 'Project ID is required.');
  }

  return projectId;
};

const buildProjectsRouter = (config: AuthConfig) => {
  const router = Router();
  const service = createProjectsService(config);

  router.use(requireAuthenticatedUser);

  router.get('/', async (req, res) => {
    const projects = await service.listProjects(req.user.id);
    res.send({ projects });
  });

  router.get('/:projectId', async (req, res) => {
    const projectId = readProjectIdParam(req.params);
    const project = await service.getProject(req.user.id, projectId);

    if (!project) {
      throw new AuthError(404, 'project_not_found', 'The project could not be found.');
    }

    res.send(project);
  });

  router.post('/', async (req, res) => {
    const body = readProjectBody(req.body);
    const name = typeof body['name'] === 'string' ? body['name'].trim() : '';
    const summary = typeof body['summary'] === 'string' ? body['summary'].trim() || undefined : undefined;
    const sourceType = typeof body['sourceType'] === 'string' ? (body['sourceType'] as ProjectSourceType) : undefined;

    const project = await service.createProject(req.user.id, { name, sourceType, summary });
    res.status(201).send(project);
  });

  router.patch('/:projectId', async (req, res) => {
    const projectId = readProjectIdParam(req.params);
    const body = readProjectBody(req.body);

    const name = body['name'] !== undefined && typeof body['name'] === 'string' ? body['name'].trim() : undefined;
    const status = body['status'] !== undefined && typeof body['status'] === 'string' ? (body['status'] as ProjectStatus) : undefined;
    const summary = body['summary'] !== undefined ? (body['summary'] === null ? null : typeof body['summary'] === 'string' ? body['summary'].trim() || null : null) : undefined;

    const project = await service.updateProject(req.user.id, projectId, { name, status, summary });
    res.send(project);
  });

  router.delete('/:projectId', async (req, res) => {
    const projectId = readProjectIdParam(req.params);
    await service.deleteProject(req.user.id, projectId);
    res.status(204).send();
  });

  router.post('/:projectId/documents', async (req, res) => {
    const projectId = readProjectIdParam(req.params);
    const body = readProjectBody(req.body);

    const contentMarkdown = typeof body['contentMarkdown'] === 'string' ? body['contentMarkdown'] : '';
    const documentType = typeof body['documentType'] === 'string' ? body['documentType'] : '';
    const source = typeof body['source'] === 'string' ? body['source'] : undefined;
    const status = body['status'] !== undefined && typeof body['status'] === 'string' ? (body['status'] as ProjectDocumentStatus) : undefined;
    const title = typeof body['title'] === 'string' ? body['title'].trim() : '';

    const document = await service.createDocument(req.user.id, projectId, {
      contentMarkdown,
      documentType: documentType as ProjectDocument['documentType'],
      source,
      status,
      title,
    });

    res.status(201).send(document);
  });

  return router;
};

export { buildProjectsRouter };