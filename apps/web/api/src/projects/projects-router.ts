import { Router } from 'express';

import { authed, authedContext } from '../auth/auth-middleware';
import { getValidated, validateRequest } from '../shared/http/route-schemas';

import {
  createDocumentSchema,
  createProjectSchema,
  projectParamsSchema,
  projectsOpenApiPaths,
  updateProjectSchema,
} from './projects-schemas';
import { listProjectJobs, queueProjectSeed } from './project-seed-queue';

import { HttpError } from 'shared';
import {
  createDocument,
  createProject,
  deleteProject,
  getProject,
  listProjects,
  type ProjectDocumentStatus,
  type ProjectDocumentType,
  type ProjectSourceType,
  type ProjectStatus,
  updateProject,
} from 'projects';

const projectsRouter = Router();

projectsRouter.use(authed());

projectsRouter.get('/', async function listProjectsHandler(req, res) {
  res.send({ projects: await listProjects(authedContext(req)) });
});

projectsRouter.get(
  '/:projectId',
  validateRequest({ params: projectParamsSchema }),
  async function projectDetailHandler(req, res) {
    const { projectId } = getValidated<{ params: typeof projectParamsSchema }>(req).params!;
    const project = await getProject(authedContext(req), projectId);

    if (!project) {
      throw new HttpError({ code: 'project_not_found', message: 'The project could not be found.', statusCode: 404 });
    }

    res.send(project);
  },
);

projectsRouter.post('/', validateRequest({ body: createProjectSchema }), async function createProjectHandler(req, res) {
  const body = getValidated<{ body: typeof createProjectSchema }>(req).body!;
  const project = await createProject(
    authedContext(req),
    body as { name: string; sourceType?: ProjectSourceType; summary?: string },
  );

  res.status(201).send(project);
});

projectsRouter.patch(
  '/:projectId',
  validateRequest({ body: updateProjectSchema, params: projectParamsSchema }),
  async function updateProjectHandler(req, res) {
    const { body, params } = getValidated<{ body: typeof updateProjectSchema; params: typeof projectParamsSchema }>(
      req,
    );
    const project = await updateProject(
      authedContext(req),
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
    const { projectId } = getValidated<{ params: typeof projectParamsSchema }>(req).params!;
    await deleteProject(authedContext(req), projectId);
    res.status(204).send();
  },
);

projectsRouter.post(
  '/:projectId/documents',
  validateRequest({ body: createDocumentSchema, params: projectParamsSchema }),
  async function createDocumentHandler(req, res) {
    const { body, params } = getValidated<{ body: typeof createDocumentSchema; params: typeof projectParamsSchema }>(
      req,
    );
    const document = await createDocument(
      authedContext(req),
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
    const { projectId } = getValidated<{ params: typeof projectParamsSchema }>(req).params!;
    res.send({ jobs: await listProjectJobs(authedContext(req), projectId) });
  },
);

projectsRouter.post(
  '/:projectId/seed',
  validateRequest({ params: projectParamsSchema }),
  async function seedProjectHandler(req, res) {
    const { projectId } = getValidated<{ params: typeof projectParamsSchema }>(req).params!;
    const job = await queueProjectSeed(authedContext(req), projectId);
    res.status(202).send(job);
  },
);

export { projectsOpenApiPaths, projectsRouter };
