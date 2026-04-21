import { effect, inject, Injectable, signal } from '@angular/core';

import { ProjectsService } from '../projects/projects.service';
import type { AsyncJobRecord } from '../projects/projects.models';
import { Realtime } from '../realtime/realtime';

@Injectable({ providedIn: 'root' })
export class ProjectSeed {
  private readonly projects = inject(ProjectsService);
  private readonly realtime = inject(Realtime);

  private readonly jobsState = signal<Record<string, AsyncJobRecord>>({});
  readonly jobs = this.jobsState.asReadonly();

  readonly realtimeEffect = effect(() => {
    const event = this.realtime.lastEvent();

    if (!event || !event.job.projectId) {
      return;
    }

    this.jobsState.update((jobs) => ({
      ...jobs,
      [event.job.projectId!]: event.job,
    }));
  });

  async start(projectId: string) {
    const job = await this.projects.startSeed(projectId);
    this.jobsState.update((jobs) => ({
      ...jobs,
      [projectId]: job,
    }));

    return job;
  }

  currentJob(projectId: string) {
    return this.jobsState()[projectId] ?? null;
  }
}
