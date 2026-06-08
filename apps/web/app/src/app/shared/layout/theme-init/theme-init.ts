import { DOCUMENT } from '@angular/common';
import { Component, afterNextRender, effect, inject } from '@angular/core';

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
  private readonly settings = inject(Settings);

  readonly syncThemeClassEffect = afterNextRender(() => {
    effect(() => {
      const isDark = this.settings.isDark();

      this.document.documentElement.classList.toggle('dark', isDark);
    });
  });
}
