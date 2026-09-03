import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal, type OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { OperationalWorkspaceAdapter } from '../../shared/projects/operational-workspace-adapter';
import type { OperationalVisibility, OperationalWorkspaceReadModel } from '../../shared/projects/projects.models';
import { ProjectProjectionView } from '../../shared/projects/project-projection-view';
import type { ProjectionScope } from '../../shared/projects/project-projection';

type OutcomeGroup = {
  id: string;
  title: string;
  summary: string | null;
  items: OperationalWorkspaceReadModel['workItems']['items'];
};

@Component({
  selector: 'app-project-detail',
  imports: [DatePipe, RouterLink, ProjectProjectionView],
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
  protected readonly projectionScope = signal<ProjectionScope>({ tenantId: '', workspaceId: '' });
  protected readonly outcomeGroups = computed<OutcomeGroup[]>(() => {
    const model = this.workspace();
    const groups = new Map<string, OutcomeGroup>();

    for (const epic of model?.epics.items ?? []) {
      groups.set(epic.id, { id: epic.id, title: epic.title, summary: epic.summary, items: [] });
    }

    for (const item of this.workItems()) {
      const groupId = item.epicId ?? 'unassigned';
      const group = groups.get(groupId) ?? {
        id: groupId,
        title: 'Unassigned outcome',
        summary: 'No outcome is recorded for this work item.',
        items: [],
      };

      group.items.push(item);
      groups.set(groupId, group);
    }

    return [...groups.values()].filter((group) => group.items.length > 0);
  });
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

    this.projectionScope.set({
      tenantId: this.route.snapshot.queryParamMap.get('tenantId') ?? '',
      workspaceId: this.route.snapshot.queryParamMap.get('workspaceId') ?? projectId ?? '',
    });

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

  protected attentionReason(status: string, hasEvidence: boolean): string {
    if (status === 'blocked') return 'Blocked; inspect the recorded dependency or decision.';
    if (status === 'review') return 'Review pending; independent review remains the next checkpoint.';
    if (!hasEvidence) return 'Evidence is not recorded for this item.';

    return 'No additional attention is derived from the protected read model.';
  }

  protected executionLabel(workItemId: string): string {
    const runs = this.workspace()?.runs.items.filter((run) => run.workItemId === workItemId) ?? [];
    const current = runs[runs.length - 1];

    return current
      ? current.status === 'running'
        ? 'Execution in progress'
        : `Execution ${current.status}`
      : 'No execution recorded';
  }

  protected evidenceCount(workItemId: string): number {
    const runIds = new Set(
      this.workspace()
        ?.runs.items.filter((run) => run.workItemId === workItemId)
        .map((run) => run.id),
    );

    return this.workspace()?.evidence.items.filter((entry) => runIds.has(entry.runId)).length ?? 0;
  }

  protected reviewLabel(workItemId: string): string {
    const reviews = this.workspace()?.reviews.items.filter((entry) => entry.workItemId === workItemId) ?? [];
    const review = reviews[reviews.length - 1];

    return review ? `Review ${review.verdict}` : 'No review recorded';
  }

  protected lastActivity(): string {
    const activities = this.workspace()?.activity.items ?? [];
    const activity = activities[activities.length - 1];

    return activity?.projectId === this.project()?.id ? activity.summary : 'No activity recorded';
  }
}
