import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ProjectsService } from '../projects/projects.service';
import { Realtime } from '../realtime/realtime';

import { ProjectSeed } from './project-seed';

describe('ProjectSeed', () => {
  const lastEventState = signal<{
    eventName: 'job:progress';
    job: {
      completedAt: string | null;
      createdAt: string;
      errorMessage: string | null;
      id: string;
      progress: number;
      projectId: string | null;
      resultJson: string | null;
      status: 'running';
      type: 'project_seed';
      updatedAt: string;
      userId: string;
    };
    message: string;
    timestamp: string;
  } | null>(null);
  const startSeed = vi.fn();

  beforeEach(() => {
    lastEventState.set(null);
    startSeed.mockReset();

    TestBed.configureTestingModule({
      providers: [
        ProjectSeed,
        {
          provide: ProjectsService,
          useValue: {
            startSeed,
          },
        },
        {
          provide: Realtime,
          useValue: {
            lastEvent: lastEventState.asReadonly(),
          },
        },
      ],
    });
  });

  it('stores the started job returned by the API', async () => {
    const job = {
      completedAt: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      errorMessage: null,
      id: 'job-1',
      progress: 0,
      projectId: 'project-1',
      resultJson: null,
      status: 'queued' as const,
      type: 'project_seed' as const,
      updatedAt: '2026-01-01T00:00:00.000Z',
      userId: 'user-1',
    };
    startSeed.mockResolvedValue(job);

    const service = TestBed.inject(ProjectSeed);
    await service.start('project-1');

    expect(service.currentJob('project-1')).toEqual(job);
  });

  it('updates the current project job from realtime events', () => {
    const service = TestBed.inject(ProjectSeed);

    lastEventState.set({
      eventName: 'job:progress',
      job: {
        completedAt: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        errorMessage: null,
        id: 'job-1',
        progress: 60,
        projectId: 'project-1',
        resultJson: null,
        status: 'running',
        type: 'project_seed',
        updatedAt: '2026-01-01T00:00:00.000Z',
        userId: 'user-1',
      },
      message: 'Progress update',
      timestamp: '2026-01-01T00:00:00.000Z',
    });
    TestBed.flushEffects();

    expect(service.currentJob('project-1')?.progress).toBe(60);
  });
});
