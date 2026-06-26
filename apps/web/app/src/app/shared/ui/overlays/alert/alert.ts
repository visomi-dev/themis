import { Component, computed, input } from '@angular/core';

import { type IconName } from '../../media/icon/icon-paths';
import { Icon } from '../../media/icon/icon';
import { uiClass } from '../../classes';

type AlertTone = 'info' | 'success' | 'warning' | 'danger';
type AlertVariant = 'default' | 'auth';

const alertTones = Object.freeze({
  auth: {
    danger: /* tw */ 'border-danger/20 bg-danger/10 text-danger',
    info: /* tw */ 'border-primary/20 bg-primary/10 text-primary',
    success: /* tw */ 'border-success/20 bg-success/10 text-success',
    warning: /* tw */ 'border-warning/20 bg-warning/10 text-warning',
  },
  default: {
    danger: /* tw */ 'border-danger/20 bg-error-container/20 text-fg',
    info: /* tw */ 'border-primary/20 bg-primary-container/20 text-fg',
    success: /* tw */ 'border-success/20 bg-success-container/20 text-fg',
    warning: /* tw */ 'border-tertiary/20 bg-tertiary-container/20 text-fg',
  },
});

const alertIcons = Object.freeze({
  danger: 'circle-alert',
  info: 'circle-info',
  success: 'circle-check',
  warning: 'circle-alert',
} satisfies Record<AlertTone, IconName>);

@Component({
  host: { class: /* tw */ 'block' },
  imports: [Icon],
  selector: 'app-alert',
  templateUrl: './alert.html',
  styleUrl: './alert.css',
})
export class Alert {
  readonly tone = input<AlertTone>('info');
  readonly variant = input<AlertVariant>('auth');

  readonly classes = computed(() => {
    const tone = this.tone();
    const variant = this.variant();
    const base =
      variant === 'auth'
        ? 'rounded-[var(--radius-control)] border px-3.5 py-2.5 text-sm font-medium'
        : 'rounded-[var(--radius-panel)] border p-4 text-sm';

    return uiClass(base, alertTones[variant][tone]);
  });

  readonly iconName = computed(() => alertIcons[this.tone()]);
  readonly role = computed(() => (this.tone() === 'danger' ? 'alert' : 'status'));
  readonly showIcon = computed(() => this.variant() === 'auth');
}
