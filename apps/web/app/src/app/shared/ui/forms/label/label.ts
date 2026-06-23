import { Component, input } from '@angular/core';

@Component({
  host: {
    class: /* tw */ 'block',
  },
  selector: 'app-label',
  templateUrl: './label.html',
  styleUrl: './label.css',
})
export class Label {
  readonly for = input<string | null>(null);
}
