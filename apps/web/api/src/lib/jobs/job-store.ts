import { randomUUID } from 'node:crypto';

import { and, desc, eq } from 'drizzle-orm';

import type { AuthConfig } from '../config/auth-config';
import { withAccountContext } from '../db/account-context';
import { asyncJobs } from '../db/schema';
import type { AsyncJobRecord, AsyncJobStatus, AsyncJobType } from '../realtime/realtime-events';

type JobContext = {
  accountId: string;
  userId: string;
};

function mapJob(record: typeof asyncJobs.$inferSelect): AsyncJobRecord {
  return {
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
  };
}

function createJobStore(config: AuthConfig) {
  async function createJob(context: JobContext, data: { inputJson?: string; projectId?: string; type: AsyncJobType }) {
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
  }

  async function listJobsForProject(context: JobContext, projectId: string) {
    return withAccountContext(config, context, async (db) => {
      const jobs = await db
        .select()
        .from(asyncJobs)
        .where(and(eq(asyncJobs.accountId, context.accountId), eq(asyncJobs.projectId, projectId)))
        .orderBy(desc(asyncJobs.createdAt));

      return jobs.map(mapJob);
    });
  }

  async function findJobById(context: JobContext, jobId: string) {
    return withAccountContext(config, context, async (db) => {
      const [job] = await db
        .select()
        .from(asyncJobs)
        .where(and(eq(asyncJobs.accountId, context.accountId), eq(asyncJobs.id, jobId)))
        .limit(1);

      return job ? mapJob(job) : null;
    });
  }

  async function updateJob(
    context: JobContext,
    jobId: string,
    data: {
      completedAt?: Date | null;
      errorMessage?: string | null;
      progress?: number;
      resultJson?: string | null;
      status: AsyncJobStatus;
    },
  ) {
    return withAccountContext(config, context, async (db) => {
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
  }

  return { createJob, findJobById, listJobsForProject, updateJob };
}

export { createJobStore };
