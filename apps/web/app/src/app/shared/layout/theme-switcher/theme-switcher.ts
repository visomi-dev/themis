import { Component, inject } from '@angular/core';

import { Icon } from '../../ui/media/icon/icon';
import { Settings } from '../../settings';

@Component({
  host: {
    class: /* tw */ 'contents',
  },
  imports: [Icon],
  selector: 'app-theme-switcher',
  templateUrl: './theme-switcher.html',
  styleUrl: './theme-switcher.css',
})
export class ThemeSwitcher {
  readonly settings = inject(Settings);
}
