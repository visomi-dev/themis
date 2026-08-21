import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';

import { Auth } from '../../shared/auth/auth';
import { ProjectSeed } from '../../shared/jobs/project-seed';
import { LocalAgentVisibility } from '../../shared/projects/local-agent-visibility';

import { ProjectDetail } from './project-detail';

describe('ProjectDetail', () => {
  const seedStart = vi.fn();

  const signOut = vi.fn();

  const readProject = vi.fn();

  const navigate = vi.fn();

  beforeEach(async () => {
    seedStart.mockReset();
    signOut.mockReset();
    readProject.mockReset();
    navigate.mockReset();
    readProject.mockResolvedValue({
      kind: 'success',
      view: {
        activity: [],
        context: 'Core workspace',
        project: {
          id: 'project-1',
          name: 'Themis Core',
          sourceType: 'manual',
          status: 'active',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        state: 'authorized',
      },
    });

    await TestBed.configureTestingModule({
      imports: [ProjectDetail],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: () => 'project-1',
              },
              queryParamMap: {
                get: (key: string) => ({ tenantId: 'tenant-a', workspaceId: 'workspace-a' })[key] ?? null,
              },
            },
          },
        },
        {
          provide: Auth,
          useValue: {
            signOut,
            user: () => ({ accountId: 'account-1', email: 'engineer@themis.dev', emailVerifiedAt: null, id: 'user-1' }),
          },
        },
        { provide: LocalAgentVisibility, useValue: { readProject } },
        {
          provide: ProjectSeed,
          useValue: {
            currentJob: () => null,
            start: seedStart,
          },
        },
      ],
    }).compileComponents();

    vi.spyOn(TestBed.inject(Router), 'navigate').mockImplementation(navigate as never);
  });

  it('loads the current project on init', async () => {
    const fixture = TestBed.createComponent(ProjectDetail);

    await fixture.componentInstance.ngOnInit();

    expect(readProject).toHaveBeenCalledWith('project-1');
    expect(fixture.componentInstance.project()?.name).toBe('Themis Core');
  });

  it('starts the seed job for the current project', async () => {
    const fixture = TestBed.createComponent(ProjectDetail);

    await fixture.componentInstance.ngOnInit();

    await fixture.componentInstance.runSeed();

    expect(seedStart).toHaveBeenCalledWith('project-1');
  });

  it('surfaces an error if the seed job cannot start', async () => {
    seedStart.mockRejectedValue(new Error('boom'));
    const fixture = TestBed.createComponent(ProjectDetail);

    await fixture.componentInstance.ngOnInit();

    await fixture.componentInstance.runSeed();

    expect(fixture.componentInstance.errorMessage()).toContain('could not be started');
  });

  it('renders the locked state without requesting cloud project content', async () => {
    readProject.mockResolvedValue({
      kind: 'success',
      view: {
        activity: [],
        context: null,
        project: { id: 'project-1', name: 'Protected project', sourceType: 'manual', status: 'draft', updatedAt: '' },
        state: 'locked',
      },
    });
    const fixture = TestBed.createComponent(ProjectDetail);

    await fixture.componentInstance.ngOnInit();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.visibilityState()).toBe('locked');
    expect(fixture.componentInstance.project()).toBeNull();
    expect(fixture.nativeElement.querySelector('[role="status"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain('Project is locked');
  });

  it('renders an accessible stale state while keeping the approved view visible', async () => {
    readProject.mockResolvedValue({
      kind: 'success',
      view: {
        activity: [{ id: 'activity-1', occurredAt: '2026-01-02T00:00:00.000Z', summary: 'Reviewed the plan' }],
        context: 'Approved context',
        project: {
          id: 'project-1',
          name: 'Themis Core',
          sourceType: 'manual',
          status: 'active',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        staleAt: '2026-01-03T00:00:00.000Z',
        state: 'stale',
      },
    });
    const fixture = TestBed.createComponent(ProjectDetail);

    await fixture.componentInstance.ngOnInit();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.visibilityState()).toBe('stale');
    expect(fixture.nativeElement.querySelector('[data-slot="alert"]')?.textContent).toContain('stale');
    expect(fixture.nativeElement.textContent).toContain('Approved context');
    expect(fixture.nativeElement.querySelector('[aria-label="Recent approved activity"]')).not.toBeNull();
  });

  it('renders an accessible empty state without inventing protected content', async () => {
    readProject.mockResolvedValue({
      kind: 'success',
      view: {
        activity: [],
        context: null,
        project: {
          id: 'project-1',
          name: 'Themis Core',
          sourceType: 'manual',
          status: 'active',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
        state: 'authorized',
      },
    });
    const fixture = TestBed.createComponent(ProjectDetail);

    await fixture.componentInstance.ngOnInit();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.visibilityState()).toBe('empty');
    expect(fixture.nativeElement.textContent).toContain('No approved context or activity is available');
    expect(fixture.nativeElement.querySelector('section[aria-live="polite"]')).not.toBeNull();
  });

  it('renders local-agent errors as an accessible alert', async () => {
    readProject.mockResolvedValue({ kind: 'error', message: 'The local agent could not provide this project view.' });
    const fixture = TestBed.createComponent(ProjectDetail);

    await fixture.componentInstance.ngOnInit();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.visibilityState()).toBe('error');
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain('Project view failed');
    expect(fixture.nativeElement.textContent).toContain('The local agent could not provide this project view.');
  });

  it.each([
    ['unavailable', 'Local agent unavailable', 'The local agent is unavailable.'],
    ['unauthorized', 'Project access unavailable', 'This device is not authorized to view this project.'],
  ] as const)('renders %s as an accessible status', async (kind, heading, message) => {
    readProject.mockResolvedValue({ kind, message });
    const fixture = TestBed.createComponent(ProjectDetail);

    await fixture.componentInstance.ngOnInit();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.componentInstance.visibilityState()).toBe(kind);
    expect(fixture.nativeElement.querySelector('[role="status"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain(heading);
    expect(fixture.nativeElement.textContent).toContain(message);
  });
});
