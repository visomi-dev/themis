import { booleanAttribute, Component, input } from '@angular/core';

@Component({
  host: {
    class: /* tw */ 'block overflow-hidden rounded-[var(--radius-panel)] border border-outline-variant/50 bg-panel',
  },
  selector: 'app-table',
  templateUrl: './table.html',
  styleUrl: './table.css',
})
export class Table {
  readonly dense = input(false, { transform: booleanAttribute });
}
