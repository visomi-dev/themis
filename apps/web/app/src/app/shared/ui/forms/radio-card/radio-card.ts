import { booleanAttribute, Component, computed, forwardRef, input, output, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { Icon } from '../../media/icon/icon';
import { uiClass } from '../../classes';

@Component({
  host: {
    class: /* tw */ 'block',
    'data-control': '',
    '[attr.data-invalid]': 'invalid() ? "" : null',
  },
  imports: [Icon],
  providers: [
    {
      multi: true,
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RadioCard),
    },
  ],
  selector: 'app-radio-card',
  templateUrl: './radio-card.html',
  styleUrl: './radio-card.css',
})
export class RadioCard implements ControlValueAccessor {
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly inputId = input<string | null>(null);
  readonly invalid = input(false, { transform: booleanAttribute });
  readonly name = input('radio-card');
  readonly optionValue = input.required<string>();
  readonly required = input(false, { transform: booleanAttribute });
  readonly toggleable = input(true, { transform: booleanAttribute });
  readonly valueChange = output<string>();

  readonly formDisabled = signal(false);
  readonly value = signal('');
  readonly checked = computed(() => this.value() === this.optionValue());
  readonly classes = computed(() =>
    uiClass(
      'ui-focus-ring relative flex min-h-24 cursor-pointer flex-col rounded-[var(--radius-panel)] border bg-zinc-50 dark:bg-zinc-900 p-4 text-zinc-950 dark:text-zinc-50 transition',
      this.checked()
        ? 'border-blue-600 dark:border-blue-500 ring-2 ring-blue-500/20'
        : 'border-zinc-500/30 dark:border-zinc-400/30 hover:bg-zinc-100 dark:bg-zinc-800',
      (this.disabled() || this.formDisabled()) && 'pointer-events-none opacity-50',
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

  select(): void {
    if (this.disabled() || this.formDisabled()) {
      return;
    }

    const nextValue = this.checked() && this.toggleable() ? '' : this.optionValue();

    this.value.set(nextValue);
    this.onChange(nextValue);
    this.valueChange.emit(nextValue);
  }

  handleKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.select();
    }
  }

  markTouched(): void {
    this.onTouched();
  }
}
