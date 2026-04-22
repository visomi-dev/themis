import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';

import { Auth } from '../../../shared/auth/auth';
import { ProjectSeed } from '../../../shared/jobs/project-seed';
import { ProjectsService } from '../../../shared/projects/projects.service';

import { ProjectDetail } from './project-detail';

describe('ProjectDetail', () => {
  const getProject = vi.fn();
  const seedStart = vi.fn();
  const signOut = vi.fn();
  const navigate = vi.fn();

  beforeEach(async () => {
    getProject.mockReset();
    seedStart.mockReset();
    signOut.mockReset();
    navigate.mockReset();
    getProject.mockResolvedValue({
      accountId: 'account-1',
      createdAt: '2026-01-01T00:00:00.000Z',
      createdByUserId: 'user-1',
      documents: [],
      id: 'project-1',
      jobs: [],
      name: 'Themis Core',
      slug: 'themis-core',
      sourceType: 'manual',
      status: 'active',
      summary: 'Core workspace',
      updatedAt: '2026-01-01T00:00:00.000Z',
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
        {
          provide: ProjectsService,
          useValue: {
            getProject,
          },
        },
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

    expect(getProject).toHaveBeenCalledWith('project-1');
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
});
