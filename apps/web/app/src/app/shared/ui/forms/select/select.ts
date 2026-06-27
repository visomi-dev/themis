import { booleanAttribute, Component, computed, forwardRef, input, output, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { uiClass } from '../../classes';

@Component({
  host: { class: /* tw */ 'block' },
  providers: [{ multi: true, provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Select) }],
  selector: 'app-select',
  templateUrl: './select.html',
  styleUrl: './select.css',
})
export class Select implements ControlValueAccessor {
  readonly ariaDescribedBy = input<string | null>(null);
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly id = input<string | null>(null);
  readonly invalid = input(false, { transform: booleanAttribute });
  readonly name = input<string | null>(null);
  readonly valueChange = output<string>();

  readonly value = signal('');
  readonly formDisabled = signal(false);
  readonly classes = computed(() =>
    uiClass(
      'ui-focus-ring w-full rounded-[var(--radius-control)] border bg-zinc-50 dark:bg-zinc-900 px-3 py-2.5 text-sm text-zinc-950 dark:text-zinc-50 disabled:cursor-not-allowed disabled:opacity-50',
      this.invalid() ? 'border-red-600 dark:border-red-500' : 'border-zinc-500/30 dark:border-zinc-400/30',
    ),
  );

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.formDisabled.set(disabled);
  }

  updateValue(event: Event): void {
    const nextValue = (event.target as HTMLSelectElement).value;

    this.value.set(nextValue);
    this.onChange(nextValue);
    this.valueChange.emit(nextValue);
  }

  markTouched(): void {
    this.onTouched();
  }
}
