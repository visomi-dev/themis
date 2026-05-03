import { Component, computed, inject, input, output, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import type { MenuItem } from 'primeng/api';
import { MenuModule } from 'primeng/menu';

import { Auth } from '../../auth/auth';
import { DASHBOARD_URL, PROJECT_NEW_URL, PROJECTS_URL, SIGN_IN_URL } from '../../constants/routes';
import { Settings } from '../../settings';

type LayoutNavItem = {
  children?: LayoutNavItem[];
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
  imports: [MenuModule, RouterLink, RouterLinkActive],
  selector: 'app-sidebar-menu',
  templateUrl: './sidebar-menu.html',
  styleUrl: './sidebar-menu.css',
})
export class SidebarMenu {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly settings = inject(Settings);

  readonly DASHBOARD_URL = DASHBOARD_URL;
  readonly collapsed = input(false);
  readonly mobileMenuOpen = input(false);
  readonly closed = output<void>();
  readonly toggleCollapsed = output<void>();
  readonly signingOut = signal(false);
  readonly isDark = this.settings.isDark;
  readonly user = this.auth.user;

  readonly userInitials = computed(() => {
    const email = this.user()?.email ?? 'T';

    return email.slice(0, 2).toUpperCase();
  });
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
          children: [
            {
              exact: true,
              icon: 'pi pi-plus',
              label: $localize`:@@layoutMenuNewProject:New project`,
              url: PROJECT_NEW_URL,
            },
          ],
          exact: false,
          icon: 'pi pi-folder',
          label: $localize`:@@layoutMenuProjects:Projects`,
          url: PROJECTS_URL,
        },
      ],
    },
  ];

  readonly userMenuItems = computed<MenuItem[]>(() => [
    {
      disabled: this.signingOut(),
      icon: 'pi pi-sign-out',
      label: $localize`:@@layoutSignOutLabel:Sign out`,
      command: () => {
        void this.signOut();
      },
    },
  ]);

  closeMenu() {
    this.closed.emit();
  }

  toggleTheme() {
    this.settings.toggleTheme();
  }

  async signOut() {
    this.signingOut.set(true);

    try {
      await this.auth.signOut();
      await this.router.navigateByUrl(SIGN_IN_URL);
    } finally {
      this.signingOut.set(false);
      this.closeMenu();
    }
  }
}
