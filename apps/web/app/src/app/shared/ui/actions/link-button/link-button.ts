import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { uiClass } from '../../classes';

type LinkButtonVariant = 'solid' | 'outline' | 'plain';
type LinkButtonTone = 'zinc' | 'blue' | 'red' | 'green' | 'amber';
type LinkButtonSize = 'sm' | 'md' | 'lg';

const toneAliases: Record<string, LinkButtonTone> = {
  default: 'zinc',
  accent: 'blue',
  danger: 'red',
  success: 'green',
  warning: 'amber',
};

const linkButtonBase =
  /* tw */ 'ui-focus-ring relative isolate inline-flex items-center justify-center gap-x-2 rounded-[var(--radius-control)] font-semibold transition [&_[data-slot=icon]]:size-5';

const linkButtonSolid = /* tw */ [
  'border-transparent shadow-sm',
  'bg-(--btn-border) before:absolute before:inset-0 before:-z-10 before:rounded-[calc(var(--radius-control)-1px)] before:bg-(--btn-bg) before:shadow-sm',
  'after:absolute after:inset-0 after:-z-10 after:rounded-[calc(var(--radius-control)-1px)] after:shadow-[inset_0_1px_rgb(255_255_255/0.15)]',
  'data-[hover]:after:bg-(--btn-hover-overlay) data-[active]:after:bg-(--btn-hover-overlay) hover:after:bg-(--btn-hover-overlay) active:after:bg-(--btn-hover-overlay)',
].join(' ');

const linkButtonOutline = /* tw */ 'border border-[color:var(--color-border)] bg-transparent';
const linkButtonPlain = /* tw */ 'bg-transparent shadow-none';

const linkButtonTones = Object.freeze({
  zinc: /* tw */ '[--btn-bg:var(--color-panel-raised)] [--btn-border:var(--color-border)] [--btn-fg:var(--color-fg)] [--btn-hover-overlay:rgb(9_9_11/0.06)] text-fg hover:[--btn-bg:var(--color-bg)]',
  blue: /* tw */ '[--btn-bg:var(--color-accent)] [--btn-border:var(--color-accent)] [--btn-fg:var(--color-accent-fg)] [--btn-hover-overlay:rgb(255_255_255/0.12)] text-accent-fg',
  red: /* tw */ '[--btn-bg:var(--color-danger)] [--btn-border:var(--color-danger)] [--btn-fg:var(--color-danger-fg)] [--btn-hover-overlay:rgb(255_255_255/0.12)] text-danger-fg',
  green:
    /* tw */ '[--btn-bg:var(--color-success)] [--btn-border:var(--color-success)] [--btn-fg:var(--color-on-success)] [--btn-hover-overlay:rgb(255_255_255/0.12)] text-on-success',
  amber:
    /* tw */ '[--btn-bg:var(--color-tertiary)] [--btn-border:var(--color-tertiary)] [--btn-fg:var(--color-on-tertiary)] [--btn-hover-overlay:rgb(255_255_255/0.12)] text-on-tertiary',
});

const linkButtonSizes = Object.freeze({
  sm: /* tw */ 'min-h-9 px-3 py-1.5 text-sm',
  md: /* tw */ 'min-h-11 px-4 py-2 text-sm',
  lg: /* tw */ 'min-h-12 px-5 py-2.5 text-base',
});

function resolveTone(value: string): LinkButtonTone {
  return toneAliases[value] ?? (value as LinkButtonTone);
}

@Component({
  host: {
    class: /* tw */ 'inline-block',
  },
  imports: [RouterLink],
  selector: 'app-link-button',
  templateUrl: './link-button.html',
  styleUrl: './link-button.css',
})
export class LinkButton {
  readonly ariaLabel = input<string | null>(null);
  readonly href = input<string | null>(null);
  readonly routerLink = input<unknown[] | string | null>(null);
  readonly size = input<LinkButtonSize>('md');
  readonly target = input<string | null>(null);
  readonly text = input.required<string>();
  readonly tone = input<string>('blue');
  readonly variant = input<LinkButtonVariant>('solid');

  readonly classes = computed(() => {
    const variant = this.variant();
    const tone = resolveTone(this.tone());

    if (variant === 'solid') {
      return uiClass(linkButtonBase, linkButtonSolid, linkButtonTones[tone], linkButtonSizes[this.size()]);
    }

    if (variant === 'outline') {
      return uiClass(linkButtonBase, linkButtonOutline, linkButtonTones[tone], linkButtonSizes[this.size()]);
    }

    return uiClass(linkButtonBase, linkButtonPlain, linkButtonTones[tone], linkButtonSizes[this.size()]);
  });
}
