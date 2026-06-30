import type { AbstractControl } from '@angular/forms';

export function controlError(control: AbstractControl | null, messages: Record<string, string>): string {
  if (!control || !control.invalid) {
    return '';
  }

  for (const [key, value] of Object.entries(messages)) {
    if (control.hasError(key)) {
      return value;
    }
  }

  return 'This field is invalid.';
}
