import { booleanAttribute, Component, computed, forwardRef, input, output, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { uiClass } from '../../classes';

export type RadioOption = {
  description?: string;
  label: string;
  value: string;
};

@Component({
  host: { class: /* tw */ 'block' },
  providers: [{ multi: true, provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => RadioGroup) }],
  selector: 'app-radio-group',
  templateUrl: './radio-group.html',
  styleUrl: './radio-group.css',
})
export class RadioGroup implements ControlValueAccessor {
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly legend = input('');
  readonly name = input(`radio-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`);
  readonly options = input<readonly RadioOption[]>([]);
  readonly valueChange = output<string>();

  readonly value = signal('');
  readonly formDisabled = signal(false);
  readonly optionClasses = computed(() =>
    uiClass('grid gap-2 rounded-[var(--radius-control)] border border-zinc-500/30 dark:border-zinc-400/30 bg-zinc-50 dark:bg-zinc-900 p-3 text-sm text-zinc-950 dark:text-zinc-50'),
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

  selectValue(value: string): void {
    this.value.set(value);
    this.onChange(value);
    this.valueChange.emit(value);
  }

  markTouched(): void {
    this.onTouched();
  }
}
