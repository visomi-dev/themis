import { randomUUID } from 'node:crypto';

import { and, desc, eq } from 'drizzle-orm';

import type { AuthConfig } from '../config/auth-config.js';
import { withAccountContext } from '../db/account-context.js';
import { asyncJobs } from '../db/schema.js';
import type { AsyncJobRecord, AsyncJobStatus, AsyncJobType } from '../realtime/realtime-events.js';

type JobContext = {
  accountId: string;
  userId: string;
};

const mapJob = (record: typeof asyncJobs.$inferSelect): AsyncJobRecord => ({
  completedAt: record.completedAt?.toISOString() ?? null,
  createdAt: record.createdAt.toISOString(),
  errorMessage: record.errorMessage ?? null,
  id: record.id,
  progress: record.progress,
  projectId: record.projectId ?? null,
  resultJson: record.resultJson ?? null,
  status: record.status as AsyncJobStatus,
  type: record.type as AsyncJobType,
  updatedAt: record.updatedAt.toISOString(),
  userId: record.userId,
});

const createJobStore = (config: AuthConfig) => {
  const createJob = async (
    context: JobContext,
    data: { inputJson?: string; projectId?: string; type: AsyncJobType },
  ) => {
    const now = new Date();

    return withAccountContext(config, context, async (db) => {
      const [job] = await db
        .insert(asyncJobs)
        .values({
          accountId: context.accountId,
          createdAt: now,
          id: randomUUID(),
          inputJson: data.inputJson ?? null,
          progress: 0,
          projectId: data.projectId ?? null,
          status: 'queued',
          type: data.type,
          updatedAt: now,
          userId: context.userId,
        })
        .returning();

      return mapJob(job);
    });
  };

  const listJobsForProject = async (context: JobContext, projectId: string) =>
    withAccountContext(config, context, async (db) => {
      const jobs = await db
        .select()
        .from(asyncJobs)
        .where(and(eq(asyncJobs.accountId, context.accountId), eq(asyncJobs.projectId, projectId)))
        .orderBy(desc(asyncJobs.createdAt));

      return jobs.map(mapJob);
    });

  const findJobById = async (context: JobContext, jobId: string) =>
    withAccountContext(config, context, async (db) => {
      const [job] = await db
        .select()
        .from(asyncJobs)
        .where(and(eq(asyncJobs.accountId, context.accountId), eq(asyncJobs.id, jobId)))
        .limit(1);

      return job ? mapJob(job) : null;
    });

  const updateJob = async (
    context: JobContext,
    jobId: string,
    data: {
      completedAt?: Date | null;
      errorMessage?: string | null;
      progress?: number;
      resultJson?: string | null;
      status: AsyncJobStatus;
    },
  ) =>
    withAccountContext(config, context, async (db) => {
      const [job] = await db
        .update(asyncJobs)
        .set({
          completedAt: data.completedAt ?? null,
          errorMessage: data.errorMessage ?? null,
          progress: data.progress ?? 0,
          resultJson: data.resultJson ?? null,
          status: data.status,
          updatedAt: new Date(),
        })
        .where(and(eq(asyncJobs.accountId, context.accountId), eq(asyncJobs.id, jobId)))
        .returning();

      return mapJob(job);
    });

  return { createJob, findJobById, listJobsForProject, updateJob };
};

export { createJobStore };
