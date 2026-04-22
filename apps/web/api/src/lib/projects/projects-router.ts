import { Router, type NextFunction, type Request, type Response } from 'express';

import type { AuthConfig } from '../config/auth-config.js';
import { AuthError } from '../auth/auth-errors.js';
import { projectIdParamSchema, readValidated, validateRequest, z } from '../http/route-schemas.js';
import { createProjectSeedService } from '../jobs/project-seed-service.js';

import { createProjectsService } from './projects-service.js';
import type { ProjectDocumentStatus, ProjectDocumentType, ProjectSourceType, ProjectStatus } from './projects-types.js';

const projectStatusSchema = z.enum(['active', 'archived', 'draft']);
const projectSourceTypeSchema = z.enum(['imported', 'manual', 'seeded']);
const documentStatusSchema = z.enum(['active', 'archived', 'draft']);
const documentTypeSchema = z.enum([
  'architecture',
  'brief',
  'imported_reference',
  'operational_notes',
  'overview',
  'setup',
]);

const projectSchema = z
  .object({
    accountId: z.string(),
    createdAt: z.string(),
    createdByUserId: z.string(),
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    sourceType: projectSourceTypeSchema,
    status: projectStatusSchema,
    summary: z.string().nullable(),
    updatedAt: z.string(),
  })
  .meta({ id: 'Project' });

const projectDocumentSchema = z
  .object({
    contentMarkdown: z.string(),
    createdAt: z.string(),
    createdByUserId: z.string(),
    documentType: documentTypeSchema,
    id: z.string(),
    projectId: z.string(),
    source: z.string(),
    status: documentStatusSchema,
    title: z.string(),
    updatedAt: z.string(),
  })
  .meta({ id: 'ProjectDocument' });

const asyncJobSchema = z
  .object({
    completedAt: z.string().nullable(),
    createdAt: z.string(),
    errorMessage: z.string().nullable(),
    id: z.string(),
    progress: z.number(),
    projectId: z.string().nullable(),
    resultJson: z.string().nullable(),
    status: z.enum(['completed', 'failed', 'queued', 'running']),
    type: z.enum(['project_seed']),
    updatedAt: z.string(),
    userId: z.string(),
  })
  .meta({ id: 'AsyncJob' });

const projectWithDocumentsSchema = projectSchema
  .extend({
    documents: z.array(projectDocumentSchema),
    jobs: z.array(asyncJobSchema),
  })
  .meta({ id: 'ProjectWithDocuments' });

const projectParamsSchema = z
  .object({ apiKeyId: z.never().optional(), projectId: projectIdParamSchema })
  .meta({ id: 'ProjectParams' });

const createProjectSchema = z
  .object({
    name: z.string().min(1).max(120),
    sourceType: projectSourceTypeSchema.optional(),
    summary: z.string().max(500).optional(),
  })
  .meta({ id: 'CreateProjectRequest' });

const updateProjectSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    status: projectStatusSchema.optional(),
    summary: z.string().nullable().optional(),
  })
  .meta({ id: 'UpdateProjectRequest' });

const createDocumentSchema = z
  .object({
    contentMarkdown: z.string(),
    documentType: documentTypeSchema,
    source: z.string().optional(),
    status: documentStatusSchema.optional(),
    title: z.string().min(1),
  })
  .meta({ id: 'CreateProjectDocumentRequest' });

const projectsListSchema = z
  .object({
    projects: z.array(projectSchema),
  })
  .meta({ id: 'ProjectsListResponse' });

const jobsListSchema = z
  .object({
    jobs: z.array(asyncJobSchema),
  })
  .meta({ id: 'ProjectJobsResponse' });

