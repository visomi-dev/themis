import { Component, computed, inject, input, output, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

import { Auth } from '../../auth/auth';
import { DASHBOARD_URL, PROJECT_NEW_URL, PROJECTS_URL, SIGN_IN_URL } from '../../constants/routes';
import { Settings } from '../../settings';
import { Avatar } from '../../ui/data/avatar/avatar';
import { Dropdown } from '../../ui/overlays/dropdown/dropdown';
import { Icon } from '../../ui/media/icon/icon';
import { type IconName } from '../../ui/media/icon/icon-paths';
import { Listbox, type ListboxOption } from '../../ui/overlays/listbox/listbox';

type LayoutNavItem = {
  children?: LayoutNavItem[];
  exact: boolean;
  icon: IconName;
  label: string;
  url: string;
};

type LayoutNavSection = {
  label: string;
  items: LayoutNavItem[];
};

@Component({
  imports: [Avatar, Dropdown, Icon, Listbox, RouterLink, RouterLinkActive],
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
          icon: 'grid',
          label: $localize`:@@layoutMenuDashboard:Overview`,
          url: DASHBOARD_URL,
        },
        {
          children: [
            {
              exact: true,
              icon: 'plus',
              label: $localize`:@@layoutMenuNewProject:New project`,
              url: PROJECT_NEW_URL,
            },
          ],
          exact: false,
          icon: 'folder',
          label: $localize`:@@layoutMenuProjects:Projects`,
          url: PROJECTS_URL,
        },
      ],
    },
  ];

  readonly userMenuOptions = computed<ListboxOption[]>(() => [
    {
      disabled: this.signingOut(),
      label: $localize`:@@layoutSignOutLabel:Sign out`,
      value: 'sign-out',
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

  async handleUserMenuChange(value: string) {
    if (value === 'sign-out') {
      await this.signOut();
    }
  }
}
