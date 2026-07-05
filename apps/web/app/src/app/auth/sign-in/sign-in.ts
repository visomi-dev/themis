import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { Auth } from '../../shared/auth/auth';
import { APP_URL, FORGOTTEN_PASSWORD_URL, SIGN_UP_URL, VERIFY_DEVICE_URL } from '../../shared/constants/routes';
import { controlError } from '../../shared/form/form-errors';
import { Alert } from '../../shared/ui/overlays/alert/alert';
import { AuthCard } from '../../shared/ui/layout/auth-card/auth-card';
import { AuthLayout } from '../../shared/ui/layout/auth-layout/auth-layout';
import { Button } from '../../shared/ui/actions/button/button';
import { Checkbox } from '../../shared/ui/forms/checkbox/checkbox';
import { ErrorMessage } from '../../shared/ui/forms/error-message/error-message';
import { Field } from '../../shared/ui/forms/field/field';
import { Form as AppForm } from '../../shared/ui/forms/form/form';
import { Input } from '../../shared/ui/forms/input/input';
import { Label } from '../../shared/ui/forms/label/label';
import { Link } from '../../shared/ui/typography/link/link';
import { PasswordInput } from '../../shared/ui/forms/password-input/password-input';

type SignInForm = FormGroup<{
  email: FormControl<string>;
  password: FormControl<string>;
  rememberDevice: FormControl<boolean>;
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
    Checkbox,
    ErrorMessage,
    Field,
    Input,
    Label,
    Link,
    PasswordInput,
    ReactiveFormsModule,
    RouterLink,
  ],
  selector: 'app-sign-in',
  templateUrl: './sign-in.html',
  styleUrl: './sign-in.css',
})
export class SignIn {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  readonly form: SignInForm = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)],
    }),
    rememberDevice: new FormControl(true, {
      nonNullable: true,
    }),
  });

  private readonly emailValueChanges = toSignal(this.form.controls.email.valueChanges, {
    initialValue: this.form.controls.email.value,
  });
  private readonly passwordValueChanges = toSignal(this.form.controls.password.valueChanges, {
    initialValue: this.form.controls.password.value,
  });

  readonly submitting = this.auth.submitting;
  readonly submitted = signal(false);
  readonly errorMessage = signal('');

  readonly emailError = computed(() => {
    this.emailValueChanges();

    return controlError(this.form.controls.email, {
      email: $localize`:@@signInEmailErrorInvalid:Enter a valid email address (e.g. you@company.com).`,
      required: $localize`:@@signInEmailErrorRequired:Enter your email address.`,
    });
  });

  readonly passwordError = computed(() => {
    this.passwordValueChanges();

    return controlError(this.form.controls.password, {
      minlength: $localize`:@@signInPasswordErrorMinlength:Use at least 8 characters.`,
      required: $localize`:@@signInPasswordErrorRequired:Enter your password.`,
    });
  });

  async submit() {
    if (this.submitting()) {
      return;
    }

    if (this.form.invalid) {
      return;
    }

    this.errorMessage.set('');

    try {
      const result = await this.auth.signInWithPassword(this.form.getRawValue());

      if ('authenticated' in result) {
        await this.router.navigate([APP_URL]);

        return;
      }

      await this.router.navigate([VERIFY_DEVICE_URL]);
    } catch (error) {
      this.errorMessage.set(
        error instanceof HttpErrorResponse
          ? (error.error?.message ?? $localize`:@@signInAuthFailed:Authentication failed.`)
          : $localize`:@@signInAuthFailed:Authentication failed.`,
      );
    }
  }

  protected readonly footerLink = SIGN_UP_URL;
  protected readonly forgottenPasswordUrl = FORGOTTEN_PASSWORD_URL;
}
