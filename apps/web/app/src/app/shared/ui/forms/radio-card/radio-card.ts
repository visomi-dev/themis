import { booleanAttribute, Component, computed, input, output } from '@angular/core';
import type { Field } from '@angular/forms/signals';

import { Icon } from '../../media/icon/icon';
import { uiClass } from '../../classes';

@Component({
  host: {
    class: /* tw */ 'block',
    'data-control': '',
    '[attr.data-invalid]': 'invalid() ? "" : null',
  },
  imports: [Icon],
  selector: 'app-radio-card',
  templateUrl: './radio-card.html',
  styleUrl: './radio-card.css',
})
export class RadioCard {
  readonly formField = input.required<Field<string>>();
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly inputId = input<string | null>(null);
  readonly invalid = input(false, { transform: booleanAttribute });
  readonly name = input('radio-card');
  readonly optionValue = input.required<string>();
  readonly required = input(false, { transform: booleanAttribute });
  readonly toggleable = input(true, { transform: booleanAttribute });
  readonly valueChange = output<string>();

  readonly value = computed(() => this.formField()().value() ?? '');
  readonly checked = computed(() => this.value() === this.optionValue());

  readonly classes = computed(() =>
    uiClass(
      'ui-focus-ring relative flex min-h-24 cursor-pointer flex-col rounded-[var(--radius-panel)] border bg-zinc-50 dark:bg-zinc-900 p-4 text-zinc-950 dark:text-zinc-50 transition',
      this.checked()
        ? 'border-blue-600 dark:border-blue-500 ring-2 ring-blue-500/20'
        : 'border-zinc-500/30 dark:border-zinc-400/30 hover:bg-zinc-100 dark:bg-zinc-800',
      this.disabled() && 'pointer-events-none opacity-50',
    ),
  );
  readonly markerClasses = computed(() =>
    uiClass(
      'absolute right-3 top-3 flex size-6 items-center justify-center rounded-full border-2 transition',
      this.checked()
        ? 'border-blue-600 dark:border-blue-500 text-accent'
        : 'border-zinc-500/30 dark:border-zinc-400/30 text-transparent',
    ),
  );

  select(): void {
    if (this.disabled()) {
      return;
    }

    const nextValue = this.checked() && this.toggleable() ? '' : this.optionValue();

    this.formField()().value.set(nextValue);
    this.valueChange.emit(nextValue);
  }

  handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.select();
    }
  }

  onBlur(): void {
    this.formField()().markAsTouched();
  }
}
