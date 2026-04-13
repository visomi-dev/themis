import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PasswordModule } from 'primeng/password';

import { AuthStateService } from '../../core/auth/auth-state.service';
import type { AuthMode } from '../../core/auth/auth.models';
import { ThemeToggleComponent } from '../../shared/theme-toggle.component';

@Component({
  imports: [ButtonModule, InputTextModule, MessageModule, PasswordModule, ReactiveFormsModule, RouterLink, ThemeToggleComponent],
  selector: 'app-auth-form-page',
  standalone: true,
  templateUrl: './auth-form-page.component.html',
  styleUrl: './auth-form-page.component.css',
})
export class AuthFormPageComponent {
  protected readonly authState = inject(AuthStateService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)],
    }),
  });

  protected readonly mode = this.route.snapshot.data['mode'] as AuthMode;
  protected errorMessage = '';

  protected get heading() {
    return this.mode === 'sign_in' ? 'Sign in' : 'Create account';
  }

  protected get supportingCopy() {
    return this.mode === 'sign_in'
      ? 'Enter your details to access your workspace.'
      : 'Set up your Themis account to start working inside the product surface.';
  }

  protected get submitLabel() {
    return this.mode === 'sign_in' ? 'Sign in' : 'Create account';
  }

  protected get footerPrompt() {
    return this.mode === 'sign_in' ? 'New to Themis?' : 'Already have an account?';
  }

  protected get footerLinkLabel() {
    return this.mode === 'sign_in' ? 'Create an account' : 'Back to sign in';
  }

  protected get footerLink() {
    return this.mode === 'sign_in' ? '/sign-up' : '/sign-in';
  }

  protected async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage = '';

    try {
      await this.authState.submitCredentials(this.mode, this.form.getRawValue());
      await this.router.navigate(['/verify-email']);
    } catch (error) {
      this.errorMessage = error instanceof HttpErrorResponse ? error.error?.message ?? 'Authentication failed.' : 'Authentication failed.';
    }
  }
}
