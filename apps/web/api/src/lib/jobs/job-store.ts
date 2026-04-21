import { randomUUID } from 'node:crypto';

import { and, desc, eq } from 'drizzle-orm';

import type { AuthConfig } from '../config/auth-config.js';
import { getDb } from '../db/client.js';
import { asyncJobs } from '../db/schema.js';
import type { AsyncJobRecord, AsyncJobStatus, AsyncJobType } from '../realtime/realtime-events.js';

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
  const db = getDb(config);

  const createJob = async (data: { inputJson?: string; projectId?: string; type: AsyncJobType; userId: string }) => {
    const now = new Date();
    const [job] = await db
      .insert(asyncJobs)
      .values({
        createdAt: now,
        id: randomUUID(),
        inputJson: data.inputJson ?? null,
        progress: 0,
        projectId: data.projectId ?? null,
        status: 'queued',
        type: data.type,
        updatedAt: now,
        userId: data.userId,
      })
      .returning();

    return mapJob(job);
  };

  const listJobsForProject = async (userId: string, projectId: string) => {
    const jobs = await db
      .select()
      .from(asyncJobs)
      .where(and(eq(asyncJobs.userId, userId), eq(asyncJobs.projectId, projectId)))
      .orderBy(desc(asyncJobs.createdAt));

    return jobs.map(mapJob);
  };

  const findJobById = async (jobId: string) => {
    const [job] = await db.select().from(asyncJobs).where(eq(asyncJobs.id, jobId)).limit(1);

    return job ? mapJob(job) : null;
  };

  const updateJob = async (
    jobId: string,
    data: {
      completedAt?: Date | null;
      errorMessage?: string | null;
      progress?: number;
      resultJson?: string | null;
      status: AsyncJobStatus;
    },
  ) => {
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
      .where(eq(asyncJobs.id, jobId))
      .returning();

    return mapJob(job);
  };

  return { createJob, findJobById, listJobsForProject, updateJob };
};

export { createJobStore };
