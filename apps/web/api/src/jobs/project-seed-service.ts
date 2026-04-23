import { Job, Worker } from 'bullmq';

import type { AuthConfig } from '../shared/config/auth-config';
import { AuthError } from '../auth/auth-errors';
import { projectsService } from '../projects/projects-service';
import { publishAsyncJobEvent } from '../realtime/realtime-publisher';

import { createJobStore } from './job-store';
import { getBullConnection, getProjectSeedQueue, hasProjectSeedWorker, setProjectSeedWorker } from './queue';
import type { ProjectSeedJobInput, ProjectSeedJobResult } from './job-types';

type SeedContext = {
  accountId: string;
  userId: string;
};

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class ProjectSeedService {
  private config?: AuthConfig;
  private jobStore?: ReturnType<typeof createJobStore>;

  configure(config: AuthConfig) {
    this.config = config;
    this.jobStore = createJobStore(config);
    projectsService.configure(config);

    return this;
  }

  ensureWorker() {
    if (hasProjectSeedWorker()) {
      return;
    }

    const config = this.getConfig();
    const jobStore = this.getJobStore();

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
  }

  async queueProjectSeed(context: SeedContext, projectId: string) {
    const config = this.getConfig();
    const jobStore = this.getJobStore();
    const project = await projectsService.getProject(context, projectId);

    if (!project) {
      throw new AuthError(404, 'project_not_found', 'The project could not be found.');
    }

    this.ensureWorker();

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
  }

  async listProjectJobs(context: SeedContext, projectId: string) {
    return this.getJobStore().listJobsForProject(context, projectId);
  }

  private getConfig() {
    if (!this.config) {
      throw new Error('ProjectSeedService.configure() must be called before use.');
    }

    return this.config;
  }

  private getJobStore() {
    if (!this.jobStore) {
      throw new Error('ProjectSeedService.configure() must be called before use.');
    }

    return this.jobStore;
  }
}

const projectSeedService = new ProjectSeedService();

export { projectSeedService };
