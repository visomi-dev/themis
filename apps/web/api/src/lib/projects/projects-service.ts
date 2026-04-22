import { randomUUID } from 'node:crypto';

import { and, asc, eq } from 'drizzle-orm';

import type { AuthConfig } from '../config/auth-config.js';
import { withAccountContext } from '../db/account-context.js';
import { asyncJobs, projectDocuments, projects } from '../db/schema.js';
import { AuthError } from '../auth/auth-errors.js';

import type {
  Project,
  ProjectDocument,
  ProjectDocumentStatus,
  ProjectDocumentType,
  ProjectSourceType,
  ProjectStatus,
  ProjectWithDocuments,
} from './projects-types.js';

type ProjectsContext = {
  accountId: string;
  userId: string;
};

const normalizeSlug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

const PROJECT_STATUSES = new Set<ProjectStatus>(['active', 'archived', 'draft']);
const PROJECT_SOURCE_TYPES = new Set<ProjectSourceType>(['imported', 'manual', 'seeded']);
const DOCUMENT_STATUSES = new Set<ProjectDocumentStatus>(['active', 'archived', 'draft']);
const DOCUMENT_TYPES = new Set<ProjectDocumentType>([
  'architecture',
  'brief',
  'imported_reference',
  'operational_notes',
  'overview',
  'setup',
]);

const mapProject = (record: typeof projects.$inferSelect): Project => ({
  accountId: record.accountId,
  createdAt: record.createdAt.toISOString(),
  createdByUserId: record.createdByUserId,
  id: record.id,
  name: record.name,
  slug: record.slug,
  sourceType: record.sourceType as ProjectSourceType,
  status: record.status as ProjectStatus,
  summary: record.summary ?? null,
  updatedAt: record.updatedAt.toISOString(),
});

const mapDocument = (record: typeof projectDocuments.$inferSelect): ProjectDocument => ({
  contentMarkdown: record.contentMarkdown,
  createdAt: record.createdAt.toISOString(),
  createdByUserId: record.createdByUserId,
  documentType: record.documentType as ProjectDocumentType,
  id: record.id,
  projectId: record.projectId,
  source: record.source,
  status: record.status as ProjectDocumentStatus,
  title: record.title,
  updatedAt: record.updatedAt.toISOString(),
});

