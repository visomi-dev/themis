import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { Auth } from '../../shared/auth/auth';
import { RESET_PASSWORD_URL, SIGN_IN_URL } from '../../shared/constants/routes';
import { controlError } from '../../shared/form/form-errors';
import { Alert } from '../../shared/ui/overlays/alert/alert';
import { AuthCard } from '../../shared/ui/layout/auth-card/auth-card';
import { AuthLayout } from '../../shared/ui/layout/auth-layout/auth-layout';
import { Button } from '../../shared/ui/actions/button/button';
import { ErrorMessage } from '../../shared/ui/forms/error-message/error-message';
import { Field } from '../../shared/ui/forms/field/field';
import { Form as AppForm } from '../../shared/ui/forms/form/form';
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
  imports: [Alert, AppForm, AuthCard, AuthLayout, Button, ErrorMessage, Field, Input, Label, Link, ReactiveFormsModule],
  selector: 'app-forgotten-password',
  templateUrl: './forgotten-password.html',
  styleUrl: './forgotten-password.css',
})
export class ForgottenPassword {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  readonly form: ForgottenPasswordForm = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
  });

  private readonly emailValueChanges = toSignal(this.form.controls.email.valueChanges, {
    initialValue: this.form.controls.email.status,
  });

  readonly submitting = signal(false);
  readonly submitted = signal(false);
  readonly successEmail = signal('');
  readonly errorMessage = signal('');

  readonly emailError = computed(() => {
    this.emailValueChanges();

    return controlError(this.form.controls.email, {
      email: $localize`:@@forgottenPasswordEmailErrorInvalid:Enter a valid email address (e.g. you@company.com).`,
      required: $localize`:@@forgottenPasswordEmailErrorRequired:Enter your email address.`,
    });
  });

  async submit() {
    if (this.form.invalid) {
      return;
    }

    this.errorMessage.set('');
    this.submitting.set(true);

    try {
      const challenge = await this.auth.requestPasswordReset(this.form.getRawValue().email);

      if (challenge) {
        this.successEmail.set(this.form.getRawValue().email);
        await this.router.navigate([RESET_PASSWORD_URL]);
      } else {
        this.successEmail.set(this.form.getRawValue().email);
      }
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
