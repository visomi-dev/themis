import { booleanAttribute, Component, computed, input } from '@angular/core';

import { Icon } from '../../media/icon/icon';
import { uiClass } from '../../classes';

@Component({
  host: {
    class: /* tw */ 'block',
  },
  imports: [Icon],
  selector: 'app-error-message',
  templateUrl: './error-message.html',
  styleUrl: './error-message.css',
})
export class ErrorMessage {
  readonly controlId = input<string | null>(null);
  readonly withIcon = input(true, { transform: booleanAttribute });

  readonly classes = computed(() =>
    uiClass('text-danger mt-1 inline-flex items-start gap-1.5 text-sm font-medium', this.withIcon() && 'pl-0'),
  );
}
