import { Component, computed, inject, signal, type OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { OperationalWorkspaceAdapter } from '../../shared/projects/operational-workspace-adapter';
import type { OperationalWorkItem } from '../../shared/projects/projects.models';

@Component({
  selector: 'app-work-item-detail',
  imports: [DatePipe, RouterLink],
  templateUrl: './work-item-detail.html',
  styleUrl: './work-item-detail.css',
  host: { class: /* tw */ 'block min-h-full w-full' },
})
export class WorkItemDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly adapter = inject(OperationalWorkspaceAdapter);
  protected readonly loading = signal(true);
  protected readonly item = signal<OperationalWorkItem | null>(null);
  protected readonly model = signal<Awaited<ReturnType<OperationalWorkspaceAdapter['read']>> | null>(null);
  protected readonly projectId = this.route.snapshot.paramMap.get('projectId') ?? '';
  protected readonly workItemId = this.route.snapshot.paramMap.get('workItemId') ?? '';
  protected readonly runs = computed(
    () => this.model()?.runs.items.filter((run) => run.workItemId === this.workItemId) ?? [],
  );
  protected readonly reviews = computed(
    () => this.model()?.reviews.items.filter((review) => review.workItemId === this.workItemId) ?? [],
  );
  protected readonly evidence = computed(
    () => this.model()?.evidence.items.filter((entry) => this.runs().some((run) => run.id === entry.runId)) ?? [],
  );

  async ngOnInit(): Promise<void> {
    try {
      this.model.set(await this.adapter.read(this.projectId));
      this.item.set(this.findItem(this.model()));
    } catch {
      this.model.set(null);
      this.item.set(null);
    }
    this.loading.set(false);
  }
  private findItem(model: Awaited<ReturnType<OperationalWorkspaceAdapter['read']>> | null) {
    return model?.workItems.items.find((item) => item.id === this.workItemId) ?? null;
  }
}
