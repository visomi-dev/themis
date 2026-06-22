import { Component, input } from '@angular/core';

@Component({
  host: {
    class: /* tw */ 'block',
  },
  selector: 'app-error-message',
  templateUrl: './error-message.html',
  styleUrl: './error-message.css',
})
export class ErrorMessage {
  readonly controlId = input<string | null>(null);
}
