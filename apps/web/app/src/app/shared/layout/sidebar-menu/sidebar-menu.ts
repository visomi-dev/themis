import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { Auth } from '../../auth/auth';
import { DASHBOARD_URL, PROJECT_NEW_URL, PROJECTS_URL } from '../../constants/routes';

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
  imports: [RouterLink, RouterLinkActive],
  selector: 'app-sidebar-menu',
  templateUrl: './sidebar-menu.html',
  styleUrl: './sidebar-menu.css',
})
export class SidebarMenu {
  private readonly auth = inject(Auth);

  readonly DASHBOARD_URL = DASHBOARD_URL;

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
}