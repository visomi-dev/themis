import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { Auth } from '../../shared/auth/auth';
import { SIGN_IN_URL } from '../../shared/constants/routes';
import { Alert } from '../../shared/ui/overlays/alert/alert';
import { AuthCard } from '../../shared/ui/layout/auth-card/auth-card';
import { AuthLayout } from '../../shared/ui/layout/auth-layout/auth-layout';
import { Button } from '../../shared/ui/actions/button/button';
import { ErrorMessage } from '../../shared/ui/forms/error-message/error-message';
import { Field } from '../../shared/ui/forms/field/field';
import { Form as AppForm } from '../../shared/ui/forms/form/form';
import { Label } from '../../shared/ui/forms/label/label';
import { Link } from '../../shared/ui/typography/link/link';
import { PasswordInput } from '../../shared/ui/forms/password-input/password-input';
import { PasswordStrength } from '../../shared/ui/forms/password-strength/password-strength';
import { VerificationCodeForm } from '../verification-code-form/verification-code-form';

type ResetStep = 'otp' | 'password' | 'success';

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
    AppForm,
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
    VerificationCodeForm,
  ],
  selector: 'app-reset-password',
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css',
})
export class ResetPassword {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  readonly step = signal<ResetStep>('otp');
  readonly submitting = signal(false);
  readonly submitted = signal(false);
  readonly errorMessage = signal('');
  readonly pinManualError = signal<string | null>(null);

  readonly challenge = this.auth.pendingChallenge;
  readonly pendingEmail = computed(() => this.challenge()?.email ?? null);
  readonly verificationSubmitting = this.auth.verificationSubmitting;

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

  private readonly passwordValueChanges = toSignal(this.passwordForm.controls.password.valueChanges, {
    initialValue: this.passwordForm.controls.password.status,
  });

  readonly passwordValue = computed(() => this.passwordForm.controls.password.value);

  readonly confirmPasswordError = computed(() => {
    this.passwordValueChanges();
    const control = this.passwordForm.controls.confirmPassword;
    const expected = this.passwordForm.controls.password.value;

    if (control.hasError('required')) {
      return $localize`:@@resetPasswordConfirmErrorRequired:Re-enter your new password.`;
    }

    if (expected && control.value !== expected) {
      return $localize`:@@resetPasswordConfirmErrorMismatch:Passwords don't match.`;
    }

    return '';
  });

  async onOtpSubmit(pin: string) {
    const challenge = this.challenge();

    this.pinManualError.set(null);

    if (!challenge) {
      this.errorMessage.set(
        $localize`:@@resetPasswordMissingChallenge:The recovery session has expired. Please request a new code.`,
      );

      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    try {
      await this.auth.verifyPasswordReset(challenge.challengeId, pin);
      this.step.set('password');
    } catch (error) {
      this.errorMessage.set(
        error instanceof HttpErrorResponse
          ? (error.error?.message ?? $localize`:@@resetPasswordVerifyFailed:That code didn't work. Try again.`)
          : $localize`:@@resetPasswordVerifyFailed:That code didn't work. Try again.`,
      );
      this.pinManualError.set($localize`:@@resetPasswordPinErrorMismatch:That code didn't work. Try again.`);
    } finally {
      this.submitting.set(false);
    }
  }

  async onPasswordSubmit() {
    if (
      this.passwordForm.invalid ||
      this.passwordForm.controls.password.value !== this.passwordForm.controls.confirmPassword.value
    ) {
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    try {
      await this.auth.submitPasswordReset(this.passwordForm.controls.password.value);
      this.auth.clearPendingChallenge();
      this.step.set('success');
    } catch (error) {
      this.errorMessage.set(
        error instanceof HttpErrorResponse
          ? (error.error?.message ?? $localize`:@@resetPasswordUpdateFailed:Could not update the password.`)
          : $localize`:@@resetPasswordUpdateFailed:Could not update the password.`,
      );
    } finally {
      this.submitting.set(false);
    }
  }

  protected readonly signInUrl = SIGN_IN_URL;
}
