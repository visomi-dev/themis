import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Component, PLATFORM_ID, effect, inject } from '@angular/core';

import { Settings } from '../../settings';

@Component({
  host: {
    class: 'hidden',
  },
  selector: 'app-theme-init',
  templateUrl: './theme-init.html',
  styleUrl: './theme-init.css',
})
export class ThemeInit {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly settings = inject(Settings);

  readonly syncThemeClassEffect = effect(() => {
    const isDark = this.settings.isDark();

    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.document.documentElement.classList.toggle('dark', isDark);
  });
}
