import { FormControl } from '@angular/forms';

import { controlError } from './form-errors';

describe('controlError', () => {
  it('returns an empty string when the control is missing', () => {
    expect(controlError(null, { required: 'Required.' })).toBe('');
  });

  it('returns an empty string when the control is valid', () => {
    const control = new FormControl('value', { nonNullable: true });
    const messages = { required: 'Required.' };

    expect(controlError(control, messages)).toBe('');
  });

  it('returns the first matching message for the active error key', () => {
    const control = new FormControl('', { nonNullable: true });

    control.addValidators(() => ({ required: true }));
    control.updateValueAndValidity();

    const messages = {
      email: 'Enter a valid email address.',
      required: 'This field is required.',
    };

    expect(controlError(control, messages)).toBe(messages.required);
  });

  it('falls back to the default message when no message matches', () => {
    const control = new FormControl('', { nonNullable: true });

    control.addValidators(() => ({ unknown: true }));
    control.updateValueAndValidity();

    expect(controlError(control, { required: 'Required.' })).toBe('This field is invalid.');
  });
});
