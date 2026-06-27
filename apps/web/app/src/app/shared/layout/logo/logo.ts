import { Component, input } from '@angular/core';

import { Icon } from '../../ui/media/icon/icon';

type LogoVariant = 'isotype' | 'wordmark' | 'mark' | 'mark-name';

@Component({
  host: {
    class: /* tw */ 'contents',
  },
  imports: [Icon],
  selector: 'app-logo',
  templateUrl: './logo.html',
  styleUrl: './logo.css',
})
export class Logo {
  readonly variant = input<LogoVariant>('isotype');
}
