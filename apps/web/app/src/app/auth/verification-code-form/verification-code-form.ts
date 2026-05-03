import { Component, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputOtpModule } from 'primeng/inputotp';
import { MessageModule } from 'primeng/message';

import { FormField } from '../../shared/form/form-field/form-field';
import { controlError } from '../../shared/form/form-errors';

type VerificationForm = FormGroup<{
  pin: FormControl<string>;
}>;

@Component({
  host: {
    class: /* tw */ 'block',
  },
  selector: 'app-verification-code-form',
  imports: [ButtonModule, FormField, InputOtpModule, MessageModule, ReactiveFormsModule],
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

  pinError() {
    return controlError(this.form.controls.pin, {
      maxlength: $localize`:@@verificationCodeErrorLength:Enter the full 6-digit code.`,
      minlength: $localize`:@@verificationCodeErrorLength:Enter the full 6-digit code.`,
      required: $localize`:@@verificationCodeErrorRequired:Enter the verification code.`,
    });
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();

      return;
    }

    this.verify.emit(this.form.controls.pin.getRawValue());
  }
}
