import { booleanAttribute, Component, computed, forwardRef, input, output, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { Icon } from '../../media/icon/icon';
import { uiClass } from '../../classes';

type PasswordVariant = 'icon' | 'text';

@Component({
  host: {
    class: /* tw */ 'block',
  },
  imports: [Icon],
  providers: [
    {
      multi: true,
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PasswordInput),
    },
  ],
  selector: 'app-password-input',
  templateUrl: './password-input.html',
  styleUrl: './password-input.css',
})
export class PasswordInput implements ControlValueAccessor {
  readonly ariaDescribedBy = input<string | null>(null);
  readonly autocomplete = input<string | null>(null);
  readonly controlId = input<string | null>(null);
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly invalid = input(false, { transform: booleanAttribute });
  readonly loading = input(false, { transform: booleanAttribute });
  readonly name = input<string | null>(null);
  readonly pattern = input("^(?=.*[A-Za-z])(?=.*[0-9])(?=.*[._\\-'@$!%*#?&])[A-Za-z0-9._\\-'@$!%*#?&]{8,}$");
  readonly placeholder = input('');
  readonly variant = input<PasswordVariant>('text');
  readonly valueChange = output<string>();

  readonly formDisabled = signal(false);
  readonly type = signal<'password' | 'text'>('password');
  readonly value = signal('');

  readonly isTextVariant = computed(() => this.variant() === 'text');
  readonly isVisible = computed(() => this.type() === 'text');

  readonly ariaLabel = computed(() => (this.isVisible() ? 'Hide password' : 'Show password'));
  readonly toggleLabel = computed(() => (this.isVisible() ? 'Hide' : 'Show'));

  readonly inputClasses = computed(() =>
    uiClass(
      'ui-focus-ring w-full rounded-[var(--radius-control)] border bg-panel px-3 py-2.5 text-sm text-fg placeholder:text-muted-fg disabled:cursor-not-allowed disabled:opacity-50',
      this.isTextVariant() ? 'pr-16' : 'pr-12',
      this.invalid() ? 'border-danger' : 'border-outline/30',
      this.loading() && 'pointer-events-none !text-transparent',
    ),
  );

  readonly toggleClasses = computed(() => {
    if (this.isTextVariant()) {
      return uiClass(
        'ui-focus-ring ui-touch-target text-muted-fg hover:text-fg absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-[var(--radius-control)] px-2 font-mono text-[0.6875rem] font-semibold tracking-wider uppercase',
        !this.value() && 'pointer-events-none opacity-0',
      );
    }

    return uiClass(
      'ui-focus-ring ui-touch-target absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-[var(--radius-control)] text-muted-fg transition hover:text-fg',
      !this.value() && 'pointer-events-none opacity-0',
    );
  });

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

  toggleType(): void {
    this.type.update((type) => (type === 'password' ? 'text' : 'password'));
  }

  markTouched(): void {
    this.onTouched();
  }
}
