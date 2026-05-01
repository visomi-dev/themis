import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';

import { Auth } from '../auth/auth';
import { APP_URL, DASHBOARD_URL, PROJECT_NEW_URL, PROJECTS_URL } from '../constants/routes';
import { Settings } from '../settings';

type LayoutNavItem = {
  exact: boolean;
  icon: string;
  label: string;
  url: string;
};

type LayoutNavSection = {
  label: string;
  items: LayoutNavItem[];
};

@Component({
  host: {
    class: /* tw */ 'block min-h-dvh w-full bg-surface text-on-surface',
  },
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
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
  readonly signingOut = signal(false);

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

  readonly navSections: LayoutNavSection[] = [
    {
      label: $localize`:@@layoutWorkspaceTitle:Workspace`,
      items: [
        {
          exact: true,
          icon: 'pi pi-th-large',
          label: $localize`:@@layoutMenuDashboard:Overview`,
          url: DASHBOARD_URL,
        },
        {
          exact: true,
          icon: 'pi pi-folder',
          label: $localize`:@@layoutMenuProjects:Projects`,
          url: PROJECTS_URL,
        },
        {
          exact: true,
          icon: 'pi pi-plus',
          label: $localize`:@@layoutMenuNewProject:New project`,
          url: PROJECT_NEW_URL,
        },
      ],
    },
  ];

  readonly userInitials = computed(() => {
    const email = this.user()?.email ?? 'T';

    return email.slice(0, 2).toUpperCase();
  });

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
    this.signingOut.set(true);

    try {
      await this.auth.signOut();
      await this.router.navigateByUrl(APP_URL);
    } finally {
      this.signingOut.set(false);
      this.closeMobileMenu();
    }
  }
}
