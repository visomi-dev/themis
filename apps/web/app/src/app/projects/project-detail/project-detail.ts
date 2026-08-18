import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ProjectSeed } from '../../shared/jobs/project-seed';
import { PROJECTS_URL } from '../../shared/constants/routes';
import type { ProjectDocumentType, ProjectStatus, ProjectWithDocuments } from '../../shared/projects/projects.models';
import { LocalAgentVisibility, type LocalAgentProjectView } from '../../shared/projects/local-agent-visibility';
import { Alert } from '../../shared/ui/overlays/alert/alert';
import { Badge } from '../../shared/ui/data/badge/badge';
import { Button } from '../../shared/ui/actions/button/button';
import { Card } from '../../shared/ui/layout/card/card';
import { Container } from '../../shared/ui/layout/container/container';
import { Heading } from '../../shared/ui/typography/heading/heading';
import { Link } from '../../shared/ui/typography/link/link';
import { Loader } from '../../shared/ui/feedback/loader/loader';
@Component({
  host: {
    class: /* tw */ 'block min-h-full w-full',
  },
  imports: [Alert, Badge, Button, Card, Container, Heading, Link, Loader, RouterLink],
  selector: 'app-project-detail',
  templateUrl: './project-detail.html',
  styleUrl: './project-detail.css',
})
export class ProjectDetail implements OnInit {
  private readonly projectSeed = inject(ProjectSeed);
  private readonly localAgentVisibility = inject(LocalAgentVisibility);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly errorMessage = signal('');
  readonly loading = signal(true);
  readonly project = signal<ProjectWithDocuments | null>(null);
  readonly visibility = signal<LocalAgentProjectView | null>(null);
  readonly visibilityState = signal<
    'loading' | 'locked' | 'unavailable' | 'stale' | 'error' | 'unauthorized' | 'empty' | 'authorized'
  >('loading');
  readonly seeding = signal(false);
  readonly projectsUrl = PROJECTS_URL;

  async ngOnInit() {
    const projectId = this.route.snapshot.paramMap.get('projectId');

    if (!projectId) {
      await this.router.navigate([PROJECTS_URL]);

      return;
    }

    await this.loadProject(projectId);
  }

  currentSeedJob() {
    const project = this.project();

    return project ? (this.projectSeed.currentJob(project.id) ?? project.jobs[0] ?? null) : null;
  }

  documentTypeLabel(type: ProjectDocumentType) {
    const labels: Record<ProjectDocumentType, string> = {
      architecture: 'Architecture',
      brief: 'Brief',
      imported_reference: 'Imported reference',
      operational_notes: 'Operational notes',
      overview: 'Overview',
      setup: 'Setup',
    };

    return labels[type];
  }

  formatDate(isoString: string) {
    return new Date(isoString).toLocaleDateString();
  }

  async runSeed() {
    const project = this.project();

    if (!project) {
      return;
    }

    this.seeding.set(true);
    this.errorMessage.set('');

    try {
      await this.projectSeed.start(project.id);
    } catch {
      this.errorMessage.set('The project seed job could not be started.');
    } finally {
      this.seeding.set(false);
    }
  }

  visibilityStatusLabel() {
    const labels = { authorized: 'Available', empty: 'No approved content', stale: 'Stale', locked: 'Locked' } as const;

    return labels[this.visibilityState() as keyof typeof labels] ?? 'Unavailable';
  }

  statusLabel(status: ProjectStatus) {
    const labels: Record<ProjectStatus, string> = {
      active: 'Active',
      archived: 'Archived',
      draft: 'Draft',
    };

    return labels[status];
  }

  statusTone(status: ProjectStatus): 'default' | 'accent' | 'danger' | 'success' | 'warning' {
    switch (status) {
      case 'active':
        return 'success';
      case 'archived':
        return 'warning';
      case 'draft':
        return 'default';
    }
  }

  private async loadProject(projectId: string) {
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const result = await this.localAgentVisibility.readProject(projectId);

      if (result.kind !== 'success') {
        this.visibilityState.set(result.kind);
        this.errorMessage.set(result.message);

        return;
      }

      const view = result.view;

      this.visibility.set(view);
      this.visibilityState.set(
        view.state === 'authorized' && !view.context && view.activity.length === 0 ? 'empty' : view.state,
      );
      if (view.state === 'locked') {
        return;
      }
      this.project.set({
        accountId: '',
        createdAt: view.project.updatedAt,
        createdByUserId: '',
        documents: [],
        id: view.project.id,
        jobs: [],
        name: view.project.name,
        slug: view.project.id,
        sourceType: view.project.sourceType,
        status: view.project.status,
        summary: view.context,
        updatedAt: view.project.updatedAt,
      });
    } catch {
      this.visibilityState.set('error');
      this.errorMessage.set('The project could not be loaded.');
    } finally {
      this.loading.set(false);
    }
  }
}
