import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { Auth } from '../../shared/auth/auth';
import { APP_URL, SIGN_IN_URL } from '../../shared/constants/routes';
import { LanguageSwitcher } from '../../shared/layout/language-switcher/language-switcher';
import { Logo } from '../../shared/layout/logo/logo';
import { ThemeSwitcher } from '../../shared/layout/theme-switcher/theme-switcher';
import { VerificationCodeForm } from '../verification-code-form/verification-code-form';

@Component({
  host: {
    class: /* tw */ 'block min-h-full w-full',
  },
  selector: 'app-verify-device',
  imports: [LanguageSwitcher, Logo, RouterLink, ThemeSwitcher, VerificationCodeForm],
  templateUrl: './verify-device.html',
  styleUrl: './verify-device.css',
})
export class VerifyDevice {
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
          ? (error.error?.message ?? $localize`:@@verifyDeviceFailed:Device verification failed.`)
          : $localize`:@@verifyDeviceFailed:Device verification failed.`,
      );
    }
  }

  async resend() {
    this.errorMessage.set('');
    this.statusMessage.set('');

    try {
      await this.auth.resendVerification();
      this.statusMessage.set($localize`:@@verifyDeviceResendSuccess:A fresh device verification code was sent.`);
    } catch (error) {
      this.errorMessage.set(
        error instanceof HttpErrorResponse
          ? (error.error?.message ?? $localize`:@@verifyDeviceResendFailed:Could not resend the device code.`)
          : $localize`:@@verifyDeviceResendFailed:Could not resend the device code.`,
      );
    }
  }

  protected readonly signInUrl = SIGN_IN_URL;
}
