import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal, type OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { OperationalWorkspaceAdapter } from '../../shared/projects/operational-workspace-adapter';
import type { OperationalVisibility, OperationalWorkspaceReadModel } from '../../shared/projects/projects.models';

@Component({
  selector: 'app-project-detail',
  imports: [DatePipe, RouterLink],
  templateUrl: './project-detail.html',
  styleUrl: './project-detail.css',
  host: { class: /* tw */ 'block min-h-full w-full' },
})
export class ProjectDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly adapter = inject(OperationalWorkspaceAdapter);

  protected readonly loading = signal(true);
  protected readonly workspace = signal<OperationalWorkspaceReadModel | null>(null);
  protected readonly error = signal(false);
  protected readonly project = computed(() => this.workspace()?.project.items[0]);
  protected readonly workItems = computed(() => this.workspace()?.workItems.items ?? []);
  protected readonly attention = computed(() =>
    this.workItems().filter((item) => ['blocked', 'review'].includes(item.status)),
  );
  protected readonly statusMeaning: Record<string, string> = {
    blocked: 'Work is blocked: inspect the named dependency or decision.',
    in_progress: 'Work is in progress. Run status is not work-item acceptance.',
    review: 'Independent review is pending.',
    done: 'Work is complete for its recorded scope.',
    ready: 'Work is ready for an execution decision.',
    draft: 'Work is still being defined.',
  };

  async ngOnInit(): Promise<void> {
    const projectId = this.route.snapshot.paramMap.get('projectId');

    if (!projectId) {
      this.error.set(true);
      this.loading.set(false);

      return;
    }
    try {
      this.workspace.set(await this.adapter.read(projectId));
    } catch {
      this.error.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  protected collectionLabel(state: OperationalVisibility): string {
    const labels: Record<OperationalVisibility, string> = {
      visible: 'Available',
      empty: 'No records yet',
      locked: 'Locked',
      unavailable: 'Unavailable',
      stale: 'Stale',
      error: 'Read error',
      unauthorized: 'Unauthorized',
      malformed: 'Unavailable',
    };

    return labels[state];
  }

  protected meaning(status: string): string {
    return this.statusMeaning[status] ?? 'Recorded state; inspect the source record for context.';
  }
}
