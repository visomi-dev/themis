import { Component, computed, forwardRef, input, output, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { uiClass } from '../../classes';

export type ListboxOption = {
  disabled?: boolean;
  label: string;
  value: string;
};

@Component({
  host: { class: /* tw */ 'block' },
  providers: [{ multi: true, provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Listbox) }],
  selector: 'app-listbox',
  templateUrl: './listbox.html',
  styleUrl: './listbox.css',
})
export class Listbox implements ControlValueAccessor {
  readonly ariaLabel = input('Options');
  readonly options = input<readonly ListboxOption[]>([]);
  readonly valueChange = output<string>();

  readonly activeIndex = signal(0);
  readonly value = signal('');
  readonly formDisabled = signal(false);
  readonly activeId = computed(() => `listbox-option-${this.activeIndex()}`);

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

  optionClasses(index: number, option: ListboxOption): string {
    return uiClass(
      'cursor-default rounded-[var(--radius-control)] px-3 py-2 text-sm outline-none',
      this.value() === option.value && 'bg-accent text-accent-fg',
      this.value() !== option.value && index === this.activeIndex() && 'bg-zinc-100 dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50',
      this.value() !== option.value && index !== this.activeIndex() && 'text-zinc-950 dark:text-zinc-50',
      option.disabled && 'pointer-events-none opacity-50',
    );
  }

  choose(option: ListboxOption, index: number): void {
    if (option.disabled || this.formDisabled()) {
      return;
    }

    this.activeIndex.set(index);
    this.value.set(option.value);
    this.onChange(option.value);
    this.valueChange.emit(option.value);
  }

  chooseFromOptionKeydown(event: KeyboardEvent, option: ListboxOption, index: number): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.choose(option, index);
    }
  }

  handleKeydown(event: KeyboardEvent): void {
    const options = this.options();

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.activeIndex.set(Math.min(options.length - 1, this.activeIndex() + 1));
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.activeIndex.set(Math.max(0, this.activeIndex() - 1));
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const option = options[this.activeIndex()];

      if (option) {
        this.choose(option, this.activeIndex());
      }
    }
  }

  markTouched(): void {
    this.onTouched();
  }
}
