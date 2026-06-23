import { Component, computed, input } from '@angular/core';

import { uiClass } from '../../classes';

type AlertTone = 'info' | 'success' | 'warning' | 'danger';

const alertTones = Object.freeze({
  info: /* tw */ 'border-primary/20 bg-primary-container/20 text-fg',
  success: /* tw */ 'border-success/20 bg-success-container/20 text-fg',
  warning: /* tw */ 'border-tertiary/20 bg-tertiary-container/20 text-fg',
  danger: /* tw */ 'border-danger/20 bg-error-container/20 text-fg',
});

@Component({
  host: { class: /* tw */ 'block' },
  selector: 'app-alert',
  templateUrl: './alert.html',
  styleUrl: './alert.css',
})
export class Alert {
  readonly tone = input<AlertTone>('info');

  readonly classes = computed(() =>
    uiClass('rounded-[var(--radius-panel)] border p-4 text-sm', alertTones[this.tone()]),
  );
}
