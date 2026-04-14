import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputOtpModule } from 'primeng/inputotp';
import { MessageModule } from 'primeng/message';

import { AuthStateService } from '../../core/auth/auth-state.service';
import { ThemeToggleComponent } from '../../shared/theme-toggle.component';

@Component({
  imports: [ButtonModule, InputOtpModule, MessageModule, ReactiveFormsModule, RouterLink, ThemeToggleComponent],
  selector: 'app-verify-email-page',
  standalone: true,
  templateUrl: './verify-email-page.component.html',
  styleUrl: './verify-email-page.component.css',
})
export class VerifyEmailPageComponent {
  protected readonly authState = inject(AuthStateService);
  private readonly router = inject(Router);

  protected readonly challenge = this.authState.pendingChallenge;
  protected readonly hasChallenge = computed(() => this.challenge() !== null);
  protected readonly form = new FormGroup({
    pin: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(6)],
    }),
  });

  protected errorMessage = '';
  protected statusMessage = '';

  protected async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage = '';
    this.statusMessage = '';

    try {
      await this.authState.submitVerification(this.form.controls.pin.getRawValue());
      await this.router.navigate(['/']);
    } catch (error) {
      this.errorMessage =
        error instanceof HttpErrorResponse ? (error.error?.message ?? 'Verification failed.') : 'Verification failed.';
    }
  }

  protected async resend() {
    this.errorMessage = '';

    try {
      await this.authState.resendVerification();
      this.statusMessage = 'A fresh verification code was sent.';
    } catch (error) {
      this.errorMessage =
        error instanceof HttpErrorResponse
          ? (error.error?.message ?? 'Could not resend the verification code.')
          : 'Could not resend the verification code.';
    }
  }
}
