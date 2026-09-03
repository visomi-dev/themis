import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { OperationalWorkspaceAdapter } from './operational-workspace-adapter';

describe('OperationalWorkspaceAdapter', () => {
  it('reads the versioned workspace boundary without exposing mutation methods', async () => {
    TestBed.configureTestingModule({
      providers: [OperationalWorkspaceAdapter, provideHttpClient(), provideHttpClientTesting()],
    });
    const adapter = TestBed.inject(OperationalWorkspaceAdapter);
    const http = TestBed.inject(HttpTestingController);
    const resultPromise = adapter.read('project-1');
    const request = http.expectOne('/api/projects/project-1/workspace');

    request.flush({
      data: {
        schemaVersion: '1',
        readOnly: true,
        project: { authority: 'control-plane', items: [], state: 'empty', source: 'control-plane', observedAt: 'now' },
        protectedContext: {
          authority: 'local-agent',
          items: [],
          state: 'locked',
          source: 'local-agent',
          observedAt: 'now',
        },
        epics: { authority: 'opaque-encrypted-source', items: [], state: 'empty', source: 'opaque', observedAt: 'now' },
        workItems: {
          authority: 'opaque-encrypted-source',
          items: [],
          state: 'empty',
          source: 'opaque',
          observedAt: 'now',
        },
        runs: { authority: 'opaque-encrypted-source', items: [], state: 'empty', source: 'opaque', observedAt: 'now' },
        evidence: {
          authority: 'opaque-encrypted-source',
          items: [],
          state: 'empty',
          source: 'opaque',
          observedAt: 'now',
        },
        reviews: {
          authority: 'opaque-encrypted-source',
          items: [],
          state: 'empty',
          source: 'opaque',
          observedAt: 'now',
        },
        activity: {
          authority: 'opaque-encrypted-source',
          items: [],
          state: 'empty',
          source: 'opaque',
          observedAt: 'now',
        },
      },
      message: 'ok',
    });

    await expect(resultPromise).resolves.toMatchObject({
      schemaVersion: '1',
      readOnly: true,
      protectedContext: { state: 'locked' },
    });
    expect(Object.keys(Object.getPrototypeOf(adapter))).not.toContain('create');
    http.verify();
  });

  it('maps every protected visibility state without exposing a mutation seam', async () => {
    const states = [
      'visible',
      'empty',
      'locked',
      'unavailable',
      'stale',
      'error',
      'unauthorized',
      'malformed',
    ] as const;

    for (const state of states) {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [OperationalWorkspaceAdapter, provideHttpClient(), provideHttpClientTesting()],
      });
      const adapter = TestBed.inject(OperationalWorkspaceAdapter);
      const http = TestBed.inject(HttpTestingController);
      const resultPromise = adapter.read(`project-${state}`);
      const request = http.expectOne(`/api/projects/project-${state}/workspace`);

      if (state === 'unauthorized') {
        request.flush({ code: 'unauthorized', message: 'Denied' }, { status: 401, statusText: 'Unauthorized' });
      } else if (state === 'error') {
        request.flush({ code: 'error', message: 'Unavailable' }, { status: 500, statusText: 'Error' });
      } else if (state === 'unavailable') {
        request.flush({ code: 'unavailable', message: 'Unavailable' }, { status: 503, statusText: 'Unavailable' });
      } else if (state === 'malformed') {
        request.flush({ data: { schemaVersion: '1', readOnly: true }, message: 'Malformed' });
      } else {
        request.flush({
          data: { ...minimalWorkspace(), project: { ...minimalWorkspace().project, state } },
          message: 'ok',
        });
      }

      await expect(resultPromise).resolves.toMatchObject({ project: { state } });
      expect(Object.getOwnPropertyNames(Object.getPrototypeOf(adapter))).not.toContain('create');
      http.verify();
    }
  });
});

function minimalWorkspace() {
  const collection = {
    authority: 'opaque-encrypted-source' as const,
    items: [],
    state: 'empty' as const,
    source: 'fixture',
    observedAt: 'now',
  };

  return {
    schemaVersion: '1' as const,
    readOnly: true as const,
    project: { ...collection, authority: 'control-plane' as const },
    protectedContext: { ...collection, authority: 'local-agent' as const },
    epics: collection,
    workItems: collection,
    runs: collection,
    evidence: collection,
    reviews: collection,
    activity: collection,
  };
}
