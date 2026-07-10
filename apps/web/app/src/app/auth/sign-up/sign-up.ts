import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import {
  email,
  form,
  minLength,
  required,
  validate,
  type FieldTree,
  FormField,
  FormRoot,
} from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';

import { Auth } from '../../shared/auth/auth';
import { SIGN_IN_URL, VERIFY_EMAIL_URL } from '../../shared/constants/routes';
import { Alert } from '../../shared/ui/overlays/alert/alert';
import { AuthCard } from '../../shared/ui/layout/auth-card/auth-card';
import { AuthLayout } from '../../shared/ui/layout/auth-layout/auth-layout';
import { Button } from '../../shared/ui/actions/button/button';
import { Description } from '../../shared/ui/forms/description/description';
import { ErrorMessage } from '../../shared/ui/forms/error-message/error-message';
import { Field } from '../../shared/ui/forms/field/field';
import { Form as AppForm } from '../../shared/ui/forms/form/form';
import { Input } from '../../shared/ui/forms/input/input';
import { Label } from '../../shared/ui/forms/label/label';
import { Link } from '../../shared/ui/typography/link/link';
import { PasswordInput } from '../../shared/ui/forms/password-input/password-input';
import { PasswordStrength } from '../../shared/ui/forms/password-strength/password-strength';

type SignUpModel = {
  email: string;
  password: string;
  confirmPassword: string;
};

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
    Description,
    ErrorMessage,
    Field,
    FormField,
    FormRoot,
    Input,
    Label,
    Link,
    PasswordInput,
    PasswordStrength,
    RouterLink,
  ],
  selector: 'app-sign-up',
  templateUrl: './sign-up.html',
  styleUrl: './sign-up.css',
})
export class SignUp {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  readonly signUpModel = signal<SignUpModel>({
    email: '',
    password: '',
    confirmPassword: '',
  });

  readonly signUpForm: FieldTree<SignUpModel> = form(
    this.signUpModel,
    (p) => {
      required(p.email, { message: $localize`:@@signUpEmailErrorRequired:Enter your email address.` });
      email(p.email, {
        message: $localize`:@@signUpEmailErrorInvalid:Enter a valid email address (e.g. you@company.com).`,
      });
      required(p.password, { message: $localize`:@@signUpPasswordErrorRequired:Choose a password.` });
      minLength(p.password, 8, { message: $localize`:@@signUpPasswordErrorMinlength:Use at least 8 characters.` });
      required(p.confirmPassword, {
        message: $localize`:@@signUpConfirmPasswordErrorRequired:Re-enter your new password.`,
      });
      validate(p.confirmPassword, ({ value, valueOf }) => {
        const password = valueOf(p.password);
        const current = value();

        return current && password && current !== password
          ? {
              kind: 'passwordMismatch',
              message: $localize`:@@signUpConfirmPasswordErrorMismatch:Passwords don't match.`,
            }
          : null;
      });
    },
    {
      submission: {
        action: async (field) => {
          await this.submit(field);
        },
      },
    },
  );

  readonly submitting = this.auth.submitting;
  readonly errorMessage = signal('');

  readonly passwordValue = computed(() => this.signUpForm.password().value());

  readonly emailError = computed(() => this.signUpForm.email().errors()[0]?.message ?? '');
  readonly passwordError = computed(() => this.signUpForm.password().errors()[0]?.message ?? '');

  private async submit(field: FieldTree<SignUpModel>): Promise<void> {
    if (this.submitting()) {
      return;
    }

    this.errorMessage.set('');

    const value = field().value();

    try {
      await this.auth.signUp({
        email: value.email,
        password: value.password,
      });
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
