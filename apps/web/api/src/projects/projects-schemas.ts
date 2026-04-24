import { projectIdParamSchema, z } from '../shared/http/route-schemas';

export const projectStatusSchema = z.enum(['active', 'archived', 'draft']);
export const projectSourceTypeSchema = z.enum(['imported', 'manual', 'seeded']);
export const documentStatusSchema = z.enum(['active', 'archived', 'draft']);
export const documentTypeSchema = z.enum([
  'architecture',
  'brief',
  'imported_reference',
  'operational_notes',
  'overview',
  'setup',
]);

export const projectSchema = z
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

export const projectDocumentSchema = z
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

export const asyncJobSchema = z
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

export const projectWithDocumentsSchema = projectSchema
  .extend({
    documents: z.array(projectDocumentSchema),
    jobs: z.array(asyncJobSchema),
  })
  .meta({ id: 'ProjectWithDocuments' });

export const projectParamsSchema = z.object({ projectId: projectIdParamSchema }).meta({ id: 'ProjectParams' });

export const createProjectSchema = z
  .object({
    name: z.string().min(1).max(120),
    sourceType: projectSourceTypeSchema.optional(),
    summary: z.string().max(500).optional(),
  })
  .meta({ id: 'CreateProjectRequest' });

export const updateProjectSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    status: projectStatusSchema.optional(),
    summary: z.string().nullable().optional(),
  })
  .meta({ id: 'UpdateProjectRequest' });

export const createDocumentSchema = z
  .object({
    contentMarkdown: z.string(),
    documentType: documentTypeSchema,
    source: z.string().optional(),
    status: documentStatusSchema.optional(),
    title: z.string().min(1),
  })
  .meta({ id: 'CreateProjectDocumentRequest' });

export const projectsListSchema = z
  .object({
    projects: z.array(projectSchema),
  })
  .meta({ id: 'ProjectsListResponse' });

export const jobsListSchema = z
  .object({
    jobs: z.array(asyncJobSchema),
  })
  .meta({ id: 'ProjectJobsResponse' });

export const projectsOpenApiPaths = {
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
