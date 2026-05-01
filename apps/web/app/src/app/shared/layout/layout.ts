import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { Auth } from '../auth/auth';
import { APP_URL } from '../constants/routes';
import { Settings } from '../settings';

import { MobileMenu } from './mobile-menu/mobile-menu';
import { SidebarMenu } from './sidebar-menu/sidebar-menu';
import { Topbar } from './topbar/topbar';

@Component({
  imports: [RouterOutlet, SidebarMenu, Topbar, MobileMenu],
  selector: 'app-layout',
  templateUrl: './layout.html',
  styleUrl: './layout.css',
})
export class Layout {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly settings = inject(Settings);

  private readonly navigationEnd = toSignal(
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)),
    {
      initialValue: null,
    },
  );

  readonly mobileMenuOpen = signal(false);

  readonly hideAppShell = computed(() => {
    this.navigationEnd();

    let route = this.router.routerState.snapshot.root;

    while (route.firstChild) {
      route = route.firstChild;
    }

    return route.data['hideAppShell'] === true;
  });

  readonly showAppShell = computed(() => this.auth.isAuthenticated() && !this.hideAppShell());
  readonly isDark = this.settings.isDark;
  readonly user = this.auth.user;

  openMobileMenu() {
    this.mobileMenuOpen.set(true);
  }

  closeMobileMenu() {
    this.mobileMenuOpen.set(false);
  }

  toggleTheme() {
    this.settings.toggleTheme();
  }

  async signOut() {
    try {
      await this.auth.signOut();
      await this.router.navigateByUrl(APP_URL);
    } finally {
      this.closeMobileMenu();
    }
  }
}