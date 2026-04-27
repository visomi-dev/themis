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

import { HttpError, jsonResponse } from 'shared';
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
  const projects = await listProjects(authedContext(req));

  jsonResponse(res, { data: { projects }, message: 'Projects retrieved.' });
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

    jsonResponse(res, { data: project, message: 'Project retrieved.' });
  },
);

projectsRouter.post('/', validateRequest({ body: createProjectSchema }), async function createProjectHandler(req, res) {
  const body = getValidated<{ body: typeof createProjectSchema }>(req).body!;
  const project = await createProject(
    authedContext(req),
    body as { name: string; sourceType?: ProjectSourceType; summary?: string },
  );

  jsonResponse(res, { data: project, status: 201, message: 'Project created.' });
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

    jsonResponse(res, { data: project, message: 'Project updated.' });
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

    jsonResponse(res, { data: document, status: 201, message: 'Document created.' });
  },
);

projectsRouter.get(
  '/:projectId/jobs',
  validateRequest({ params: projectParamsSchema }),
  async function projectJobsHandler(req, res) {
    const { projectId } = getValidated<{ params: typeof projectParamsSchema }>(req).params!;
    const jobs = await listProjectJobs(authedContext(req), projectId);

    jsonResponse(res, { data: { jobs }, message: 'Jobs retrieved.' });
  },
);

projectsRouter.post(
  '/:projectId/seed',
  validateRequest({ params: projectParamsSchema }),
  async function seedProjectHandler(req, res) {
    const { projectId } = getValidated<{ params: typeof projectParamsSchema }>(req).params!;
    const job = await queueProjectSeed(authedContext(req), projectId);

    jsonResponse(res, { data: job, status: 202, message: 'Project seed queued.' });
  },
);

export { projectsOpenApiPaths, projectsRouter };
