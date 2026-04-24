import { Job, Worker } from 'bullmq';

import { createDocument, getProject } from '../projects/projects-service';
import { publishAsyncJobEvent } from '../realtime/realtime-publisher';

import { createJob, findJobById, listJobsForProject, updateJob } from './job-store';
import { getBullConnection, getProjectSeedQueue, hasProjectSeedWorker, setProjectSeedWorker } from './queue';
import type { ProjectSeedJobInput, ProjectSeedJobResult } from './job-types';

import { HttpError } from 'web-shared';

type SeedContext = {
  accountId: string;
  userId: string;
};

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ensureWorker() {
  if (hasProjectSeedWorker()) {
    return;
  }

  const worker = new Worker(
    'project-seed',
    async (bullJob: Job<ProjectSeedJobInput>) => {
      const context = {
        accountId: bullJob.data.accountId,
        userId: bullJob.data.userId,
      };
      const existing = await findJobById(context, bullJob.data.jobId ?? bullJob.id!);

      if (!existing) {
        return null;
      }

      const startJob = await updateJob(context, existing.id, {
        progress: 10,
        status: 'running',
      });
      publishAsyncJobEvent('job:started', startJob, 'Project seed started.');

      await wait(600);
      const scanJob = await updateJob(context, existing.id, {
        progress: 45,
        status: 'running',
      });
      publishAsyncJobEvent('job:progress', scanJob, 'Repository structure scanned.');

      await wait(600);
      const contextJob = await updateJob(context, existing.id, {
        progress: 80,
        status: 'running',
      });
      publishAsyncJobEvent('job:progress', contextJob, 'Project context draft prepared.');

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
      const completedJob = await updateJob(context, existing.id, {
        completedAt: new Date(),
        progress: 100,
        resultJson: JSON.stringify(result),
        status: 'completed',
      });
      publishAsyncJobEvent('job:completed', completedJob, 'Project seed completed.');

      return result;
    },
    {
      connection: getBullConnection(),
    },
  );

  worker.on('failed', async (bullJob, error) => {
    if (!bullJob) {
      return;
    }

    const context = {
      accountId: bullJob.data.accountId,
      userId: bullJob.data.userId,
    };
    const failedJob = await updateJob(context, bullJob.data.jobId ?? bullJob.id!, {
      completedAt: new Date(),
      errorMessage: error.message,
      progress: 100,
      status: 'failed',
    });
    publishAsyncJobEvent('job:failed', failedJob, error.message);
  });

  setProjectSeedWorker(worker);
}

async function queueProjectSeed(context: SeedContext, projectId: string) {
  const project = await getProject(context, projectId);

  if (!project) {
    throw new HttpError({ code: 'project_not_found', message: 'The project could not be found.', statusCode: 404 });
  }

  ensureWorker();

  const job = await createJob(context, {
    inputJson: JSON.stringify({ projectId }),
    projectId,
    type: 'project_seed',
  });

  await getProjectSeedQueue().add('project_seed', {
    accountId: context.accountId,
    jobId: job.id,
    projectId,
    userId: context.userId,
  });

  publishAsyncJobEvent('job:queued', job, 'Project seed queued.');

  return job;
}

async function listProjectJobs(context: SeedContext, projectId: string) {
  return listJobsForProject(context, projectId);
}

export const projectSeedService = {
  ensureWorker,
  listProjectJobs,
  queueProjectSeed,
};
