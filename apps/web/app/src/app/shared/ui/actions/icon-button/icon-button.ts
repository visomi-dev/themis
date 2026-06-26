import { booleanAttribute, Component, computed, input } from '@angular/core';

import { uiClass } from '../../classes';

type IconButtonVariant = 'solid' | 'outline' | 'plain';
type IconButtonTone = 'zinc' | 'blue' | 'red' | 'green' | 'amber';
type IconButtonSize = 'sm' | 'md' | 'lg';

const toneAliases: Record<string, IconButtonTone> = {
  default: 'zinc',
  accent: 'blue',
  danger: 'red',
  success: 'green',
  warning: 'amber',
};

const iconButtonBase =
  /* tw */ 'ui-focus-ring ui-touch-target relative isolate inline-flex items-center justify-center rounded-[var(--radius-control)] font-semibold transition disabled:pointer-events-none disabled:opacity-50 [&_[data-slot=icon]]:size-5';

const iconButtonSolid = /* tw */ [
  'border-transparent shadow-sm',
  'bg-(--btn-border) before:absolute before:inset-0 before:-z-10 before:rounded-[calc(var(--radius-control)-1px)] before:bg-(--btn-bg) before:shadow-sm',
  'after:absolute after:inset-0 after:-z-10 after:rounded-[calc(var(--radius-control)-1px)] after:shadow-[inset_0_1px_rgb(255_255_255/0.15)]',
  'data-[hover]:after:bg-(--btn-hover-overlay) data-[active]:after:bg-(--btn-hover-overlay) hover:after:bg-(--btn-hover-overlay) active:after:bg-(--btn-hover-overlay)',
  'disabled:before:shadow-none disabled:after:shadow-none',
].join(' ');

const iconButtonOutline = /* tw */ 'border border-[color:var(--color-border)] bg-transparent';
const iconButtonPlain = /* tw */ 'bg-transparent shadow-none';

const iconButtonTones = Object.freeze({
  zinc: /* tw */ '[--btn-bg:var(--color-panel-raised)] [--btn-border:var(--color-border)] [--btn-fg:var(--color-fg)] [--btn-hover-overlay:rgb(9_9_11/0.06)] text-fg hover:[--btn-bg:var(--color-bg)]',
  blue: /* tw */ '[--btn-bg:var(--color-accent)] [--btn-border:var(--color-accent)] [--btn-fg:var(--color-accent-fg)] [--btn-hover-overlay:rgb(255_255_255/0.12)] text-accent-fg',
  red: /* tw */ '[--btn-bg:var(--color-danger)] [--btn-border:var(--color-danger)] [--btn-fg:var(--color-danger-fg)] [--btn-hover-overlay:rgb(255_255_255/0.12)] text-danger-fg',
  green:
    /* tw */ '[--btn-bg:var(--color-success)] [--btn-border:var(--color-success)] [--btn-fg:var(--color-on-success)] [--btn-hover-overlay:rgb(255_255_255/0.12)] text-on-success',
  amber:
    /* tw */ '[--btn-bg:var(--color-tertiary)] [--btn-border:var(--color-tertiary)] [--btn-fg:var(--color-on-tertiary)] [--btn-hover-overlay:rgb(255_255_255/0.12)] text-on-tertiary',
});

const iconButtonSizes = Object.freeze({
  sm: /* tw */ 'size-9',
  md: /* tw */ 'size-11',
  lg: /* tw */ 'size-12',
});

function resolveTone(value: string): IconButtonTone {
  return toneAliases[value] ?? (value as IconButtonTone);
}

@Component({
  host: {
    class: /* tw */ 'inline-block',
  },
  selector: 'app-icon-button',
  templateUrl: './icon-button.html',
  styleUrl: './icon-button.css',
})
export class IconButton {
  readonly ariaLabel = input.required<string>();
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly size = input<IconButtonSize>('md');
  readonly tone = input<string>('zinc');
  readonly type = input<'button' | 'reset' | 'submit'>('button');
  readonly variant = input<IconButtonVariant>('plain');

  readonly classes = computed(() => {
    const variant = this.variant();
    const tone = resolveTone(this.tone());

    if (variant === 'solid') {
      return uiClass(iconButtonBase, iconButtonSolid, iconButtonTones[tone], iconButtonSizes[this.size()]);
    }

    if (variant === 'outline') {
      return uiClass(iconButtonBase, iconButtonOutline, iconButtonTones[tone], iconButtonSizes[this.size()]);
    }

    return uiClass(iconButtonBase, iconButtonPlain, iconButtonTones[tone], iconButtonSizes[this.size()]);
  });
}
