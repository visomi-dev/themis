import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { Auth } from '../../shared/auth/auth';
import { SIGN_IN_URL, VERIFY_EMAIL_URL } from '../../shared/constants/routes';
import { controlError } from '../../shared/form/form-errors';
import { Logo } from '../../shared/layout/logo/logo';
import { ThemeSwitcher } from '../../shared/layout/theme-switcher/theme-switcher';
import { Alert } from '../../shared/ui/overlays/alert/alert';
import { AuthLayout } from '../../shared/ui/layout/auth-layout/auth-layout';
import { Button } from '../../shared/ui/actions/button/button';
import { Card } from '../../shared/ui/layout/card/card';
import { Description } from '../../shared/ui/forms/description/description';
import { ErrorMessage } from '../../shared/ui/forms/error-message/error-message';
import { Field } from '../../shared/ui/forms/field/field';
import { Heading } from '../../shared/ui/typography/heading/heading';
import { Input } from '../../shared/ui/forms/input/input';
import { Label } from '../../shared/ui/forms/label/label';
import { Link } from '../../shared/ui/typography/link/link';
import { PasswordInput } from '../../shared/ui/forms/password-input/password-input';

type SignUpForm = FormGroup<{
  email: FormControl<string>;
  password: FormControl<string>;
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
    Description,
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
    ThemeSwitcher,
  ],
  selector: 'app-sign-up',
  templateUrl: './sign-up.html',
  styleUrl: './sign-up.css',
})
export class SignUp {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  readonly form: SignUpForm = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)],
    }),
  });

  readonly submitting = this.auth.submitting;

  readonly errorMessage = signal('');
  readonly emailError = signal('');
  readonly passwordError = signal('');

  updateEmailError() {
    this.emailError.set(this.emailErrorMessage());
  }

  updatePasswordError() {
    this.passwordError.set(this.passwordErrorMessage());
  }

  emailErrorMessage() {
    return controlError(this.form.controls.email, {
      email: $localize`:@@signUpEmailErrorInvalid:Enter a valid email address.`,
      required: $localize`:@@signUpEmailErrorRequired:Enter your email address.`,
    });
  }

  passwordErrorMessage() {
    return controlError(this.form.controls.password, {
      minlength: $localize`:@@signUpPasswordErrorMinlength:Use at least 8 characters.`,
      required: $localize`:@@signUpPasswordErrorRequired:Create a password before continuing.`,
    });
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
      await this.auth.signUp(this.form.getRawValue());
      await this.router.navigate([VERIFY_EMAIL_URL]);
    } catch (error) {
      this.errorMessage.set(
        error instanceof HttpErrorResponse
          ? (error.error?.message ?? $localize`:@@signUpAuthFailed:Authentication failed.`)
          : $localize`:@@signUpAuthFailed:Authentication failed.`,
      );
    }
  }

  protected readonly footerLink = SIGN_IN_URL;
}
