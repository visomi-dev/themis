import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormField, FormRoot, email, form, minLength, required, type FieldTree } from '@angular/forms/signals';
import { Router } from '@angular/router';

import { Auth } from '../../shared/auth/auth';
import { APP_URL, FORGOTTEN_PASSWORD_URL, SIGN_UP_URL, VERIFY_DEVICE_URL } from '../../shared/constants/routes';
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

type SignInModel = {
  email: string;
  password: string;
  rememberDevice: boolean;
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
    Checkbox,
    ErrorMessage,
    Field,
    FormField,
    FormRoot,
    Input,
    Label,
    Link,
    PasswordInput,
  ],
  selector: 'app-sign-in',
  templateUrl: './sign-in.html',
  styleUrl: './sign-in.css',
})
export class SignIn {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  readonly signInModel = signal<SignInModel>({
    email: '',
    password: '',
    rememberDevice: true,
  });

  readonly signInForm: FieldTree<SignInModel> = form(
    this.signInModel,
    (p) => {
      required(p.email, { message: $localize`:@@signInEmailErrorRequired:Enter your email address.` });
      email(p.email, {
        message: $localize`:@@signInEmailErrorInvalid:Enter a valid email address (e.g. you@company.com).`,
      });
      required(p.password, { message: $localize`:@@signInPasswordErrorRequired:Enter your password.` });
      minLength(p.password, 8, { message: $localize`:@@signInPasswordErrorMinlength:Use at least 8 characters.` });
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

  readonly emailError = computed(() => this.signInForm.email().errors()[0]?.message ?? '');
  readonly passwordError = computed(() => this.signInForm.password().errors()[0]?.message ?? '');

  private async submit(field: FieldTree<SignInModel>): Promise<void> {
    if (this.submitting()) {
      return;
    }

    this.errorMessage.set('');

    const value = field().value();

    try {
      const result = await this.auth.signInWithPassword({
        email: value.email,
        password: value.password,
        rememberDevice: value.rememberDevice,
      });

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
