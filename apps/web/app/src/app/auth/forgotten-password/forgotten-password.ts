import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Auth } from '../../shared/auth/auth';
import { SIGN_IN_URL } from '../../shared/constants/routes';
import { controlError } from '../../shared/form/form-errors';
import { Logo } from '../../shared/layout/logo/logo';
import { ThemeSwitcher } from '../../shared/layout/theme-switcher/theme-switcher';
import { Alert } from '../../shared/ui/overlays/alert/alert';
import { AuthLayout } from '../../shared/ui/layout/auth-layout/auth-layout';
import { Button } from '../../shared/ui/actions/button/button';
import { Card } from '../../shared/ui/layout/card/card';
import { ErrorMessage } from '../../shared/ui/forms/error-message/error-message';
import { Field } from '../../shared/ui/forms/field/field';
import { Heading } from '../../shared/ui/typography/heading/heading';
import { Input } from '../../shared/ui/forms/input/input';
import { Label } from '../../shared/ui/forms/label/label';
import { Link } from '../../shared/ui/typography/link/link';

type ForgottenPasswordForm = FormGroup<{
  email: FormControl<string>;
}>;

@Component({
  host: {
    class: /* tw */ 'block min-h-full w-full',
  },
  imports: [
    Alert,
    AuthLayout,
    Button,
    Card,
    ErrorMessage,
    Field,
    Heading,
    Input,
    Label,
    Link,
    Logo,
    ReactiveFormsModule,
    RouterLink,
    ThemeSwitcher,
  ],
  selector: 'app-forgotten-password',
  templateUrl: './forgotten-password.html',
  styleUrl: './forgotten-password.css',
})
export class ForgottenPassword {
  private readonly auth = inject(Auth);

  readonly form: ForgottenPasswordForm = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
  });

  readonly submitting = signal(false);
  readonly successMessage = signal('');
  readonly errorMessage = signal('');
  readonly emailError = signal('');

  updateEmailError() {
    this.emailError.set(this.emailErrorMessage());
  }

  emailErrorMessage() {
    return controlError(this.form.controls.email, {
      email: $localize`:@@forgottenPasswordEmailErrorInvalid:Enter a valid email address.`,
      required: $localize`:@@forgottenPasswordEmailErrorRequired:Enter your email address.`,
    });
  }

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.updateEmailError();

      return;
    }

    this.errorMessage.set('');
    this.successMessage.set('');
    this.submitting.set(true);

    try {
      await this.auth.requestPasswordReset(this.form.getRawValue().email);
      this.successMessage.set(
        $localize`:@@forgottenPasswordSuccess:If an account exists with that email, a reset link has been sent.`,
      );
      this.form.reset();
    } catch (error) {
      this.errorMessage.set(
        error instanceof HttpErrorResponse
          ? (error.error?.message ?? $localize`:@@forgottenPasswordRequestFailed:Request failed.`)
          : $localize`:@@forgottenPasswordRequestFailed:Request failed.`,
      );
    } finally {
      this.submitting.set(false);
    }
  }

  protected readonly signInUrl = SIGN_IN_URL;
}
