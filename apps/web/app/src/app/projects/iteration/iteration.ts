import { Component, inject, signal, type OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { OperationalWorkspaceAdapter } from '../../shared/projects/operational-workspace-adapter';
@Component({
  selector: 'app-iteration',
  imports: [RouterLink],
  templateUrl: './iteration.html',
  styleUrl: './iteration.css',
  host: { class: /* tw */ 'block min-h-full w-full' },
})
export class Iteration implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly adapter = inject(OperationalWorkspaceAdapter);
  protected readonly projectId = this.route.snapshot.paramMap.get('projectId') ?? '';
  protected readonly iterationId = this.route.snapshot.paramMap.get('iterationId') ?? '';
  protected readonly loading = signal(true);
  protected readonly model = signal<Awaited<ReturnType<OperationalWorkspaceAdapter['read']>> | null>(null);
  async ngOnInit(): Promise<void> {
    try {
      this.model.set(await this.adapter.read(this.projectId));
    } finally {
      this.loading.set(false);
    }
  }
}
