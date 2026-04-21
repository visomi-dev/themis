import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';

import { Auth } from '../../../shared/auth/auth';
import { ProjectSeed } from '../../../shared/jobs/project-seed';
import { PROJECTS_URL, SIGN_IN_URL } from '../../../shared/constants/routes';
import { ThemeSwitcher } from '../../../shared/layout/theme-switcher/theme-switcher';
import { ProjectsService } from '../../../shared/projects/projects.service';
import type {
  ProjectDocumentType,
  ProjectStatus,
  ProjectWithDocuments,
} from '../../../shared/projects/projects.models';

@Component({
  host: {
    class: /* tw */ 'block min-h-full w-full',
  },
  imports: [ButtonModule, MessageModule, RouterLink, ThemeSwitcher],
  selector: 'app-project-detail',
  templateUrl: './project-detail.html',
  styleUrl: './project-detail.css',
})
export class ProjectDetail {
  private readonly auth = inject(Auth);
  private readonly projectSeed = inject(ProjectSeed);
  private readonly projectsService = inject(ProjectsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly errorMessage = signal('');
  readonly loading = signal(true);
  readonly project = signal<ProjectWithDocuments | null>(null);
  readonly seeding = signal(false);
  readonly user = this.auth.user;
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

  async signOut() {
    await this.auth.signOut();
    await this.router.navigate([SIGN_IN_URL]);
  }

  statusLabel(status: ProjectStatus) {
    const labels: Record<ProjectStatus, string> = {
      active: 'Active',
      archived: 'Archived',
      draft: 'Draft',
    };

    return labels[status];
  }

  private async loadProject(projectId: string) {
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      this.project.set(await this.projectsService.getProject(projectId));
    } catch {
      this.errorMessage.set('The project could not be loaded.');
    } finally {
      this.loading.set(false);
    }
  }
}
