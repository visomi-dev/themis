import { Job, Worker } from 'bullmq';

import type { AuthConfig } from '../config/auth-config.js';
import { AuthError } from '../auth/auth-errors.js';
import { publishAsyncJobEvent } from '../realtime/realtime-publisher.js';
import { createProjectsService } from '../projects/projects-service.js';

import { createJobStore } from './job-store.js';
import { getBullConnection, getProjectSeedQueue, hasProjectSeedWorker, setProjectSeedWorker } from './queue.js';
import type { ProjectSeedJobInput, ProjectSeedJobResult } from './job-types.js';

type SeedContext = {
  accountId: string;
  userId: string;
};

const wait = async (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const createProjectSeedService = (config: AuthConfig) => {
  const jobStore = createJobStore(config);
  const projectsService = createProjectsService(config);

  const ensureWorker = () => {
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
        const existing = await jobStore.findJobById(context, bullJob.data.jobId ?? bullJob.id!);

        if (!existing) {
          return null;
        }

        const startJob = await jobStore.updateJob(context, existing.id, {
          progress: 10,
          status: 'running',
        });
        publishAsyncJobEvent('job:started', startJob, 'Project seed started.');

        await wait(600);
        const scanJob = await jobStore.updateJob(context, existing.id, {
          progress: 45,
          status: 'running',
        });
        publishAsyncJobEvent('job:progress', scanJob, 'Repository structure scanned.');

        await wait(600);
        const contextJob = await jobStore.updateJob(context, existing.id, {
          progress: 80,
          status: 'running',
        });
        publishAsyncJobEvent('job:progress', contextJob, 'Project context draft prepared.');

        await projectsService.createDocument(context, existing.projectId!, {
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
        const completedJob = await jobStore.updateJob(context, existing.id, {
          completedAt: new Date(),
          progress: 100,
          resultJson: JSON.stringify(result),
          status: 'completed',
        });
        publishAsyncJobEvent('job:completed', completedJob, 'Project seed completed.');

        return result;
      },
      {
        connection: getBullConnection(config),
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
      const failedJob = await jobStore.updateJob(context, bullJob.data.jobId ?? bullJob.id!, {
        completedAt: new Date(),
        errorMessage: error.message,
        progress: 100,
        status: 'failed',
      });
      publishAsyncJobEvent('job:failed', failedJob, error.message);
    });

    setProjectSeedWorker(worker);
  };

  const queueProjectSeed = async (context: SeedContext, projectId: string) => {
    const project = await projectsService.getProject(context, projectId);

    if (!project) {
      throw new AuthError(404, 'project_not_found', 'The project could not be found.');
    }

    ensureWorker();

    const job = await jobStore.createJob(context, {
      inputJson: JSON.stringify({ projectId }),
      projectId,
      type: 'project_seed',
    });

    await getProjectSeedQueue(config).add('project_seed', {
      accountId: context.accountId,
      jobId: job.id,
      projectId,
      userId: context.userId,
    });

    publishAsyncJobEvent('job:queued', job, 'Project seed queued.');

    return job;
  };

  const listProjectJobs = async (context: SeedContext, projectId: string) =>
    jobStore.listJobsForProject(context, projectId);

  return { ensureWorker, listProjectJobs, queueProjectSeed };
};

export { createProjectSeedService };
