import { booleanAttribute, Component, computed, input, output } from '@angular/core';
import type { Field } from '@angular/forms/signals';

import { uiClass } from '../../classes';

export type RadioOption = {
  description?: string;
  label: string;
  value: string;
};

@Component({
  host: {
    class: /* tw */ 'block',
    'data-control': '',
  },
  imports: [],
  selector: 'app-radio-group',
  templateUrl: './radio-group.html',
  styleUrl: './radio-group.css',
})
export class RadioGroup {
  readonly formField = input.required<Field<string>>();
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly invalid = input(false, { transform: booleanAttribute });
  readonly legend = input('');
  readonly name = input(`radio-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`);
  readonly options = input<readonly RadioOption[]>([]);
  readonly required = input(false, { transform: booleanAttribute });
  readonly valueChange = output<string>();

  readonly value = computed(() => this.formField()().value() ?? '');

  readonly optionClasses = computed(() =>
    uiClass(
      'grid gap-2 rounded-[var(--radius-control)] border border-zinc-500/30 dark:border-zinc-400/30 bg-zinc-50 dark:bg-zinc-900 p-3 text-sm text-zinc-950 dark:text-zinc-50',
    ),
  );

  selectValue(optionValue: string): void {
    this.formField()().value.set(optionValue);
    this.valueChange.emit(optionValue);
  }

  onBlur(): void {
    this.formField()().markAsTouched();
  }
}
