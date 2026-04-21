import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import type { ActivationMilestone, ActivationState, CreateApiKeyPayload, CreatedApiKey } from './activation.models';

@Injectable({
  providedIn: 'root',
})
export class Activation {
  private readonly http = inject(HttpClient);

  async loadState() {
    return firstValueFrom(this.http.get<ActivationState>('/api/activation'));
  }

  async createApiKey(payload: CreateApiKeyPayload) {
    return firstValueFrom(this.http.post<CreatedApiKey>('/api/activation/api-keys', payload));
  }

  async recordMilestone(milestone: ActivationMilestone, metadata?: Record<string, string | null>) {
    await firstValueFrom(
      this.http.post('/api/activation/milestones', { metadata, milestone }, { responseType: 'text' }),
    );
  }

  async revokeApiKey(apiKeyId: string) {
    await firstValueFrom(this.http.post(`/api/activation/api-keys/${apiKeyId}/revoke`, {}, { responseType: 'text' }));
  }
}
