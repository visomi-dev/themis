import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal, type OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { OperationalWorkspaceAdapter } from '../../shared/projects/operational-workspace-adapter';

@Component({
  selector: 'app-validation',
  imports: [DatePipe, RouterLink],
  templateUrl: './validation.html',
  styleUrl: './validation.css',
  host: { class: /* tw */ 'block min-h-full w-full' },
})
export class Validation implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly adapter = inject(OperationalWorkspaceAdapter);
  protected readonly projectId = this.route.snapshot.paramMap.get('projectId') ?? '';
  protected readonly loading = signal(true);
  protected readonly model = signal<Awaited<ReturnType<OperationalWorkspaceAdapter['read']>> | null>(null);
  protected readonly evidence = computed(() => this.model()?.evidence.items ?? []);
  protected readonly reviews = computed(() => this.model()?.reviews.items ?? []);

  async ngOnInit(): Promise<void> {
    try {
      this.model.set(await this.adapter.read(this.projectId));
    } finally {
      this.loading.set(false);
    }
  }
}
