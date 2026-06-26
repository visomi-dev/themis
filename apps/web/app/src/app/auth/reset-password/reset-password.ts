import { Component, computed, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { SIGN_IN_URL } from '../../shared/constants/routes';
import { controlError } from '../../shared/form/form-errors';
import { Alert } from '../../shared/ui/overlays/alert/alert';
import { AuthCard } from '../../shared/ui/layout/auth-card/auth-card';
import { AuthLayout } from '../../shared/ui/layout/auth-layout/auth-layout';
import { Button } from '../../shared/ui/actions/button/button';
import { ErrorMessage } from '../../shared/ui/forms/error-message/error-message';
import { Field } from '../../shared/ui/forms/field/field';
import { Input as TextInput } from '../../shared/ui/forms/input/input';
import { Label } from '../../shared/ui/forms/label/label';
import { Link } from '../../shared/ui/typography/link/link';
import { PasswordInput } from '../../shared/ui/forms/password-input/password-input';
import { PasswordStrength } from '../../shared/ui/forms/password-strength/password-strength';

type ResetStep = 'otp' | 'password' | 'success';

type OtpForm = FormGroup<{
  pin: FormControl<string>;
}>;

type PasswordForm = FormGroup<{
  password: FormControl<string>;
  confirmPassword: FormControl<string>;
}>;

@Component({
  host: {
    class: /* tw */ 'block min-h-full w-full',
  },
  imports: [
    Alert,
    AuthCard,
    AuthLayout,
    Button,
    ErrorMessage,
    Field,
    Label,
    Link,
    PasswordInput,
    PasswordStrength,
    ReactiveFormsModule,
    RouterLink,
    TextInput,
  ],
  selector: 'app-reset-password',
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css',
})
export class ResetPassword {
  readonly step = signal<ResetStep>('otp');
  readonly pendingEmail = signal<string | null>(null);
  readonly errorMessage = signal('');
  readonly submitting = signal(false);

  readonly otpForm: OtpForm = new FormGroup({
    pin: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(6), Validators.maxLength(6)],
    }),
  });

  readonly passwordForm: PasswordForm = new FormGroup({
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)],
    }),
    confirmPassword: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  readonly passwordValue = computed(() => this.passwordForm.controls.password.value);

  readonly passwordError = signal('');
  readonly confirmPasswordError = signal('');
  readonly pinError = signal('');

  submitOtp() {
    if (this.otpForm.invalid) {
      this.otpForm.markAllAsTouched();
      this.pinError.set(this.pinErrorMessage());

      return;
    }

    this.submitting.set(true);

    setTimeout(() => {
      this.submitting.set(false);
      this.pendingEmail.set(this.pendingEmail() ?? 'engineer+recovery@themis.visomi.dev');
      this.step.set('password');
    }, 250);
  }

  submitPassword() {
    this.passwordError.set(this.passwordErrorMessage());
    this.confirmPasswordError.set(this.confirmPasswordErrorMessage());

    if (this.passwordForm.invalid || this.passwordError() || this.confirmPasswordError()) {
      this.passwordForm.markAllAsTouched();

      return;
    }

    this.submitting.set(true);

    setTimeout(() => {
      this.submitting.set(false);
      this.step.set('success');
    }, 250);
  }

  passwordErrorMessage() {
    return controlError(this.passwordForm.controls.password, {
      minlength: $localize`:@@resetPasswordPasswordErrorMinlength:Use at least 8 characters.`,
      required: $localize`:@@resetPasswordPasswordErrorRequired:Choose a new password.`,
    });
  }

  confirmPasswordErrorMessage() {
    const control = this.passwordForm.controls.confirmPassword;
    const expected = this.passwordForm.controls.password.value;

    if (control.hasError('required')) {
      return $localize`:@@resetPasswordConfirmErrorRequired:Re-enter your new password.`;
    }

    if (expected && control.value !== expected) {
      return $localize`:@@resetPasswordConfirmErrorMismatch:Passwords don't match.`;
    }

    return '';
  }

  pinErrorMessage() {
    return controlError(this.otpForm.controls.pin, {
      minlength: $localize`:@@resetPasswordPinErrorLength:Enter the 6-digit code.`,
      maxlength: $localize`:@@resetPasswordPinErrorLength:Enter the 6-digit code.`,
      required: $localize`:@@resetPasswordPinErrorRequired:Enter the 6-digit code.`,
    });
  }

  protected readonly signInUrl = SIGN_IN_URL;
}
