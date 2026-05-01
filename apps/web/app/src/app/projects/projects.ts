import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';

import { PROJECT_NEW_URL } from '../shared/constants/routes';
import { ProjectsService } from '../shared/projects/projects';
import type { Project } from '../shared/projects/projects.models';

@Component({
  host: {
    class: /* tw */ 'block min-h-full w-full',
  },
  imports: [ButtonModule, MessageModule, RouterLink],
  selector: 'app-projects',
  templateUrl: './projects.html',
  styleUrl: './projects.css',
})
export class Projects implements OnInit {
  private readonly projectsService = inject(ProjectsService);

  readonly errorMessage = signal('');
  readonly loading = signal(true);
  readonly projects = signal<Project[]>([]);
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
      const projects = await this.projectsService.listProjects();

      this.projects.set(projects);
    } catch {
      this.errorMessage.set('Projects could not be loaded.');
    } finally {
      this.loading.set(false);
    }
  }
}
