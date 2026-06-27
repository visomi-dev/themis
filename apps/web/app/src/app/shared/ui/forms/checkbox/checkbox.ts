import { booleanAttribute, Component, computed, forwardRef, input, output, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { uiClass } from '../../classes';

@Component({
  host: { class: /* tw */ 'inline-flex' },
  providers: [{ multi: true, provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Checkbox) }],
  selector: 'app-checkbox',
  templateUrl: './checkbox.html',
  styleUrl: './checkbox.css',
})
export class Checkbox implements ControlValueAccessor {
  readonly ariaDescribedBy = input<string | null>(null);
  readonly controlId = input<string | null>(null);
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly invalid = input(false, { transform: booleanAttribute });
  readonly name = input<string | null>(null);
  readonly checkedChange = output<boolean>();

  readonly checked = signal(false);
  readonly formDisabled = signal(false);
  readonly classes = computed(() =>
    uiClass(
      'ui-focus-ring ui-touch-target min-h-5 min-w-5 appearance-none rounded border border-zinc-950/10 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900 text-blue-600 accent-blue-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-blue-400 dark:accent-blue-500',
      this.invalid() ? 'border-red-600 dark:border-red-500' : 'border-zinc-500/40 dark:border-zinc-400/40',
    ),
  );

  private onChange: (value: boolean) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: boolean | null): void {
    this.checked.set(value === true);
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.formDisabled.set(disabled);
  }

  updateChecked(event: Event): void {
    const nextValue = (event.target as HTMLInputElement).checked;

    this.checked.set(nextValue);
    this.onChange(nextValue);
    this.checkedChange.emit(nextValue);
  }

  markTouched(): void {
    this.onTouched();
  }
}
