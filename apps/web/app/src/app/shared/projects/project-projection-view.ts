import { Component, inject, input } from '@angular/core';

import { ProjectProjection, type ProjectionMode, type ProjectionScope } from './project-projection';

@Component({
  selector: 'app-project-projection',
  imports: [],
  templateUrl: './project-projection.html',
  styleUrl: './project-projection.css',
})
export class ProjectProjectionView {
  readonly projectId = input.required<string>();
  readonly scope = input.required<ProjectionScope>();
  protected readonly projection = inject(ProjectProjection);

  changeMode(event: Event): void {
    const mode = (event.target as HTMLSelectElement).value as ProjectionMode;

    this.projection.selectMode(mode, this.projectId(), this.scope());
  }

  unlock(): void {
    this.projection.unlockWebOnly(this.projectId(), this.scope());
  }
}
