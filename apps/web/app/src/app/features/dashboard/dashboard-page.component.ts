import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';

import { AuthStateService } from '../../core/auth/auth-state.service';
import { ThemeToggleComponent } from '../../shared/theme-toggle.component';

@Component({
  imports: [ButtonModule, ThemeToggleComponent],
  selector: 'app-dashboard-page',
  standalone: true,
  templateUrl: './dashboard-page.component.html',
  styleUrl: './dashboard-page.component.css',
})
export class DashboardPageComponent {
  protected readonly authState = inject(AuthStateService);
  private readonly router = inject(Router);

  protected readonly user = this.authState.user;

  protected async signOut() {
    await this.authState.signOut();
    await this.router.navigate(['/sign-in']);
  }
}
