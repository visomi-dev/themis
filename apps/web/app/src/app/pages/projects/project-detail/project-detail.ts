import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';

import { Auth } from '../../../shared/auth/auth';
import { PROJECTS_URL, SIGN_IN_URL } from '../../../shared/constants/routes';
import { ThemeSwitcher } from '../../../shared/layout/theme-switcher/theme-switcher';
import { ProjectsService } from '../../../shared/projects/projects.service';
import type { Project, ProjectWithDocuments } from '../../../shared/projects/projects.models';

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
  private readonly projectsService = inject(ProjectsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly errorMessage = signal('');
  readonly loading = signal(true);
  readonly project = signal<ProjectWithDocuments | null>(null);
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

  async signOut() {
    await this.auth.signOut();
    await this.router.navigate([SIGN_IN_URL]);
  }

  formatDate(isoString: string) {
    return new Date(isoString).toLocaleDateString();
  }

  documentTypeLabel(type: Project['sourceType']) {
    const labels: Record<string, string> = {
      architecture: 'Architecture',
      brief: 'Brief',
      imported_reference: 'Imported reference',
      manual: 'Manual',
      operational_notes: 'Operational notes',
      overview: 'Overview',
      seeded: 'Seeded',
      setup: 'Setup',
    };

    return labels[type] ?? type;
  }

  statusLabel(status: Project['status']) {
    const labels: Record<Project['status'], string> = {
      active: 'Active',
      archived: 'Archived',
      draft: 'Draft',
    };

    return labels[status] ?? status;
  }

  private async loadProject(projectId: string) {
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const project = await this.projectsService.getProject(projectId);
      this.project.set(project);
    } catch {
      this.errorMessage.set('The project could not be loaded.');
    } finally {
      this.loading.set(false);
    }
  }
}