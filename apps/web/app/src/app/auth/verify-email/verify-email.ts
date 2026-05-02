import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputOtpModule } from 'primeng/inputotp';
import { MessageModule } from 'primeng/message';

import { Auth } from '../../shared/auth/auth';
import { APP_URL, SIGN_IN_URL } from '../../shared/constants/routes';
import { FormField } from '../../shared/form/form-field/form-field';
import { controlError } from '../../shared/form/form-errors';
import { LanguageSwitcher } from '../../shared/layout/language-switcher/language-switcher';
import { Logo } from '../../shared/layout/logo/logo';
import { ThemeSwitcher } from '../../shared/layout/theme-switcher/theme-switcher';

type VerificationForm = FormGroup<{
  pin: FormControl<string>;
}>;

@Component({
  host: {
    class: /* tw */ 'block min-h-full w-full',
  },
  imports: [
    ButtonModule,
    FormField,
    InputOtpModule,
    LanguageSwitcher,
    Logo,
    MessageModule,
    ReactiveFormsModule,
    RouterLink,
    ThemeSwitcher,
  ],
  selector: 'app-verify-email',
  templateUrl: './verify-email.html',
  styleUrl: './verify-email.css',
})
export class VerifyEmail {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  readonly challenge = this.auth.pendingChallenge;
  readonly verificationSubmitting = this.auth.verificationSubmitting;
  readonly form: VerificationForm = new FormGroup({
    pin: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(6), Validators.maxLength(6)],
    }),
  });

  readonly errorMessage = signal('');
  readonly statusMessage = signal('');

  pinError() {
    return controlError(this.form.controls.pin, {
      maxlength: $localize`:@@verifyEmailCodeErrorLength:Enter the full 6-digit code.`,
      minlength: $localize`:@@verifyEmailCodeErrorLength:Enter the full 6-digit code.`,
      required: $localize`:@@verifyEmailCodeErrorRequired:Enter the verification code.`,
    });
  }

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();

      return;
    }

    this.errorMessage.set('');
    this.statusMessage.set('');

    try {
      await this.auth.submitVerification(this.form.controls.pin.getRawValue());
      await this.router.navigate([APP_URL]);
    } catch (error) {
      this.errorMessage.set(
        error instanceof HttpErrorResponse
          ? (error.error?.message ?? $localize`:@@verifyEmailFailed:Verification failed.`)
          : $localize`:@@verifyEmailFailed:Verification failed.`,
      );
    }
  }

  async resend() {
    this.errorMessage.set('');
    this.statusMessage.set('');

    try {
      await this.auth.resendVerification();
      this.statusMessage.set($localize`:@@verifyEmailResendSuccess:A fresh verification code was sent.`);
    } catch (error) {
      this.errorMessage.set(
        error instanceof HttpErrorResponse
          ? (error.error?.message ?? $localize`:@@verifyEmailResendFailed:Could not resend the verification code.`)
          : $localize`:@@verifyEmailResendFailed:Could not resend the verification code.`,
      );
    }
  }

  protected readonly signInUrl = SIGN_IN_URL;
}
