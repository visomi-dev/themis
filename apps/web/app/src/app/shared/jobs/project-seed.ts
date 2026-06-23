import { effect, inject, Injectable, signal } from '@angular/core';

import { ProjectsApi } from '../projects/projects';
import type { AsyncJobRecord } from '../projects/projects.models';
import { Realtime } from '../realtime/realtime';

@Injectable({ providedIn: 'root' })
export class ProjectSeed {
  private readonly projects = inject(ProjectsApi);
  private readonly realtime = inject(Realtime);

  private readonly $jobs = signal<Record<string, AsyncJobRecord>>({});
  readonly jobs = this.$jobs.asReadonly();

  readonly realtimeEffect = effect(() => {
    const event = this.realtime.lastEvent();

    if (!event || !event.job.projectId) {
      return;
    }

    this.$jobs.update((jobs) => ({
      ...jobs,
      [event.job.projectId!]: event.job,
    }));
  });

  async start(projectId: string) {
    const job = await this.projects.startSeed(projectId);

    this.$jobs.update((jobs) => ({
      ...jobs,
      [projectId]: job,
    }));

    return job;
  }

  currentJob(projectId: string) {
    return this.$jobs()[projectId] ?? null;
  }
}
