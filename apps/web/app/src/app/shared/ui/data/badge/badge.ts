import { Component, computed, input } from '@angular/core';

import { uiClass } from '../../classes';

type BadgeTone = 'default' | 'accent' | 'danger' | 'success' | 'warning';

const badgeTones = Object.freeze({
  default: /* tw */ 'bg-panel-raised text-fg',
  accent: /* tw */ 'bg-primary-container/40 text-primary',
  danger: /* tw */ 'bg-error-container/40 text-danger',
  success: /* tw */ 'bg-success-container/40 text-success',
  warning: /* tw */ 'bg-tertiary-container/40 text-tertiary',
});

@Component({
  host: { class: /* tw */ 'inline-flex' },
  selector: 'app-badge',
  templateUrl: './badge.html',
  styleUrl: './badge.css',
})
export class Badge {
  readonly tone = input<BadgeTone>('default');

  readonly classes = computed(() =>
    uiClass('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold', badgeTones[this.tone()]),
  );
}
