import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { Auth } from '../../shared/auth/auth';
import {
  APP_URL,
  FORGOTTEN_PASSWORD_URL,
  SIGN_UP_URL,
  VERIFY_DEVICE_URL,
  VERIFY_EMAIL_URL,
} from '../../shared/constants/routes';
import { controlError } from '../../shared/form/form-errors';
import { Logo } from '../../shared/layout/logo/logo';
import { ThemeSwitcher } from '../../shared/layout/theme-switcher/theme-switcher';
import { Alert } from '../../shared/ui/overlays/alert/alert';
import { AuthLayout } from '../../shared/ui/layout/auth-layout/auth-layout';
import { Button } from '../../shared/ui/actions/button/button';
import { Card } from '../../shared/ui/layout/card/card';
import { Checkbox } from '../../shared/ui/forms/checkbox/checkbox';
import { ErrorMessage } from '../../shared/ui/forms/error-message/error-message';
import { Field } from '../../shared/ui/forms/field/field';
import { Heading } from '../../shared/ui/typography/heading/heading';
import { Input } from '../../shared/ui/forms/input/input';
import { Label } from '../../shared/ui/forms/label/label';
import { Link } from '../../shared/ui/typography/link/link';
import { PasswordInput } from '../../shared/ui/forms/password-input/password-input';
import { Text } from '../../shared/ui/typography/text/text';

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
    AuthLayout,
    Button,
    Card,
    Checkbox,
    ErrorMessage,
    Field,
    Heading,
    Input,
    Label,
    Link,
    Logo,
    PasswordInput,
    ReactiveFormsModule,
    RouterLink,
    Text,
    ThemeSwitcher,
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

  readonly submitting = this.auth.submitting;

  readonly errorMessage = signal('');

  readonly emailError = signal('');
  readonly passwordError = signal('');

  emailErrorMessage() {
    return controlError(this.form.controls.email, {
      email: $localize`:@@signInEmailErrorInvalid:Enter a valid email address.`,
      required: $localize`:@@signInEmailErrorRequired:Enter your email address.`,
    });
  }

  passwordErrorMessage() {
    return controlError(this.form.controls.password, {
      minlength: $localize`:@@signInPasswordErrorMinlength:Use at least 8 characters.`,
      required: $localize`:@@signInPasswordErrorRequired:Enter your password.`,
    });
  }

  updateEmailError() {
    this.emailError.set(this.emailErrorMessage());
  }

  updatePasswordError() {
    this.passwordError.set(this.passwordErrorMessage());
  }

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.updateEmailError();
      this.updatePasswordError();

      return;
    }

    this.errorMessage.set('');

    try {
      const result = await this.auth.signInWithPassword(this.form.getRawValue());

      if ('authenticated' in result) {
        await this.router.navigate([APP_URL]);

        return;
      }

      await this.router.navigate([result.purpose === 'sign_up' ? VERIFY_EMAIL_URL : VERIFY_DEVICE_URL]);
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
