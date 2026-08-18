import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { LocalAgentVisibility } from './local-agent-visibility';

describe('LocalAgentVisibility', () => {
  let service: LocalAgentVisibility;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LocalAgentVisibility, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(LocalAgentVisibility);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('reads only from the local agent boundary', async () => {
    const resultPromise = service.readProject('project-1');
    const request = http.expectOne('http://127.0.0.1:4317/v1/product-visibility/projects/project-1');

    request.flush({
      project: { id: 'project-1', name: 'Core', sourceType: 'manual', status: 'active', updatedAt: 'now' },
      context: 'Approved context',
      activity: [],
      state: 'authorized',
    });

    await expect(resultPromise).resolves.toEqual(expect.objectContaining({ kind: 'success' }));
  });

  it('maps authorization failures without exposing a response body', async () => {
    const resultPromise = service.readProject('project-1');

    http.expectOne(/product-visibility/).flush('protected plaintext', { status: 403, statusText: 'Forbidden' });

    await expect(resultPromise).resolves.toEqual({
      kind: 'unauthorized',
      message: 'This device is not authorized to view this project.',
    });
  });

  it('maps a locked agent response to an explicit locked view', async () => {
    const resultPromise = service.readProject('project-1');

    http.expectOne(/product-visibility/).flush(null, { status: 423, statusText: 'Locked' });

    await expect(resultPromise).resolves.toEqual(
      expect.objectContaining({ kind: 'success', view: expect.objectContaining({ state: 'locked' }) }),
    );
  });

  it('distinguishes an unavailable local agent from other failures', async () => {
    const resultPromise = service.readProject('project-1');

    http.expectOne(/product-visibility/).flush(null, { status: 0, statusText: 'Network error' });

    await expect(resultPromise).resolves.toEqual(expect.objectContaining({ kind: 'unavailable' }));
  });
});
