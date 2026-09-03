import { Component, inject, signal, type OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { OperationalWorkspaceAdapter } from '../../shared/projects/operational-workspace-adapter';

@Component({
  selector: 'app-timeline',
  imports: [DatePipe, RouterLink],
  templateUrl: './timeline.html',
  styleUrl: './timeline.css',
  host: { class: /* tw */ 'block min-h-full w-full' },
})
export class Timeline implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly adapter = inject(OperationalWorkspaceAdapter);
  protected readonly loading = signal(true);
  protected readonly model = signal<Awaited<ReturnType<OperationalWorkspaceAdapter['read']>> | null>(null);
  protected readonly projectId = this.route.snapshot.paramMap.get('projectId') ?? '';
  async ngOnInit(): Promise<void> {
    this.model.set(await this.adapter.read(this.projectId));
    this.loading.set(false);
  }
}
