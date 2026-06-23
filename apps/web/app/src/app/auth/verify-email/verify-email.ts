import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { Auth } from '../../shared/auth/auth';
import { APP_URL, SIGN_IN_URL } from '../../shared/constants/routes';
import { Logo } from '../../shared/layout/logo/logo';
import { ThemeSwitcher } from '../../shared/layout/theme-switcher/theme-switcher';
import { AuthLayout } from '../../shared/ui/layout/auth-layout/auth-layout';
import { Card } from '../../shared/ui/layout/card/card';
import { Heading } from '../../shared/ui/typography/heading/heading';
import { Link } from '../../shared/ui/typography/link/link';
import { Text } from '../../shared/ui/typography/text/text';
import { VerificationCodeForm } from '../verification-code-form/verification-code-form';

@Component({
  host: {
    class: /* tw */ 'block min-h-full w-full',
  },
  imports: [AuthLayout, Card, Heading, Link, Logo, RouterLink, Text, ThemeSwitcher, VerificationCodeForm],
  selector: 'app-verify-email',
  templateUrl: './verify-email.html',
  styleUrl: './verify-email.css',
})
export class VerifyEmail {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  readonly challenge = this.auth.pendingChallenge;
  readonly verificationSubmitting = this.auth.verificationSubmitting;

  readonly errorMessage = signal('');
  readonly statusMessage = signal('');

  async submit(pin: string) {
    this.errorMessage.set('');
    this.statusMessage.set('');

    try {
      await this.auth.submitVerification(pin);
      await this.router.navigate([APP_URL]);
    } catch (error) {
      this.errorMessage.set(
        error instanceof HttpErrorResponse
          ? (error.error?.message ?? $localize`:@@verifyEmailFailed:Verification failed.`)
          : $localize`:@@verifyEmailFailed:Verification failed.`,
      );
    }
  }

  async resend() {
    this.errorMessage.set('');
    this.statusMessage.set('');

    try {
      await this.auth.resendVerification();
      this.statusMessage.set($localize`:@@verifyEmailResendSuccess:A fresh verification code was sent.`);
    } catch (error) {
      this.errorMessage.set(
        error instanceof HttpErrorResponse
          ? (error.error?.message ?? $localize`:@@verifyEmailResendFailed:Could not resend the verification code.`)
          : $localize`:@@verifyEmailResendFailed:Could not resend the verification code.`,
      );
    }
  }

  protected readonly signInUrl = SIGN_IN_URL;
}
