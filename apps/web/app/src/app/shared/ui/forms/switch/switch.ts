import { booleanAttribute, Component, computed, forwardRef, input, output, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { uiClass } from '../../classes';

@Component({
  host: { class: /* tw */ 'inline-flex' },
  providers: [{ multi: true, provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Switch) }],
  selector: 'app-switch',
  templateUrl: './switch.html',
  styleUrl: './switch.css',
})
export class Switch implements ControlValueAccessor {
  readonly ariaDescribedBy = input<string | null>(null);
  readonly ariaLabel = input<string | null>(null);
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly id = input<string | null>(null);
  readonly checkedChange = output<boolean>();

  readonly checked = signal(false);
  readonly formDisabled = signal(false);
  readonly classes = computed(() =>
    uiClass(
      'ui-focus-ring relative inline-flex h-7 w-12 items-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-50',
      this.checked() ? 'bg-accent' : 'bg-outline-variant',
    ),
  );
  readonly thumbClasses = computed(() =>
    uiClass('size-5 rounded-full bg-white shadow transition', this.checked() ? 'translate-x-6' : 'translate-x-1'),
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

  toggle(): void {
    if (this.disabled() || this.formDisabled()) {
      return;
    }

    const nextValue = !this.checked();

    this.checked.set(nextValue);
    this.onChange(nextValue);
    this.checkedChange.emit(nextValue);
  }

  markTouched(): void {
    this.onTouched();
  }
}
