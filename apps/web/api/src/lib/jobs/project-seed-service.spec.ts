import type { ProjectWithDocuments } from '../projects/projects-types';

const createDocument = jest.fn();
const createJob = jest.fn();
const findJobById = jest.fn();
const publishAsyncJobEvent = jest.fn();
const queueAdd = jest.fn();
const setProjectSeedWorker = jest.fn();
const updateJob = jest.fn();
const workerOn = jest.fn();
const getProject = jest.fn();

let workerProcessor:
  | ((job: { data: { accountId: string; jobId: string; userId: string } }) => Promise<unknown>)
  | undefined;

jest.mock('../projects/projects-service', () => ({
  createProjectsService: () => ({
    createDocument,
    getProject,
  }),
}));

jest.mock('./job-store', () => ({
  createJobStore: () => ({
    createJob,
    findJobById,
    updateJob,
  }),
}));

jest.mock('./queue', () => ({
  getBullConnection: jest.fn(() => ({ connection: true })),
  getProjectSeedQueue: jest.fn(() => ({ add: queueAdd })),
  hasProjectSeedWorker: jest.fn(() => false),
  setProjectSeedWorker,
}));

jest.mock('../realtime/realtime-publisher', () => ({
  publishAsyncJobEvent,
}));

jest.mock('bullmq', () => ({
  Worker: jest
    .fn()
    .mockImplementation(
      (
        _name: string,
        processor: (job: { data: { accountId: string; jobId: string; userId: string } }) => Promise<unknown>,
      ) => {
        workerProcessor = processor;

        return {
          on: workerOn,
        };
      },
    ),
}));

import { createProjectSeedService } from './project-seed-service';

describe('createProjectSeedService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    workerProcessor = undefined;

    createJob.mockResolvedValue({
      completedAt: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      errorMessage: null,
      id: 'job-1',
      accountId: 'account-1',
      progress: 0,
      projectId: 'project-1',
      resultJson: null,
      status: 'queued',
      type: 'project_seed',
      updatedAt: '2026-01-01T00:00:00.000Z',
      userId: 'user-1',
    });
    getProject.mockResolvedValue({ id: 'project-1' } as ProjectWithDocuments);
  });

  it('queues a project seed job and emits the queued event', async () => {
    const service = createProjectSeedService({} as never);

    const job = await service.queueProjectSeed({ accountId: 'account-1', userId: 'user-1' }, 'project-1');

    expect(createJob).toHaveBeenCalledWith(
      { accountId: 'account-1', userId: 'user-1' },
      {
        inputJson: JSON.stringify({ projectId: 'project-1' }),
        projectId: 'project-1',
        type: 'project_seed',
      },
    );
    expect(queueAdd).toHaveBeenCalledWith('project_seed', {
      accountId: 'account-1',
      jobId: 'job-1',
      projectId: 'project-1',
      userId: 'user-1',
    });
    expect(publishAsyncJobEvent).toHaveBeenCalledWith('job:queued', job, 'Project seed queued.');
  });

  it('runs the worker flow and persists progress plus the seeded document', async () => {
    const queuedJob = {
      completedAt: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      errorMessage: null,
      id: 'job-1',
      accountId: 'account-1',
      progress: 0,
      projectId: 'project-1',
      resultJson: null,
      status: 'queued',
      type: 'project_seed',
      updatedAt: '2026-01-01T00:00:00.000Z',
      userId: 'user-1',
    };
    const runningJob = { ...queuedJob, progress: 10, status: 'running' };
    const scannedJob = { ...queuedJob, progress: 45, status: 'running' };
    const contextJob = { ...queuedJob, progress: 80, status: 'running' };
    const completedJob = {
      ...queuedJob,
      completedAt: '2026-01-01T00:01:00.000Z',
      progress: 100,
      resultJson: JSON.stringify({ summary: 'Initial project overview generated.' }),
      status: 'completed',
    };

    findJobById.mockResolvedValue(queuedJob);
    updateJob
      .mockResolvedValueOnce(runningJob)
      .mockResolvedValueOnce(scannedJob)
      .mockResolvedValueOnce(contextJob)
      .mockResolvedValueOnce(completedJob);

    const service = createProjectSeedService({} as never);
    service.ensureWorker();

    expect(workerProcessor).toBeDefined();

    await workerProcessor?.({ data: { accountId: 'account-1', jobId: 'job-1', userId: 'user-1' } });

    expect(createDocument).toHaveBeenCalledWith(
      { accountId: 'account-1', userId: 'user-1' },
      'project-1',
      expect.objectContaining({
        documentType: 'overview',
        source: 'seeded',
        title: 'Seeded Project Overview',
      }),
    );
    expect(publishAsyncJobEvent).toHaveBeenCalledWith('job:started', runningJob, 'Project seed started.');
    expect(publishAsyncJobEvent).toHaveBeenCalledWith('job:progress', scannedJob, 'Repository structure scanned.');
    expect(publishAsyncJobEvent).toHaveBeenCalledWith('job:progress', contextJob, 'Project context draft prepared.');
    expect(publishAsyncJobEvent).toHaveBeenCalledWith('job:completed', completedJob, 'Project seed completed.');
  });
});
