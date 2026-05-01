import { Component, inject, output } from '@angular/core';

import { Settings } from '../../settings';

@Component({
  imports: [],
  selector: 'app-topbar',
  templateUrl: './topbar.html',
  styleUrl: './topbar.css',
})
export class Topbar {
  private readonly settings = inject(Settings);

  readonly openMobileMenu = output<void>();
  readonly isDark = this.settings.isDark;

  toggleTheme() {
    this.settings.toggleTheme();
  }
}