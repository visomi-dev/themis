import { Component, inject } from '@angular/core';

import { Settings } from '../../settings';

@Component({
  host: {
    class: /* tw */ 'contents',
  },
  selector: 'app-theme-switcher',
  templateUrl: './theme-switcher.html',
  styleUrl: './theme-switcher.css',
})
export class ThemeSwitcher {
  readonly settings = inject(Settings);
}
