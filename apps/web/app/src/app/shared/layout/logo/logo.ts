import { Component, input } from '@angular/core';

@Component({
  host: {
    class: /* tw */ 'contents',
  },
  selector: 'app-logo',
  templateUrl: './logo.html',
  styleUrl: './logo.css',
})
export class Logo {
  readonly variant = input<'isotype' | 'wordmark'>('isotype');
}
