import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import type {
  AsyncJobRecord,
  CreateDocumentPayload,
  CreateProjectPayload,
  JobsListResponse,
  Project,
  ProjectDocument,
  ProjectWithDocuments,
  ProjectsListResponse,
  ResponseEnvelope,
  UpdateProjectPayload,
} from './projects.models';

@Injectable({
  providedIn: 'root',
})
export class ProjectsService {
  private readonly http = inject(HttpClient);

  async listProjects() {
    const response = await firstValueFrom(this.http.get<ProjectsListResponse>('/api/projects'));
    return response.data.projects;
  }

  async getProject(projectId: string) {
    const response = await firstValueFrom(
      this.http.get<ResponseEnvelope<ProjectWithDocuments>>(`/api/projects/${projectId}`),
    );
    return response.data;
  }

  async createProject(payload: CreateProjectPayload) {
    const response = await firstValueFrom(this.http.post<ResponseEnvelope<Project>>('/api/projects', payload));
    return response.data;
  }

  async updateProject(projectId: string, payload: UpdateProjectPayload) {
    const response = await firstValueFrom(
      this.http.patch<ResponseEnvelope<Project>>(`/api/projects/${projectId}`, payload),
    );
    return response.data;
  }

  async deleteProject(projectId: string) {
    await firstValueFrom(this.http.delete(`/api/projects/${projectId}`, { responseType: 'text' }));
  }

  async createDocument(projectId: string, payload: CreateDocumentPayload) {
    const response = await firstValueFrom(
      this.http.post<ResponseEnvelope<ProjectDocument>>(`/api/projects/${projectId}/documents`, payload),
    );
    return response.data;
  }

  async listJobs(projectId: string) {
    const response = await firstValueFrom(this.http.get<JobsListResponse>(`/api/projects/${projectId}/jobs`));
    return response.data.jobs;
  }

  async startSeed(projectId: string) {
    const response = await firstValueFrom(
      this.http.post<ResponseEnvelope<AsyncJobRecord>>(`/api/projects/${projectId}/seed`, {}),
    );
    return response.data;
  }
}
