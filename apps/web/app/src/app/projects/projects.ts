import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';

import { Auth } from '../shared/auth/auth';
import { APP_URL, PROJECT_NEW_URL, SIGN_IN_URL } from '../shared/constants/routes';
import { ThemeSwitcher } from '../shared/layout/theme-switcher/theme-switcher';
import { ProjectsService } from '../shared/projects/projects.service';
import type { Project } from '../shared/projects/projects.models';

@Component({
  host: {
    class: /* tw */ 'block min-h-full w-full',
  },
  imports: [ButtonModule, MessageModule, RouterLink, ThemeSwitcher],
  selector: 'app-projects',
  templateUrl: './projects.html',
  styleUrl: './projects.css',
})
export class Projects implements OnInit {
  private readonly auth = inject(Auth);
  private readonly projectsService = inject(ProjectsService);
  private readonly router = inject(Router);

  readonly errorMessage = signal('');
  readonly loading = signal(true);
  readonly projects = signal<Project[]>([]);
  readonly user = this.auth.user;

  readonly activationUrl = APP_URL;
  readonly projectNewUrl = PROJECT_NEW_URL;

  async ngOnInit() {
    await this.loadProjects();
  }

  async deleteProject(projectId: string, event: Event) {
    event.preventDefault();
    event.stopPropagation();

    if (!confirm('Delete this project? This action cannot be undone.')) {
      return;
    }

    try {
      await this.projectsService.deleteProject(projectId);
      await this.loadProjects();
    } catch {
      this.errorMessage.set('The project could not be deleted.');
    }
  }

  async signOut() {
    await this.auth.signOut();
    await this.router.navigate([SIGN_IN_URL]);
  }

  formatDate(isoString: string) {
    return new Date(isoString).toLocaleDateString();
  }

  statusLabel(status: Project['status']) {
    const labels: Record<Project['status'], string> = {
      active: 'Active',
      archived: 'Archived',
      draft: 'Draft',
    };

    return labels[status] ?? status;
  }

  private async loadProjects() {
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const response = await this.projectsService.listProjects();
      this.projects.set(response.projects);
    } catch {
      this.errorMessage.set('Projects could not be loaded.');
    } finally {
      this.loading.set(false);
    }
  }
}
