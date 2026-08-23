import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PROJECTS_URL } from '../shared/constants/routes';
import { ProjectsApi } from '../shared/projects/projects';
import type { Project } from '../shared/projects/projects.models';
import { Alert } from '../shared/ui/overlays/alert/alert';
import { Badge } from '../shared/ui/data/badge/badge';
import { Card } from '../shared/ui/layout/card/card';
import { Container } from '../shared/ui/layout/container/container';
import { Heading } from '../shared/ui/typography/heading/heading';
import { Loader } from '../shared/ui/feedback/loader/loader';

@Component({
  host: {
    class: /* tw */ 'block min-h-full w-full',
  },
  imports: [Alert, Badge, Card, Container, Heading, Loader, RouterLink],
  selector: 'app-projects',
  templateUrl: './projects.html',
  styleUrl: './projects.css',
})
export class Projects implements OnInit {
  private readonly projectsApi = inject(ProjectsApi);

  readonly errorMessage = signal('');
  readonly loading = signal(true);
  readonly projects = signal<Project[]>([]);
  readonly projectsUrl = PROJECTS_URL;

  async ngOnInit() {
    await this.loadProjects();
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

  statusTone(status: Project['status']): 'default' | 'accent' | 'danger' | 'success' | 'warning' {
    switch (status) {
      case 'active':
        return 'success';
      case 'archived':
        return 'warning';
      case 'draft':
        return 'default';
    }
  }

  private async loadProjects() {
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      const projects = await this.projectsApi.listProjects();

      this.projects.set(projects);
    } catch {
      this.errorMessage.set('Projects could not be loaded.');
    } finally {
      this.loading.set(false);
    }
  }
}
