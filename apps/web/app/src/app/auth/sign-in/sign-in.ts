import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';

import { Auth } from '../../shared/auth/auth';
import { FORGOTTEN_PASSWORD_URL, SIGN_UP_URL, VERIFY_EMAIL_URL } from '../../shared/constants/routes';
import { FormField } from '../../shared/form/form-field/form-field';
import { controlError } from '../../shared/form/form-errors';
import { LanguageSwitcher } from '../../shared/layout/language-switcher/language-switcher';
import { Logo } from '../../shared/layout/logo/logo';
import { ThemeSwitcher } from '../../shared/layout/theme-switcher/theme-switcher';

type SignInForm = FormGroup<{
  email: FormControl<string>;
  password: FormControl<string>;
}>;

@Component({
  host: {
    class: /* tw */ 'block min-h-full w-full',
  },
  imports: [
    ButtonModule,
    FormField,
    InputTextModule,
    LanguageSwitcher,
    Logo,
    MessageModule,
    PasswordModule,
    ReactiveFormsModule,
    RouterLink,
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
  });

  readonly submitting = this.auth.submitting;

  readonly errorMessage = signal('');

  emailError() {
    return controlError(this.form.controls.email, {
      email: $localize`:@@signInEmailErrorInvalid:Enter a valid email address.`,
      required: $localize`:@@signInEmailErrorRequired:Enter your email address.`,
    });
  }

  passwordError() {
    return controlError(this.form.controls.password, {
      minlength: $localize`:@@signInPasswordErrorMinlength:Use at least 8 characters.`,
      required: $localize`:@@signInPasswordErrorRequired:Enter your password.`,
    });
  }

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();

      return;
    }

    this.errorMessage.set('');

    try {
      await this.auth.signInWithPassword(this.form.getRawValue());
      await this.router.navigate([VERIFY_EMAIL_URL]);
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
