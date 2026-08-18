import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import type { ProjectStatus, ProjectSourceType } from './projects.models';

export type LocalAgentVisibilityState = 'authorized' | 'locked' | 'stale' | 'empty';

export type LocalAgentProjectView = {
  project: {
    id: string;
    name: string;
    sourceType: ProjectSourceType;
    status: ProjectStatus;
    updatedAt: string;
  };
  context: string | null;
  activity: Array<{ id: string; occurredAt: string; summary: string }>;
  state: LocalAgentVisibilityState;
  staleAt?: string;
};

export type LocalAgentVisibilityResult =
  | { kind: 'success'; view: LocalAgentProjectView }
  | { kind: 'unauthorized' | 'unavailable' | 'error'; message: string };

@Injectable({ providedIn: 'root' })
export class LocalAgentVisibility {
  private readonly http = inject(HttpClient);
  private readonly endpoint = 'http://127.0.0.1:4317/v1/product-visibility/projects';

  async readProject(projectId: string): Promise<LocalAgentVisibilityResult> {
    try {
      const view = await firstValueFrom(this.http.get<LocalAgentProjectView>(`${this.endpoint}/${projectId}`));

      return { kind: 'success', view };
    } catch (error: unknown) {
      if (error instanceof HttpErrorResponse) {
        if (error.status === 401 || error.status === 403) {
          return { kind: 'unauthorized', message: 'This device is not authorized to view this project.' };
        }

        if (error.status === 423) {
          return { kind: 'success', view: this.lockedView(projectId) };
        }
      }

      if (error instanceof TypeError || (error instanceof HttpErrorResponse && error.status === 0)) {
        return {
          kind: 'unavailable',
          message: 'The local agent is unavailable. Start it to view protected project data.',
        };
      }

      return { kind: 'error', message: 'The local agent could not provide this project view.' };
    }
  }

  private lockedView(projectId: string): LocalAgentProjectView {
    return {
      activity: [],
      context: null,
      project: { id: projectId, name: 'Protected project', sourceType: 'manual', status: 'draft', updatedAt: '' },
      state: 'locked',
    };
  }
}
