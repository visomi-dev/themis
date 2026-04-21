import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import type {
  CreateDocumentPayload,
  CreateProjectPayload,
  Project,
  ProjectDocument,
  ProjectWithDocuments,
  UpdateProjectPayload,
} from './projects.models';

type ProjectsListResponse = {
  projects: Project[];
};

@Injectable({
  providedIn: 'root',
})
export class ProjectsService {
  private readonly http = inject(HttpClient);

  async listProjects() {
    return firstValueFrom(this.http.get<ProjectsListResponse>('/api/projects'));
  }

  async getProject(projectId: string) {
    return firstValueFrom(this.http.get<ProjectWithDocuments>(`/api/projects/${projectId}`));
  }

  async createProject(payload: CreateProjectPayload) {
    return firstValueFrom(this.http.post<Project>('/api/projects', payload));
  }

  async updateProject(projectId: string, payload: UpdateProjectPayload) {
    return firstValueFrom(this.http.patch<Project>(`/api/projects/${projectId}`, payload));
  }

  async deleteProject(projectId: string) {
    await firstValueFrom(this.http.delete(`/api/projects/${projectId}`, { responseType: 'text' }));
  }

  async createDocument(projectId: string, payload: CreateDocumentPayload) {
    return firstValueFrom(this.http.post<ProjectDocument>(`/api/projects/${projectId}/documents`, payload));
  }
}