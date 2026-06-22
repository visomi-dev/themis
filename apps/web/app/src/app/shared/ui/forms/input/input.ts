import { booleanAttribute, Component, computed, forwardRef, input, output, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { uiClass } from '../../classes';

@Component({
  host: {
    class: /* tw */ 'block',
  },
  providers: [
    {
      multi: true,
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => Input),
    },
  ],
  selector: 'app-input',
  templateUrl: './input.html',
  styleUrl: './input.css',
})
export class Input implements ControlValueAccessor {
  readonly ariaDescribedBy = input<string | null>(null);
  readonly autocomplete = input<string | null>(null);
  readonly controlId = input<string | null>(null);
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly invalid = input(false, { transform: booleanAttribute });
  readonly name = input<string | null>(null);
  readonly placeholder = input('');
  readonly required = input(false, { transform: booleanAttribute });
  readonly type = input('text');
  readonly valueChange = output<string>();

  readonly value = signal('');
  readonly formDisabled = signal(false);

  readonly classes = computed(() =>
    uiClass(
      'ui-focus-ring w-full rounded-[var(--radius-control)] border bg-panel px-3 py-2.5 text-sm text-fg placeholder:text-muted-fg disabled:cursor-not-allowed disabled:opacity-50',
      this.invalid() ? 'border-danger' : 'border-outline/30',
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
    const nextValue = (event.target as HTMLInputElement).value;

    this.value.set(nextValue);
    this.onChange(nextValue);
    this.valueChange.emit(nextValue);
  }

  markTouched(): void {
    this.onTouched();
  }
}
