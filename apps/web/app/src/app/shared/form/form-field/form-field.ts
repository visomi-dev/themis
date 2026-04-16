import { Component, input } from '@angular/core';
import { MessageModule } from 'primeng/message';

@Component({
  host: {
    class: /* tw */ 'block',
  },
  imports: [MessageModule],
  selector: 'app-form-field',
  templateUrl: './form-field.html',
  styleUrl: './form-field.css',
})
export class FormField {
  readonly error = input('');
  readonly fieldId = input.required<string>();
  readonly help = input('');
  readonly label = input.required<string>();
}
