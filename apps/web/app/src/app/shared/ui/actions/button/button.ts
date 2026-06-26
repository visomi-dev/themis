import { booleanAttribute, Component, computed, input } from '@angular/core';

import { uiClass } from '../../classes';

type ButtonVariant = 'solid' | 'outline' | 'plain';
type ButtonTone = 'zinc' | 'blue' | 'red' | 'green' | 'amber';
type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Tone aliases map the legacy Material 3 names to the Catalyst color names.
 * Deprecated tones still resolve to the same visual result so existing callers
 * do not have to migrate in lockstep with this PR.
 */
const toneAliases: Record<string, ButtonTone> = {
  default: 'zinc',
  accent: 'blue',
  danger: 'red',
  success: 'green',
  warning: 'amber',
};

const buttonBase =
  /* tw */ 'ui-focus-ring ui-touch-target relative isolate inline-flex items-center justify-center gap-x-2 rounded-[var(--radius-control)] font-semibold transition disabled:pointer-events-none disabled:opacity-50 aria-busy:cursor-wait [&_[data-slot=icon]]:size-5';

/**
 * Solid buttons follow the Catalyst optical-border pattern: the `background`
 * is the `--btn-border` color (one shade darker than the visible fill), the
 * `before` pseudo-element renders the actual button color, and the `after`
 * pseudo-element handles the inset highlight shadow plus the hover overlay.
 */
const buttonSolid = /* tw */ [
  'border-transparent shadow-sm',
  'bg-(--btn-border) before:absolute before:inset-0 before:-z-10 before:rounded-[calc(var(--radius-control)-1px)] before:bg-(--btn-bg) before:shadow-sm',
  'after:absolute after:inset-0 after:-z-10 after:rounded-[calc(var(--radius-control)-1px)] after:shadow-[inset_0_1px_rgb(255_255_255/0.15)]',
  'data-[hover]:after:bg-(--btn-hover-overlay) data-[active]:after:bg-(--btn-hover-overlay) hover:after:bg-(--btn-hover-overlay) active:after:bg-(--btn-hover-overlay)',
  'disabled:before:shadow-none disabled:after:shadow-none',
].join(' ');

const buttonOutline = /* tw */ 'border border-[color:var(--color-border)] bg-transparent';
const buttonPlain = /* tw */ 'bg-transparent shadow-none';

const buttonTones = Object.freeze({
  zinc: /* tw */ '[--btn-bg:var(--color-panel-raised)] [--btn-border:var(--color-border)] [--btn-fg:var(--color-fg)] [--btn-hover-overlay:rgb(9_9_11/0.06)] text-fg hover:[--btn-bg:var(--color-bg)]',
  blue: /* tw */ '[--btn-bg:var(--color-accent)] [--btn-border:var(--color-accent)] [--btn-fg:var(--color-accent-fg)] [--btn-hover-overlay:rgb(255_255_255/0.12)] text-accent-fg',
  red: /* tw */ '[--btn-bg:var(--color-danger)] [--btn-border:var(--color-danger)] [--btn-fg:var(--color-danger-fg)] [--btn-hover-overlay:rgb(255_255_255/0.12)] text-danger-fg',
  green:
    /* tw */ '[--btn-bg:var(--color-success)] [--btn-border:var(--color-success)] [--btn-fg:var(--color-on-success)] [--btn-hover-overlay:rgb(255_255_255/0.12)] text-on-success',
  amber:
    /* tw */ '[--btn-bg:var(--color-tertiary)] [--btn-border:var(--color-tertiary)] [--btn-fg:var(--color-on-tertiary)] [--btn-hover-overlay:rgb(255_255_255/0.12)] text-on-tertiary',
});

const buttonSizes = Object.freeze({
  sm: /* tw */ 'min-h-9 px-3 py-1.5 text-sm',
  md: /* tw */ 'min-h-11 px-4 py-2 text-sm',
  lg: /* tw */ 'min-h-12 px-5 py-2.5 text-base',
});

function resolveTone(value: string): ButtonTone {
  return toneAliases[value] ?? (value as ButtonTone);
}

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
  readonly tone = input<string>('zinc');
  readonly type = input<'button' | 'reset' | 'submit'>('button');
  readonly variant = input<ButtonVariant>('solid');

  readonly classes = computed(() => {
    const variant = this.variant();
    const tone = resolveTone(this.tone());

    if (variant === 'solid') {
      return uiClass(buttonBase, buttonSolid, buttonTones[tone], buttonSizes[this.size()]);
    }

    if (variant === 'outline') {
      return uiClass(buttonBase, buttonOutline, buttonTones[tone], buttonSizes[this.size()]);
    }

    return uiClass(buttonBase, buttonPlain, buttonTones[tone], buttonSizes[this.size()]);
  });
}
