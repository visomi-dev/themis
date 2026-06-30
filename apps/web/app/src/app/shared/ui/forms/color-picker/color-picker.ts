import { booleanAttribute, Component, computed, forwardRef, input, output, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { uiClass } from '../../classes';

export type ColorPickerOption = {
  class: string;
  label: string;
  selectedClass?: string;
  value: string;
};

const defaultOptions: readonly ColorPickerOption[] = Object.freeze([
  { class: /* tw */ 'bg-blue-500', label: 'Blue', selectedClass: /* tw */ 'ring-blue-500', value: 'BLUE' },
  { class: /* tw */ 'bg-pink-500', label: 'Pink', selectedClass: /* tw */ 'ring-pink-500', value: 'PINK' },
  { class: /* tw */ 'bg-purple-500', label: 'Purple', selectedClass: /* tw */ 'ring-purple-500', value: 'PURPLE' },
  { class: /* tw */ 'bg-green-500', label: 'Green', selectedClass: /* tw */ 'ring-green-500', value: 'GREEN' },
  { class: /* tw */ 'bg-yellow-500', label: 'Yellow', selectedClass: /* tw */ 'ring-yellow-500', value: 'YELLOW' },
]);

@Component({
  host: {
    class: /* tw */ 'block',
    'data-control': '',
  },
  imports: [],
  providers: [
    {
      multi: true,
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ColorPicker),
    },
  ],
  selector: 'app-color-picker',
  templateUrl: './color-picker.html',
  styleUrl: './color-picker.css',
})
export class ColorPicker implements ControlValueAccessor {
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly label = input('');
  readonly name = input('color');
  readonly options = input<readonly ColorPickerOption[]>(defaultOptions);
  readonly required = input(false, { transform: booleanAttribute });
  readonly valueChange = output<string>();

  readonly formDisabled = signal(false);
  readonly value = signal('');
  readonly groupClasses = computed(() =>
    uiClass('flex items-center gap-2', (this.disabled() || this.formDisabled()) && 'opacity-50'),
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

  optionClasses(option: ColorPickerOption): string {
    return uiClass(
      'size-6 rounded-full border-2 border-black/10 transition',
      option.class,
      this.value() === option.value && 'ring-2 ring-offset-2 ring-offset-bg',
      this.value() === option.value && option.selectedClass,
    );
  }

  choose(value: string): void {
    if (this.disabled() || this.formDisabled()) {
      return;
    }

    this.value.set(value);
    this.onChange(value);
    this.valueChange.emit(value);
  }

  markTouched(): void {
    this.onTouched();
  }
}
