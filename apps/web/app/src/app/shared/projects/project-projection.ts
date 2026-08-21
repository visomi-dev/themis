import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export type ProjectionMode = 'web-only' | 'local-agent';
export type ProjectionScope = Readonly<{ tenantId: string; workspaceId: string }>;
export type ProjectionState =
  | 'loading'
  | 'locked'
  | 'unavailable'
  | 'web-only-fallback'
  | 'offline'
  | 'stale'
  | 'conflict'
  | 'empty'
  | 'unauthorized'
  | 'error'
  | 'ready';

export type ProjectionSnapshot = Readonly<{
  tenantId: string;
  workspaceId: string;
  revision: number;
  updatedAt: string;
  tombstones: string[];
  work: ReadonlyArray<{ id: string; title: string; status: 'todo' | 'doing' | 'done'; position: number }>;
  planning: ReadonlyArray<{ id: string; title: string; horizon: 'now' | 'next' | 'later' }>;
  progress: ReadonlyArray<{ id: string; label: string; percent: number; updatedAt: string }>;
}>;

export abstract class ProjectionAdapter {
  abstract read(projectId: string, scope: ProjectionScope): Promise<ProjectionSnapshot>;
}

export class ProjectionScopeError extends Error {
  constructor() {
    super('The projection identity does not match the selected workspace.');
    this.name = 'ProjectionScopeError';
  }
}

function redactBridgeDiagnostic(value: unknown): string {
  const message = value instanceof Error ? value.message : typeof value === 'string' ? value : 'Bridge request failed.';

  return message
    .replace(/(authorization|cookie|token|secret|key|signature)\s*[:=]\s*[^\s,;]+/gi, '$1=[redacted]')
    .replace(/[A-Za-z0-9_-]{32,}/g, '[redacted]')
    .slice(0, 180);
}

function validateScope(snapshot: ProjectionSnapshot, scope: ProjectionScope): ProjectionSnapshot {
  if (snapshot.tenantId !== scope.tenantId || snapshot.workspaceId !== scope.workspaceId) {
    throw new ProjectionScopeError();
  }

  return snapshot;
}

@Injectable({ providedIn: 'root' })
export class BrowserVaultProjectionAdapter implements ProjectionAdapter {
  private readonly http = inject(HttpClient);

  async read(projectId: string, scope: ProjectionScope): Promise<ProjectionSnapshot> {
    const snapshot = await firstValueFrom(
      this.http.get<ProjectionSnapshot>(`/v1/browser-vault/projections/${projectId}`),
    );

    return validateScope(snapshot, scope);
  }
}

@Injectable({ providedIn: 'root' })
export class LocalAgentProjectionAdapter implements ProjectionAdapter {
  private readonly http = inject(HttpClient);

  async read(projectId: string, scope: ProjectionScope): Promise<ProjectionSnapshot> {
    const response = await firstValueFrom(
      this.http.get<{ projection: ProjectionSnapshot }>(`/v1/local-agent/projections/${projectId}`, {
        headers: new HttpHeaders({
          'x-themis-bridge-capabilities': 'projection',
          'x-themis-bridge-version': '1',
        }),
      }),
    );

    return validateScope(response.projection, scope);
  }
}

@Injectable({ providedIn: 'root' })
export class ProjectProjection {
  private readonly browserVault = inject(BrowserVaultProjectionAdapter);
  private readonly localAgent = inject(LocalAgentProjectionAdapter);

  readonly mode = signal<ProjectionMode>('web-only');
  readonly state = signal<ProjectionState>('locked');
  readonly snapshot = signal<ProjectionSnapshot | null>(null);
  readonly error = signal('');
  readonly unlocked = signal(false);
  readonly scope = signal<ProjectionScope | null>(null);
  readonly fallbackReason = signal('');

  selectMode(mode: ProjectionMode, projectId: string, scope: ProjectionScope): void {
    this.mode.set(mode);
    this.scope.set(scope);
    this.snapshot.set(null);
    this.error.set('');
    this.fallbackReason.set('');

    this.unlocked.set(mode === 'local-agent');
    this.state.set(mode === 'web-only' ? 'locked' : 'loading');
    void this.load(projectId);
  }

  unlockWebOnly(projectId: string, scope: ProjectionScope): void {
    this.scope.set(scope);
    this.unlocked.set(true);

    this.state.set('loading');
    void this.load(projectId);
  }

  private async load(projectId: string): Promise<void> {
    if (this.mode() === 'web-only' && !this.unlocked()) {
      this.state.set('locked');

      return;
    }

    const scope = this.scope();

    if (!scope) {
      this.state.set('unauthorized');
      this.error.set('A tenant and workspace must be selected before opening a projection.');

      return;
    }

    try {
      const snapshot = await (this.mode() === 'web-only'
        ? this.browserVault.read(projectId, scope)
        : this.localAgent.read(projectId, scope));

      this.snapshot.set(snapshot);
      this.state.set(this.deriveState(snapshot));
    } catch (error: unknown) {
      const status = error instanceof HttpErrorResponse ? error.status : 0;

      const canFallBack = this.mode() === 'local-agent' && (status === 0 || status === 408 || status === 503);

      this.state.set(
        error instanceof ProjectionScopeError || status === 401 || status === 403
          ? 'unauthorized'
          : canFallBack
            ? 'web-only-fallback'
            : status === 0
              ? 'offline'
              : 'error',
      );
      this.error.set(
        error instanceof ProjectionScopeError
          ? 'The selected projection belongs to a different tenant or workspace.'
          : status === 401 || status === 403
            ? 'This workspace is not authorized for the selected projection.'
            : canFallBack
              ? redactBridgeDiagnostic('The local agent is unavailable; Web-only mode is ready as a safe fallback.')
              : status === 0
                ? 'The local projection source is offline.'
                : 'The projection could not be opened. Protected content was not disclosed.',
      );
      if (canFallBack) {
        this.mode.set('web-only');
        this.unlocked.set(false);
        this.fallbackReason.set(
          'The local agent is unavailable. Web-only mode remains available without exporting keys.',
        );
      }
    }
  }

  private deriveState(snapshot: ProjectionSnapshot): ProjectionState {
    if (snapshot.tombstones.length > 0 && snapshot.revision < 0) return 'conflict';

    if (snapshot.updatedAt < '2026-01-01T00:00:00.000Z') return 'stale';

    if (snapshot.work.length === 0 && snapshot.planning.length === 0 && snapshot.progress.length === 0) return 'empty';

    return 'ready';
  }
}
