import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import type {
  OperationalCollection,
  OperationalVisibility,
  OperationalWorkspaceReadModel,
  ResponseEnvelope,
} from './projects.models';

/** Read-only consumer seam for the versioned operational workspace boundary. */
@Injectable({ providedIn: 'root' })
export class OperationalWorkspaceAdapter {
  private readonly http = inject(HttpClient);

  async read(projectId: string): Promise<OperationalWorkspaceReadModel> {
    try {
      const response = await firstValueFrom(
        this.http.get<ResponseEnvelope<OperationalWorkspaceReadModel>>(`/api/projects/${projectId}/workspace`),
      );

      if (!isWorkspace(response.data)) return fallback('malformed');

      return response.data;
    } catch (error: unknown) {
      const status = error instanceof HttpErrorResponse ? error.status : 0;

      return fallback(status === 401 ? 'unauthorized' : status === 404 || status === 503 ? 'unavailable' : 'error');
    }
  }
}

function isWorkspace(value: unknown): value is OperationalWorkspaceReadModel {
  const collectionKeys = [
    'project',
    'protectedContext',
    'epics',
    'workItems',
    'runs',
    'evidence',
    'reviews',
    'activity',
  ] as const;

  return (
    isRecord(value) &&
    value.schemaVersion === '1' &&
    value.readOnly === true &&
    collectionKeys.every((key) => {
      const entry = value[key];

      return isCollection(entry) && entry.items.every((item) => isEntity(key, item));
    })
  );
}

type UnknownRecord = Record<string, unknown> & {
  authority?: unknown;
  createdAt?: unknown;
  epicId?: unknown;
  finishedAt?: unknown;
  feedback?: unknown;
  id?: unknown;
  intent?: unknown;
  items?: unknown;
  kind?: unknown;
  name?: unknown;
  observedAt?: unknown;
  occurredAt?: unknown;
  projectId?: unknown;
  readOnly?: unknown;
  reason?: unknown;
  reviewer?: unknown;
  result?: unknown;
  runId?: unknown;
  schemaVersion?: unknown;
  source?: unknown;
  scope?: unknown;
  startedAt?: unknown;
  state?: unknown;
  status?: unknown;
  summary?: unknown;
  title?: unknown;
  updatedAt?: unknown;
  value?: unknown;
  verdict?: unknown;
  visibility?: unknown;
  workItemId?: unknown;
  dependencies?: unknown;
  nextAction?: unknown;
};

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCollection(value: unknown): value is OperationalCollection<unknown> {
  return (
    isRecord(value) &&
    isAuthority(value.authority) &&
    isVisibility(value.state) &&
    Array.isArray(value.items) &&
    typeof value.source === 'string' &&
    typeof value.observedAt === 'string' &&
    (value.reason === undefined || typeof value.reason === 'string')
  );
}

function isVisibility(value: unknown): value is OperationalVisibility {
  return ['visible', 'empty', 'locked', 'unavailable', 'stale', 'error', 'unauthorized', 'malformed'].includes(
    value as string,
  );
}

function isAuthority(value: unknown): boolean {
  return ['control-plane', 'local-agent', 'opaque-encrypted-source'].includes(value as string);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isOneOf<const T extends string>(value: unknown, values: readonly T[]): value is T {
  return typeof value === 'string' && values.includes(value as T);
}

function isEntity(key: keyof OperationalWorkspaceReadModel, value: unknown): boolean {
  if (!isRecord(value)) return false;
  switch (key) {
    case 'project':
      return (
        isString(value.id) &&
        isString(value.name) &&
        isOneOf(value.status, ['active', 'archived', 'draft']) &&
        value.visibility === 'operational' &&
        isString(value.updatedAt)
      );
    case 'protectedContext':
      return (
        isString(value.id) &&
        isString(value.projectId) &&
        isOneOf(value.kind, ['description', 'decision', 'note']) &&
        isString(value.value)
      );
    case 'epics':
      return (
        isString(value.id) &&
        isString(value.projectId) &&
        isString(value.title) &&
        (value.summary === null || isString(value.summary)) &&
        isOneOf(value.status, ['active', 'closed'])
      );
    case 'workItems':
      return (
        isString(value.id) &&
        (value.epicId === null || isString(value.epicId)) &&
        isString(value.title) &&
        isOneOf(value.status, ['draft', 'ready', 'in_progress', 'review', 'blocked', 'done']) &&
        isString(value.updatedAt) &&
        (value.intent === undefined || isString(value.intent)) &&
        (value.scope === undefined || isString(value.scope)) &&
        (value.dependencies === undefined ||
          (Array.isArray(value.dependencies) && value.dependencies.every(isString))) &&
        (value.nextAction === undefined || isString(value.nextAction))
      );
    case 'runs':
      return (
        isString(value.id) &&
        isString(value.workItemId) &&
        isOneOf(value.status, ['running', 'completed', 'failed']) &&
        isString(value.startedAt) &&
        (value.finishedAt === null || isString(value.finishedAt))
      );
    case 'evidence':
      return (
        isString(value.id) &&
        isString(value.runId) &&
        isOneOf(value.kind, ['verification', 'implementation-diff', 'observation', 'command']) &&
        isString(value.createdAt) &&
        (value.summary === undefined || isString(value.summary)) &&
        (value.result === undefined || isOneOf(value.result, ['passed', 'failed', 'blocked']))
      );
    case 'reviews':
      return (
        isString(value.id) &&
        isString(value.workItemId) &&
        isOneOf(value.verdict, ['accepted', 'rejected', 'pending', 'rework']) &&
        isString(value.createdAt) &&
        (value.reviewer === undefined || isString(value.reviewer)) &&
        (value.feedback === undefined || isString(value.feedback))
      );
    case 'activity':
      return (
        isString(value.id) &&
        isString(value.projectId) &&
        isOneOf(value.kind, ['status', 'progress', 'run', 'review']) &&
        isString(value.occurredAt) &&
        isString(value.summary)
      );
    default:
      return false;
  }
}

function fallback(state: OperationalVisibility): OperationalWorkspaceReadModel {
  const collection = <T>(authority: OperationalCollection<T>['authority']): OperationalCollection<T> => ({
    authority,
    items: [],
    state,
    source: 'angular-operational-workspace-adapter',
    observedAt: new Date().toISOString(),
    reason: 'Protected content was not disclosed.',
  });

  return {
    schemaVersion: '1',
    readOnly: true,
    project: collection('control-plane'),
    protectedContext: collection('local-agent'),
    epics: collection('opaque-encrypted-source'),
    workItems: collection('opaque-encrypted-source'),
    runs: collection('opaque-encrypted-source'),
    evidence: collection('opaque-encrypted-source'),
    reviews: collection('opaque-encrypted-source'),
    activity: collection('opaque-encrypted-source'),
  };
}
