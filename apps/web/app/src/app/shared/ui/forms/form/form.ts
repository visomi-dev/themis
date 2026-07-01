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

  // The submit event is handled exclusively by the inner `<form>`'s
  // `(ngSubmit)` binding (which runs FormGroupDirective's hook). A previous
  // version also added a `@HostListener('submit')` here, but that fired a
  // second `ngSubmit.emit()` after the form's own — making every consumer
  // `submit()` run twice and defeating the re-entrant guard. Standard
  // Angular Forms single-binding: form's (ngSubmit) is enough.
  onSubmit(event: Event): void {
    event.preventDefault();
    this.submitted.set(true);
    this.ngSubmit.emit();
  }
}
