import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { Auth } from '../../shared/auth/auth';
import { SIGN_IN_URL } from '../../shared/constants/routes';
import { controlError } from '../../shared/form/form-errors';
import { Alert } from '../../shared/ui/overlays/alert/alert';
import { AuthCard } from '../../shared/ui/layout/auth-card/auth-card';
import { AuthLayout } from '../../shared/ui/layout/auth-layout/auth-layout';
import { Button } from '../../shared/ui/actions/button/button';
import { ErrorMessage } from '../../shared/ui/forms/error-message/error-message';
import { Field } from '../../shared/ui/forms/field/field';
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
    AuthCard,
    AuthLayout,
    Button,
    ErrorMessage,
    Field,
    Input,
    Label,
    Link,
    ReactiveFormsModule,
    RouterLink,
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
  readonly successEmail = signal('');
  readonly errorMessage = signal('');
  readonly emailError = signal('');

  updateEmailError() {
    this.emailError.set(this.emailErrorMessage());
  }

  emailErrorMessage() {
    return controlError(this.form.controls.email, {
      email: $localize`:@@forgottenPasswordEmailErrorInvalid:Enter a valid email address (e.g. you@company.com).`,
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
    this.submitting.set(true);

    try {
      await this.auth.requestPasswordReset(this.form.getRawValue().email);
      this.successEmail.set(this.form.getRawValue().email);
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
