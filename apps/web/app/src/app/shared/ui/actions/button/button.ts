import { booleanAttribute, Component, computed, input } from '@angular/core';

import { uiClass } from '../../classes';

type ButtonVariant = 'solid' | 'outline' | 'plain';
type ButtonTone = 'default' | 'accent' | 'danger' | 'success' | 'warning';
type ButtonSize = 'sm' | 'md' | 'lg';

const buttonBase =
  /* tw */ 'ui-focus-ring relative isolate inline-flex items-center justify-center gap-x-2 rounded-[var(--radius-control)] font-semibold transition disabled:pointer-events-none disabled:opacity-50 aria-busy:cursor-wait [&_[data-slot=icon]]:size-5';

const buttonVariants = Object.freeze({
  solid: /* tw */ 'shadow-sm',
  outline: /* tw */ 'border border-outline/30 bg-transparent shadow-[inset_0_1px_rgb(255_255_255/0.08)]',
  plain: /* tw */ 'bg-transparent shadow-none',
});

const buttonTones = Object.freeze({
  default: /* tw */ 'bg-panel-raised text-fg hover:bg-surface-container-highest',
  accent: /* tw */ 'bg-accent text-accent-fg hover:brightness-95',
  danger: /* tw */ 'bg-danger text-on-error hover:brightness-95',
  success: /* tw */ 'bg-success text-on-success hover:brightness-95',
  warning: /* tw */ 'bg-tertiary text-on-tertiary hover:brightness-95',
});

const outlineTones = Object.freeze({
  default: /* tw */ 'text-fg hover:bg-panel-raised',
  accent: /* tw */ 'text-accent hover:bg-primary-container/20',
  danger: /* tw */ 'text-danger hover:bg-error-container/20',
  success: /* tw */ 'text-success hover:bg-success-container/20',
  warning: /* tw */ 'text-tertiary hover:bg-tertiary-container/20',
});

const buttonSizes = Object.freeze({
  sm: /* tw */ 'min-h-9 px-3 py-1.5 text-sm',
  md: /* tw */ 'min-h-11 px-4 py-2 text-sm',
  lg: /* tw */ 'min-h-12 px-5 py-2.5 text-base',
});

@Component({
  host: {
    class: /* tw */ 'inline-block',
  },
  selector: 'app-button',
  templateUrl: './button.html',
  styleUrl: './button.css',
})
export class Button {
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly loading = input(false, { transform: booleanAttribute });
  readonly size = input<ButtonSize>('md');
  readonly tone = input<ButtonTone>('default');
  readonly type = input<'button' | 'reset' | 'submit'>('button');
  readonly variant = input<ButtonVariant>('solid');

  readonly classes = computed(() => {
    const variant = this.variant();

    return uiClass(
      buttonBase,
      buttonVariants[variant],
      buttonSizes[this.size()],
      variant === 'solid' ? buttonTones[this.tone()] : outlineTones[this.tone()],
    );
  });
}
