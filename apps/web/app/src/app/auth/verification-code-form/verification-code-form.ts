import { Component, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { controlError } from '../../shared/form/form-errors';
import { Alert } from '../../shared/ui/overlays/alert/alert';
import { Button } from '../../shared/ui/actions/button/button';
import { Description } from '../../shared/ui/forms/description/description';
import { ErrorMessage } from '../../shared/ui/forms/error-message/error-message';
import { Field } from '../../shared/ui/forms/field/field';
import { Label } from '../../shared/ui/forms/label/label';
import { PinInput } from '../../shared/ui/forms/pin-input/pin-input';

type VerificationForm = FormGroup<{
  pin: FormControl<string>;
}>;

@Component({
  host: {
    class: /* tw */ 'block',
  },
  selector: 'app-verification-code-form',
  imports: [Alert, Button, Description, ErrorMessage, Field, Label, PinInput, ReactiveFormsModule],
  templateUrl: './verification-code-form.html',
  styleUrl: './verification-code-form.css',
})
export class VerificationCodeForm {
  readonly errorMessage = input('');
  readonly statusMessage = input('');
  readonly submitting = input(false);

  readonly verify = output<string>();
  readonly resend = output<void>();

  readonly form: VerificationForm = new FormGroup({
    pin: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(6), Validators.maxLength(6)],
    }),
  });

  pinError = '';

  pinErrorMessage() {
    return controlError(this.form.controls.pin, {
      maxlength: $localize`:@@verificationCodeErrorLength:Enter the full 6-digit code.`,
      minlength: $localize`:@@verificationCodeErrorLength:Enter the full 6-digit code.`,
      required: $localize`:@@verificationCodeErrorRequired:Enter the verification code.`,
    });
  }

  updatePinError() {
    this.pinError = this.pinErrorMessage();
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.updatePinError();

      return;
    }

    this.verify.emit(this.form.controls.pin.getRawValue());
  }
}
