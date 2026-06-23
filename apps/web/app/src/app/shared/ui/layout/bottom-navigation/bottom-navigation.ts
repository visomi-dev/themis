import { Component, computed, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { uiClass } from '../../classes';

@Component({
  host: {
    class: /* tw */ 'block border-t border-outline-variant/40 bg-bg/95 backdrop-blur md:hidden',
  },
  selector: 'app-bottom-navigation',
  templateUrl: './bottom-navigation.html',
  styleUrl: './bottom-navigation.css',
})
export class BottomNavigation {}

@Component({
  host: {
    class: /* tw */ 'flex min-w-0 flex-1 items-center justify-center',
  },
  imports: [RouterLink, RouterLinkActive],
  selector: 'app-bottom-navigation-item',
  templateUrl: './bottom-navigation-item.html',
  styleUrl: './bottom-navigation.css',
})
export class BottomNavigationItem {
  readonly ariaLabel = input.required<string>();
  readonly routerLink = input.required<unknown[] | string>();

  readonly classes = computed(() =>
    uiClass(
      'ui-focus-ring flex min-h-12 min-w-12 items-center justify-center rounded-[var(--radius-control)] p-2 text-muted-fg transition hover:bg-panel-raised hover:text-fg [&_[data-slot=icon]]:size-6',
    ),
  );
}

@Component({
  host: {
    class: /* tw */ 'flex min-w-0 flex-1 items-center justify-center',
  },
  selector: 'app-bottom-navigation-action',
  templateUrl: './bottom-navigation-action.html',
  styleUrl: './bottom-navigation.css',
})
export class BottomNavigationAction {
  readonly ariaLabel = input.required<string>();
  readonly pressed = output<void>();

  readonly classes = computed(() =>
    uiClass(
      'ui-focus-ring flex min-h-12 min-w-12 items-center justify-center rounded-[var(--radius-control)] p-2 text-muted-fg transition hover:bg-panel-raised hover:text-fg [&_[data-slot=icon]]:size-6',
    ),
  );
}
