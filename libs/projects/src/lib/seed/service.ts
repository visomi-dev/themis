import { HttpError } from 'shared';

import type { ProjectSeedJobInput, ProjectSeedJobResult } from '../contracts/project-seed';
import { findAsyncJobById, updateAsyncJob } from '../records/async-job-records';
import { createDocument, getProject } from '../projects-service';

import { publishProjectAsyncJobEvent } from './events';

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function queueProjectSeed(context: { accountId: string; userId: string }, projectId: string) {
  const project = await getProject(context, projectId);

  if (!project) {
    throw new HttpError({ code: 'project_not_found', message: 'The project could not be found.', statusCode: 404 });
  }

  return project;
}

async function processProjectSeedJob(bullJob: { data: ProjectSeedJobInput }) {
  const context = {
    accountId: bullJob.data.accountId,
    userId: bullJob.data.userId,
  };
  const existing = await findAsyncJobById(context, bullJob.data.jobId);

  if (!existing) {
    return null;
  }

  const startJob = await updateAsyncJob(context, existing.id, {
    progress: 10,
    status: 'running',
  });
  await publishProjectAsyncJobEvent('job:started', startJob, 'Project seed started.');

  await wait(600);
  const scanJob = await updateAsyncJob(context, existing.id, {
    progress: 45,
    status: 'running',
  });
  await publishProjectAsyncJobEvent('job:progress', scanJob, 'Repository structure scanned.');

  await wait(600);
  const contextJob = await updateAsyncJob(context, existing.id, {
    progress: 80,
    status: 'running',
  });
  await publishProjectAsyncJobEvent('job:progress', contextJob, 'Project context draft prepared.');

  await createDocument(context, existing.projectId!, {
    contentMarkdown: [
      '# Seeded Project Overview',
      '',
      'This document was created by the base project seed job.',
      '',
      '- Route-level project metadata is now connected to async jobs.',
      '- BullMQ handles orchestration and status transitions.',
      '- Socket.io relays user-scoped async events to the frontend.',
    ].join('\n'),
    documentType: 'overview',
    source: 'seeded',
    status: 'active',
    title: 'Seeded Project Overview',
  });

  const result: ProjectSeedJobResult = {
    summary: 'Initial project overview generated.',
  };
  const completedJob = await updateAsyncJob(context, existing.id, {
    completedAt: new Date(),
    progress: 100,
    resultJson: JSON.stringify(result),
    status: 'completed',
  });
  await publishProjectAsyncJobEvent('job:completed', completedJob, 'Project seed completed.');

  return result;
}

async function failProjectSeedJob(bullJob: { data: ProjectSeedJobInput }, error: Error) {
  const context = {
    accountId: bullJob.data.accountId,
    userId: bullJob.data.userId,
  };
  const failedJob = await updateAsyncJob(context, bullJob.data.jobId, {
    completedAt: new Date(),
    errorMessage: error.message,
    progress: 100,
    status: 'failed',
  });

  await publishProjectAsyncJobEvent('job:failed', failedJob, error.message);
}

export { failProjectSeedJob, processProjectSeedJob, queueProjectSeed };
