import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';

import { AuthStateService } from '../../core/auth/auth-state.service';
import { ThemeToggle } from '../../shared/theme-toggle/theme-toggle';

@Component({
  imports: [ButtonModule, ThemeToggle],
  selector: 'app-dashboard-page',
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  protected readonly authState = inject(AuthStateService);
  private readonly router = inject(Router);

  protected readonly user = this.authState.user;

  protected async signOut() {
    await this.authState.signOut();
    await this.router.navigate(['/sign-in']);
  }
}
