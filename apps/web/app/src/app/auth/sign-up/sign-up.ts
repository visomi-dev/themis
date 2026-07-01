import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { Auth } from '../../shared/auth/auth';
import { SIGN_IN_URL, VERIFY_EMAIL_URL } from '../../shared/constants/routes';
import { controlError } from '../../shared/form/form-errors';
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

type SignUpForm = FormGroup<{
  email: FormControl<string>;
  password: FormControl<string>;
  confirmPassword: FormControl<string>;
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
    Description,
    ErrorMessage,
    Field,
    Input,
    Label,
    Link,
    PasswordInput,
    PasswordStrength,
    ReactiveFormsModule,
    RouterLink,
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
    confirmPassword: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  private readonly emailValueChanges = toSignal(this.form.controls.email.valueChanges, {
    initialValue: this.form.controls.email.value,
  });
  private readonly passwordValueChanges = toSignal(this.form.controls.password.valueChanges, {
    initialValue: this.form.controls.password.value,
  });
  private readonly confirmPasswordValueChanges = toSignal(this.form.controls.confirmPassword.valueChanges, {
    initialValue: this.form.controls.confirmPassword.value,
  });

  readonly submitting = this.auth.submitting;
  readonly submitted = signal(false);
  readonly errorMessage = signal('');

  readonly passwordValue = computed(() => this.form.controls.password.value);

  readonly emailError = computed(() => {
    this.emailValueChanges();

    return controlError(this.form.controls.email, {
      email: $localize`:@@signUpEmailErrorInvalid:Enter a valid email address (e.g. you@company.com).`,
      required: $localize`:@@signUpEmailErrorRequired:Enter your email address.`,
    });
  });

  readonly passwordError = computed(() => {
    this.passwordValueChanges();

    return controlError(this.form.controls.password, {
      minlength: $localize`:@@signUpPasswordErrorMinlength:Use at least 8 characters.`,
      required: $localize`:@@signUpPasswordErrorRequired:Choose a password.`,
    });
  });

  readonly confirmPasswordError = computed(() => {
    this.passwordValueChanges();
    this.confirmPasswordValueChanges();
    const control = this.form.controls.confirmPassword;
    const expected = this.form.controls.password.value;

    if (control.hasError('required')) {
      return $localize`:@@signUpConfirmPasswordErrorRequired:Re-enter your new password.`;
    }

    if (expected && control.value !== expected) {
      return $localize`:@@signUpConfirmPasswordErrorMismatch:Passwords don't match.`;
    }

    return '';
  });

  async submit() {
    // Re-entrant guard. `auth.signUp` flips the shared `submitting` signal
    // synchronously, so a second click before the disable propagates still
    // sees `submitting() === true` and exits early instead of issuing a
    // duplicate POST (which the server would reject with a 409).
    if (this.submitting()) {
      return;
    }

    if (this.form.invalid || this.form.controls.password.value !== this.form.controls.confirmPassword.value) {
      return;
    }

    this.errorMessage.set('');

    try {
      await this.auth.signUp({
        email: this.form.controls.email.value,
        password: this.form.controls.password.value,
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
