import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';

import { OperationalWorkspaceAdapter } from '../../shared/projects/operational-workspace-adapter';
import type { OperationalWorkspaceReadModel } from '../../shared/projects/projects.models';

import { ProjectDetail } from './project-detail';

describe('ProjectDetail', () => {
  const read = vi.fn<OperationalWorkspaceAdapter['read']>();

  const model = (state: OperationalWorkspaceReadModel['workItems']['state'] = 'visible') => ({
    schemaVersion: '1' as const,
    readOnly: true as const,
    project: {
      authority: 'control-plane' as const,
      items: [
        {
          id: 'project-1',
          name: 'Themis Core',
          status: 'active' as const,
          updatedAt: '2026-01-01T00:00:00.000Z',
          visibility: 'operational' as const,
        },
      ],
      state,
      source: 'test',
      observedAt: '2026-01-01T00:00:00.000Z',
    },
    protectedContext: {
      authority: 'local-agent' as const,
      items: [],
      state,
      source: 'test',
      observedAt: '2026-01-01T00:00:00.000Z',
    },
    epics: {
      authority: 'opaque-encrypted-source' as const,
      items: [],
      state,
      source: 'test',
      observedAt: '2026-01-01T00:00:00.000Z',
    },
    workItems: {
      authority: 'opaque-encrypted-source' as const,
      items: [],
      state,
      source: 'test',
      observedAt: '2026-01-01T00:00:00.000Z',
    },
    runs: {
      authority: 'opaque-encrypted-source' as const,
      items: [],
      state,
      source: 'test',
      observedAt: '2026-01-01T00:00:00.000Z',
    },
    evidence: {
      authority: 'opaque-encrypted-source' as const,
      items: [],
      state,
      source: 'test',
      observedAt: '2026-01-01T00:00:00.000Z',
    },
    reviews: {
      authority: 'opaque-encrypted-source' as const,
      items: [],
      state,
      source: 'test',
      observedAt: '2026-01-01T00:00:00.000Z',
    },
    activity: {
      authority: 'opaque-encrypted-source' as const,
      items: [],
      state,
      source: 'test',
      observedAt: '2026-01-01T00:00:00.000Z',
    },
  });

  beforeEach(async () => {
    read.mockReset();
    read.mockResolvedValue(model());
    await TestBed.configureTestingModule({
      imports: [ProjectDetail],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'project-1' } } } },
        { provide: OperationalWorkspaceAdapter, useValue: { read } },
      ],
    }).compileComponents();
  });

  it('loads the read-only workspace for the route project', async () => {
    const fixture = TestBed.createComponent(ProjectDetail);

    await fixture.componentInstance.ngOnInit();

    expect(read).toHaveBeenCalledWith('project-1');
    expect(fixture.componentInstance['project']()?.name).toBe('Themis Core');
  });

  it.each(['empty', 'locked', 'unavailable', 'stale', 'error', 'unauthorized', 'malformed'] as const)(
    'renders the %s projection state without mutation controls',
    async (state) => {
      read.mockResolvedValue(model(state));
      const fixture = TestBed.createComponent(ProjectDetail);

      await fixture.componentInstance.ngOnInit();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('No execution or mutation controls are available.');
      expect(fixture.nativeElement.querySelector('main')).not.toBeNull();
    },
  );

  it('renders a safe error when the protected read fails', async () => {
    read.mockRejectedValue(new Error('network failure'));
    const fixture = TestBed.createComponent(ProjectDetail);

    await fixture.componentInstance.ngOnInit();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
    expect(fixture.nativeElement.textContent).toContain('without exposing protected data');
  });
});
