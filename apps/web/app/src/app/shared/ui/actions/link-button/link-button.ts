import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { uiClass } from '../../classes';

type LinkButtonVariant = 'solid' | 'outline' | 'plain';
type LinkButtonSize = 'sm' | 'md' | 'lg';

const linkButtonBase =
  /* tw */ 'ui-focus-ring inline-flex items-center justify-center gap-x-2 rounded-[var(--radius-control)] font-semibold transition [&_[data-slot=icon]]:size-5';
const linkButtonVariants = Object.freeze({
  solid: /* tw */ 'bg-accent text-accent-fg shadow-sm hover:brightness-95',
  outline: /* tw */ 'border border-outline/30 text-fg hover:bg-panel-raised',
  plain: /* tw */ 'text-accent hover:bg-primary-container/20',
});
const linkButtonSizes = Object.freeze({
  sm: /* tw */ 'min-h-9 px-3 py-1.5 text-sm',
  md: /* tw */ 'min-h-11 px-4 py-2 text-sm',
  lg: /* tw */ 'min-h-12 px-5 py-2.5 text-base',
});

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
  readonly variant = input<LinkButtonVariant>('solid');

  readonly classes = computed(() =>
    uiClass(linkButtonBase, linkButtonVariants[this.variant()], linkButtonSizes[this.size()]),
  );
}
