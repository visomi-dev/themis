import { Router } from 'express';

import { authMiddleware } from '../auth/auth-middleware';
import { projectSeedService } from '../jobs/project-seed-service';
import { readValidated, validateRequest } from '../shared/http/route-schemas';

import {
  createDocumentSchema,
  createProjectSchema,
  projectParamsSchema,
  projectsOpenApiPaths,
  updateProjectSchema,
} from './projects-schemas';
import {
  createDocument,
  createProject,
  deleteProject,
  getProject,
  listProjects,
  updateProject,
} from './projects-service';
import type { ProjectDocumentStatus, ProjectDocumentType, ProjectSourceType, ProjectStatus } from './projects-types';

import { HttpError } from 'web-shared';

const projectsRouter = Router();

projectsRouter.use(authMiddleware.authenticated());

projectsRouter.get('/', async function listProjectsHandler(req, res) {
  res.send({ projects: await listProjects(authMiddleware.context(req)) });
});

projectsRouter.get(
  '/:projectId',
  validateRequest({ params: projectParamsSchema }),
  async function projectDetailHandler(req, res) {
    const { projectId } = readValidated<{ params: typeof projectParamsSchema }>(req).params!;
    const project = await getProject(authMiddleware.context(req), projectId);

    if (!project) {
      throw new HttpError({ code: 'project_not_found', message: 'The project could not be found.', statusCode: 404 });
    }

    res.send(project);
  },
);

projectsRouter.post('/', validateRequest({ body: createProjectSchema }), async function createProjectHandler(req, res) {
  const body = readValidated<{ body: typeof createProjectSchema }>(req).body!;
  const project = await createProject(
    authMiddleware.context(req),
    body as { name: string; sourceType?: ProjectSourceType; summary?: string },
  );

  res.status(201).send(project);
});

projectsRouter.patch(
  '/:projectId',
  validateRequest({ body: updateProjectSchema, params: projectParamsSchema }),
  async function updateProjectHandler(req, res) {
    const { body, params } = readValidated<{ body: typeof updateProjectSchema; params: typeof projectParamsSchema }>(
      req,
    );
    const project = await updateProject(
      authMiddleware.context(req),
      params!.projectId,
      body as { name?: string; status?: ProjectStatus; summary?: string | null },
    );

    res.send(project);
  },
);

projectsRouter.delete(
  '/:projectId',
  validateRequest({ params: projectParamsSchema }),
  async function deleteProjectHandler(req, res) {
    const { projectId } = readValidated<{ params: typeof projectParamsSchema }>(req).params!;
    await deleteProject(authMiddleware.context(req), projectId);
    res.status(204).send();
  },
);

projectsRouter.post(
  '/:projectId/documents',
  validateRequest({ body: createDocumentSchema, params: projectParamsSchema }),
  async function createDocumentHandler(req, res) {
    const { body, params } = readValidated<{ body: typeof createDocumentSchema; params: typeof projectParamsSchema }>(
      req,
    );
    const document = await createDocument(
      authMiddleware.context(req),
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

projectsRouter.get(
  '/:projectId/jobs',
  validateRequest({ params: projectParamsSchema }),
  async function projectJobsHandler(req, res) {
    const { projectId } = readValidated<{ params: typeof projectParamsSchema }>(req).params!;
    res.send({ jobs: await projectSeedService.listProjectJobs(authMiddleware.context(req), projectId) });
  },
);

projectsRouter.post(
  '/:projectId/seed',
  validateRequest({ params: projectParamsSchema }),
  async function seedProjectHandler(req, res) {
    const { projectId } = readValidated<{ params: typeof projectParamsSchema }>(req).params!;
    const job = await projectSeedService.queueProjectSeed(authMiddleware.context(req), projectId);
    res.status(202).send(job);
  },
);

export { projectsOpenApiPaths, projectsRouter };
