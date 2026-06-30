import { booleanAttribute, Component, input, model, output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  host: {
    class: /* tw */ 'block',
    '[attr.data-submitted]': 'submitted() ? "" : null',
  },
  imports: [ReactiveFormsModule],
  selector: 'app-form',
  templateUrl: './form.html',
  styleUrl: './form.css',
})
export class Form {
  readonly submitted = model(false);
  readonly formGroup = input<FormGroup>(new FormGroup({}));
  readonly className = input('');
  readonly novalidate = input(true, { transform: booleanAttribute });
  readonly ngSubmit = output<void>();

  onSubmit(event: Event): void {
    event.preventDefault();
    this.submitted.set(true);
    this.ngSubmit.emit();
  }
}
