import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';

import { ProjectProjection, BrowserVaultProjectionAdapter, LocalAgentProjectionAdapter } from './project-projection';

const snapshot = {
  tenantId: 'tenant-a',
  workspaceId: 'workspace-a',
  revision: 1,
  updatedAt: '2026-02-01T00:00:00.000Z',
  tombstones: [],
  work: [{ id: 'w1', title: 'Ship projection', status: 'doing' as const, position: 1 }],
  planning: [{ id: 'p1', title: 'Review scope', horizon: 'now' as const }],
  progress: [{ id: 'g1', label: 'Implementation', percent: 60, updatedAt: '2026-02-01T00:00:00.000Z' }],
};

describe('ProjectProjection', () => {
  it('reads the browser-vault projection and preserves tenant/version metadata', async () => {
    const http = { get: vi.fn(() => of(snapshot)) };

    TestBed.configureTestingModule({ providers: [{ provide: HttpClient, useValue: http }] });
    const service = TestBed.inject(ProjectProjection);

    service.unlockWebOnly('project-1', { tenantId: 'tenant-a', workspaceId: 'workspace-a' });

    await vi.waitFor(() => expect(service.state()).toBe('ready'));
    expect(service.snapshot()?.tenantId).toBe('tenant-a');
    expect(http.get).toHaveBeenCalledWith('/v1/browser-vault/projections/project-1');
  });

  it('supports the local-agent adapter and maps offline failures', async () => {
    const http = { get: vi.fn(() => throwError(() => new Error('offline'))) };

    TestBed.configureTestingModule({ providers: [{ provide: HttpClient, useValue: http }] });
    const service = TestBed.inject(ProjectProjection);

    service.unlockWebOnly('project-1', { tenantId: 'tenant-a', workspaceId: 'workspace-a' });

    await vi.waitFor(() => expect(service.state()).toBe('offline'));
    expect(service.error()).toContain('offline');
    expect(TestBed.inject(LocalAgentProjectionAdapter)).toBeTruthy();
    expect(TestBed.inject(BrowserVaultProjectionAdapter)).toBeTruthy();
  });

  it('maps an unavailable local agent response to a safe Web-only fallback', async () => {
    const http = { get: vi.fn(() => throwError(() => new HttpErrorResponse({ status: 503 }))) };

    TestBed.configureTestingModule({ providers: [{ provide: HttpClient, useValue: http }] });
    const service = TestBed.inject(ProjectProjection);

    service.selectMode('local-agent', 'project-1', { tenantId: 'tenant-a', workspaceId: 'workspace-a' });

    await vi.waitFor(() => expect(service.state()).toBe('web-only-fallback'));
    expect(service.mode()).toBe('web-only');
    expect(service.error()).toContain('Web-only mode');
  });

  it('rejects a browser projection returned for another tenant or workspace', async () => {
    const http = { get: vi.fn(() => of(snapshot)) };

    TestBed.configureTestingModule({ providers: [{ provide: HttpClient, useValue: http }] });
    const service = TestBed.inject(ProjectProjection);

    service.unlockWebOnly('project-1', { tenantId: 'tenant-b', workspaceId: 'workspace-b' });

    await vi.waitFor(() => expect(service.state()).toBe('unauthorized'));
    expect(service.snapshot()).toBeNull();
    expect(service.error()).toContain('different tenant or workspace');
  });

  it('rejects a local-agent projection returned for another workspace', async () => {
    const http = { get: vi.fn(() => of({ projection: snapshot })) };

    TestBed.configureTestingModule({ providers: [{ provide: HttpClient, useValue: http }] });
    const service = TestBed.inject(ProjectProjection);

    service.selectMode('local-agent', 'project-1', { tenantId: 'tenant-a', workspaceId: 'workspace-b' });

    await vi.waitFor(() => expect(service.state()).toBe('unauthorized'));
    expect(service.snapshot()).toBeNull();
  });
});
