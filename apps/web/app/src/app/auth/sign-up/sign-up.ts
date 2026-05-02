import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';

import { Auth } from '../../shared/auth/auth';
import { SIGN_IN_URL, VERIFY_EMAIL_URL } from '../../shared/constants/routes';
import { FormField } from '../../shared/form/form-field/form-field';
import { controlError } from '../../shared/form/form-errors';
import { LanguageSwitcher } from '../../shared/layout/language-switcher/language-switcher';
import { Logo } from '../../shared/layout/logo/logo';
import { ThemeSwitcher } from '../../shared/layout/theme-switcher/theme-switcher';

type SignUpForm = FormGroup<{
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

  emailError() {
    return controlError(this.form.controls.email, {
      email: $localize`:@@signUpEmailErrorInvalid:Enter a valid email address.`,
      required: $localize`:@@signUpEmailErrorRequired:Enter your email address.`,
    });
  }

  passwordError() {
    return controlError(this.form.controls.password, {
      minlength: $localize`:@@signUpPasswordErrorMinlength:Use at least 8 characters.`,
      required: $localize`:@@signUpPasswordErrorRequired:Create a password before continuing.`,
    });
  }

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();

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
