import { Component, inject } from '@angular/core';

import { ThemeService } from '../core/theme/theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  template: `
    <button class="theme-toggle" type="button" (click)="theme.toggleTheme()">
      <span class="sr-only">Toggle theme</span>
      <i class="pi" [class.pi-moon]="!theme.isDark()" [class.pi-sun]="theme.isDark()"></i>
    </button>
  `,
})
export class ThemeToggleComponent {
  readonly theme = inject(ThemeService);
}