const createProjectsService = (config: AuthConfig) => {
  const mapJob = (record: typeof asyncJobs.$inferSelect) => ({
    completedAt: record.completedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    errorMessage: record.errorMessage ?? null,
    id: record.id,
    progress: record.progress,
    projectId: record.projectId ?? null,
    resultJson: record.resultJson ?? null,
    status: record.status as 'completed' | 'failed' | 'queued' | 'running',
    type: record.type as 'project_seed',
    updatedAt: record.updatedAt.toISOString(),
    userId: record.userId,
  });

  const listProjects = async (context: ProjectsContext): Promise<Project[]> =>
    withAccountContext(config, context, async (db) => {
      const rows = await db
        .select()
        .from(projects)
        .where(eq(projects.accountId, context.accountId))
        .orderBy(asc(projects.createdAt));
      return rows.map(mapProject);
    });

  const getProject = async (context: ProjectsContext, projectId: string): Promise<ProjectWithDocuments | null> =>
    withAccountContext(config, context, async (db) => {
      const [projectRow] = await db
        .select()
        .from(projects)
        .where(and(eq(projects.accountId, context.accountId), eq(projects.id, projectId)))
        .limit(1);

      if (!projectRow) {
        return null;
      }

      const [documentRows, jobRows] = await Promise.all([
        db
          .select()
          .from(projectDocuments)
          .where(and(eq(projectDocuments.accountId, context.accountId), eq(projectDocuments.projectId, projectId)))
          .orderBy(asc(projectDocuments.createdAt)),
        db
          .select()
          .from(asyncJobs)
          .where(and(eq(asyncJobs.accountId, context.accountId), eq(asyncJobs.projectId, projectId)))
          .orderBy(asc(asyncJobs.createdAt)),
      ]);

      return {
        ...mapProject(projectRow),
        documents: documentRows.map(mapDocument),
        jobs: jobRows.map(mapJob),
      };
    });

  const createProject = async (
    context: ProjectsContext,
    data: { name: string; summary?: string; sourceType?: ProjectSourceType },
  ): Promise<Project> => {
    const name = data.name.trim();
    if (!name) {
      throw new AuthError(400, 'invalid_name', 'Project name is required.');
    }
    if (name.length > 120) {
      throw new AuthError(400, 'invalid_name', 'Project name must be 120 characters or fewer.');
    }

    const sourceType = data.sourceType ?? 'manual';
    if (!PROJECT_SOURCE_TYPES.has(sourceType)) {
      throw new AuthError(400, 'invalid_source_type', 'The source type is not supported.');
    }

    return withAccountContext(config, context, async (db) => {
      const now = new Date();
      const baseSlug = normalizeSlug(name);
      let slug = baseSlug;
      const [existing] = await db
        .select({ slug: projects.slug })
        .from(projects)
        .where(and(eq(projects.accountId, context.accountId), eq(projects.slug, slug)))
        .limit(1);
      if (existing) {
        slug = `${baseSlug}-${randomUUID().slice(0, 8)}`;
      }

      const [created] = await db
        .insert(projects)
        .values({
          accountId: context.accountId,
          createdAt: now,
          createdByUserId: context.userId,
          id: randomUUID(),
          name,
          slug,
          sourceType,
          status: 'active',
          summary: data.summary ?? null,
          updatedAt: now,
        })
        .returning();

      return mapProject(created);
    });
  };

  const updateProject = async (
    context: ProjectsContext,
    projectId: string,
    data: { name?: string; status?: ProjectStatus; summary?: string | null },
  ): Promise<Project> =>
    withAccountContext(config, context, async (db) => {
      const [existing] = await db
        .select()
        .from(projects)
        .where(and(eq(projects.accountId, context.accountId), eq(projects.id, projectId)))
        .limit(1);
      if (!existing) {
        throw new AuthError(404, 'project_not_found', 'The project could not be found.');
      }

      const updates: Partial<typeof projects.$inferInsert> = { updatedAt: new Date() };
      if (data.name !== undefined) {
        const trimmedName = data.name.trim();
        if (!trimmedName) {
          throw new AuthError(400, 'invalid_name', 'Project name is required.');
        }
        updates.name = trimmedName;
      }
      if (data.status !== undefined) {
        if (!PROJECT_STATUSES.has(data.status)) {
          throw new AuthError(400, 'invalid_status', 'The status value is not supported.');
        }
        updates.status = data.status;
      }
      if (data.summary !== undefined) {
        updates.summary = data.summary;
      }

      const [updated] = await db
        .update(projects)
        .set(updates)
        .where(and(eq(projects.accountId, context.accountId), eq(projects.id, projectId)))
        .returning();
      return mapProject(updated);
    });

  const deleteProject = async (context: ProjectsContext, projectId: string) =>
    withAccountContext(config, context, async (db) => {
      const [existing] = await db
        .select()
        .from(projects)
        .where(and(eq(projects.accountId, context.accountId), eq(projects.id, projectId)))
        .limit(1);
      if (!existing) {
        throw new AuthError(404, 'project_not_found', 'The project could not be found.');
      }
      await db.delete(projects).where(and(eq(projects.accountId, context.accountId), eq(projects.id, projectId)));
    });

  const createDocument = async (
    context: ProjectsContext,
    projectId: string,
    data: {
      contentMarkdown: string;
      documentType: ProjectDocumentType;
      source?: string;
      status?: ProjectDocumentStatus;
      title: string;
    },
  ) =>
    withAccountContext(config, context, async (db) => {
      const [project] = await db
        .select()
        .from(projects)
        .where(and(eq(projects.accountId, context.accountId), eq(projects.id, projectId)))
        .limit(1);
      if (!project) {
        throw new AuthError(404, 'project_not_found', 'The project could not be found.');
      }
      if (!DOCUMENT_TYPES.has(data.documentType)) {
        throw new AuthError(400, 'invalid_document_type', 'The document type is not supported.');
      }
      const status = data.status ?? 'active';
      if (!DOCUMENT_STATUSES.has(status)) {
        throw new AuthError(400, 'invalid_document_status', 'The document status is not supported.');
      }
      const now = new Date();
      const [created] = await db
        .insert(projectDocuments)
        .values({
          accountId: context.accountId,
          contentMarkdown: data.contentMarkdown,
          createdAt: now,
          createdByUserId: context.userId,
          documentType: data.documentType,
          id: randomUUID(),
          projectId,
          source: data.source ?? 'manual',
          status,
          title: data.title.trim(),
          updatedAt: now,
        })
        .returning();
      return mapDocument(created);
    });

  return { createDocument, createProject, deleteProject, getProject, listProjects, updateProject };
};

export { createProjectsService };
