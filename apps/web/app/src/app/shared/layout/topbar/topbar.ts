import { Component, inject, output } from '@angular/core';
import { Router } from '@angular/router';

import { Auth } from '../../auth/auth';
import { APP_URL } from '../../constants/routes';
import { Settings } from '../../settings';

@Component({
  imports: [],
  selector: 'app-topbar',
  templateUrl: './topbar.html',
  styleUrl: './topbar.css',
})
export class Topbar {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly settings = inject(Settings);

  readonly openMobileMenu = output<void>();
  readonly isDark = this.settings.isDark;

  toggleTheme() {
    this.settings.toggleTheme();
  }

  async signOut() {
    await this.auth.signOut();
    await this.router.navigateByUrl(APP_URL);
  }
}