const projectsOpenApiPaths = {
  '/projects': {
    get: {
      responses: {
        200: { content: { 'application/json': { schema: projectsListSchema } }, description: 'List account projects.' },
      },
    },
    post: {
      requestBody: { content: { 'application/json': { schema: createProjectSchema } } },
      responses: {
        201: { content: { 'application/json': { schema: projectSchema } }, description: 'Project created.' },
      },
    },
  },
  '/projects/{projectId}': {
    get: {
      requestParams: { path: projectParamsSchema },
      responses: {
        200: {
          content: { 'application/json': { schema: projectWithDocumentsSchema } },
          description: 'Project detail.',
        },
      },
    },
    patch: {
      requestParams: { path: projectParamsSchema },
      requestBody: { content: { 'application/json': { schema: updateProjectSchema } } },
      responses: {
        200: { content: { 'application/json': { schema: projectSchema } }, description: 'Project updated.' },
      },
    },
    delete: {
      requestParams: { path: projectParamsSchema },
      responses: { 204: { description: 'Project deleted.' } },
    },
  },
  '/projects/{projectId}/documents': {
    post: {
      requestParams: { path: projectParamsSchema },
      requestBody: { content: { 'application/json': { schema: createDocumentSchema } } },
      responses: {
        201: {
          content: { 'application/json': { schema: projectDocumentSchema } },
          description: 'Project document created.',
        },
      },
    },
  },
  '/projects/{projectId}/jobs': {
    get: {
      requestParams: { path: projectParamsSchema },
      responses: { 200: { content: { 'application/json': { schema: jobsListSchema } }, description: 'Project jobs.' } },
    },
  },
  '/projects/{projectId}/seed': {
    post: {
      requestParams: { path: projectParamsSchema },
      responses: {
        202: { content: { 'application/json': { schema: asyncJobSchema } }, description: 'Project seed queued.' },
      },
    },
  },
};

const requireAuthenticatedUser = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.isAuthenticated() || !req.user) {
    next(new AuthError(401, 'authentication_required', 'Sign in to access your projects.'));
    return;
  }
  next();
};

const authenticatedContext = (req: Request) => {
  if (!req.user) {
    throw new AuthError(401, 'authentication_required', 'Sign in to access your projects.');
  }

  return {
    accountId: req.user.accountId,
    userId: req.user.id,
  };
};

const buildProjectsRouter = (config: AuthConfig) => {
  const router = Router();
  const projectSeedService = createProjectSeedService(config);
  const service = createProjectsService(config);

  router.use(requireAuthenticatedUser);

  router.get('/', async (req, res) => {
    res.send({ projects: await service.listProjects(authenticatedContext(req)) });
  });

  router.get('/:projectId', validateRequest({ params: projectParamsSchema }), async (req, res) => {
    const { projectId } = readValidated<{ params: typeof projectParamsSchema }>(req).params!;
    const project = await service.getProject(authenticatedContext(req), projectId);
    if (!project) {
      throw new AuthError(404, 'project_not_found', 'The project could not be found.');
    }
    res.send(project);
  });

  router.post('/', validateRequest({ body: createProjectSchema }), async (req, res) => {
    const body = readValidated<{ body: typeof createProjectSchema }>(req).body!;
    const project = await service.createProject(
      authenticatedContext(req),
      body as { name: string; sourceType?: ProjectSourceType; summary?: string },
    );
    res.status(201).send(project);
  });

  router.patch(
    '/:projectId',
    validateRequest({ body: updateProjectSchema, params: projectParamsSchema }),
    async (req, res) => {
      const { body, params } = readValidated<{ body: typeof updateProjectSchema; params: typeof projectParamsSchema }>(
        req,
      );
      const project = await service.updateProject(
        authenticatedContext(req),
        params!.projectId,
        body as { name?: string; status?: ProjectStatus; summary?: string | null },
      );
      res.send(project);
    },
  );

  router.delete('/:projectId', validateRequest({ params: projectParamsSchema }), async (req, res) => {
    const { projectId } = readValidated<{ params: typeof projectParamsSchema }>(req).params!;
    await service.deleteProject(authenticatedContext(req), projectId);
    res.status(204).send();
  });

  router.post(
    '/:projectId/documents',
    validateRequest({ body: createDocumentSchema, params: projectParamsSchema }),
    async (req, res) => {
      const { body, params } = readValidated<{ body: typeof createDocumentSchema; params: typeof projectParamsSchema }>(
        req,
      );
      const document = await service.createDocument(
        authenticatedContext(req),
        params!.projectId,
        body as {
          contentMarkdown: string;
          documentType: ProjectDocumentType;
          source?: string;
          status?: ProjectDocumentStatus;
          title: string;
        },
      );
      res.status(201).send(document);
    },
  );

  router.get('/:projectId/jobs', validateRequest({ params: projectParamsSchema }), async (req, res) => {
    const { projectId } = readValidated<{ params: typeof projectParamsSchema }>(req).params!;
    res.send({ jobs: await projectSeedService.listProjectJobs(authenticatedContext(req), projectId) });
  });

  router.post('/:projectId/seed', validateRequest({ params: projectParamsSchema }), async (req, res) => {
    const { projectId } = readValidated<{ params: typeof projectParamsSchema }>(req).params!;
    const job = await projectSeedService.queueProjectSeed(authenticatedContext(req), projectId);
    res.status(202).send(job);
  });

  return router;
};

export { buildProjectsRouter, projectsOpenApiPaths };
