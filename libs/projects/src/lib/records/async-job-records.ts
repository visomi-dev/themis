import { randomUUID } from 'node:crypto';

import { and, desc, eq } from 'drizzle-orm';
import { asyncJobs, withAccountContext } from 'shared';

import type { AsyncJobRecord, AsyncJobStatus, AsyncJobType } from '../contracts/async-jobs';

type JobContext = {
  accountId: string;
  userId: string;
};

function mapAsyncJob(record: typeof asyncJobs.$inferSelect): AsyncJobRecord {
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

async function createAsyncJob(
  context: JobContext,
  data: { inputJson?: string; projectId?: string; type: AsyncJobType },
) {
  const now = new Date();

  return withAccountContext(context, async (db) => {
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

    return mapAsyncJob(job);
  });
}

async function listAsyncJobsForProject(context: JobContext, projectId: string) {
  return withAccountContext(context, async (db) => {
    const jobs = await db
      .select()
      .from(asyncJobs)
      .where(and(eq(asyncJobs.accountId, context.accountId), eq(asyncJobs.projectId, projectId)))
      .orderBy(desc(asyncJobs.createdAt));

    return jobs.map(mapAsyncJob);
  });
}

async function findAsyncJobById(context: JobContext, jobId: string) {
  return withAccountContext(context, async (db) => {
    const [job] = await db
      .select()
      .from(asyncJobs)
      .where(and(eq(asyncJobs.accountId, context.accountId), eq(asyncJobs.id, jobId)))
      .limit(1);

    return job ? mapAsyncJob(job) : null;
  });
}

async function updateAsyncJob(
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
  return withAccountContext(context, async (db) => {
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

    return mapAsyncJob(job);
  });
}

export { createAsyncJob, findAsyncJobById, listAsyncJobsForProject, mapAsyncJob, updateAsyncJob };
export type { JobContext };
