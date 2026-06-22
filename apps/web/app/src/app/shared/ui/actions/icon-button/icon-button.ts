import { booleanAttribute, Component, computed, input } from '@angular/core';

import { uiClass } from '../../classes';

type IconButtonVariant = 'solid' | 'outline' | 'plain';
type IconButtonSize = 'sm' | 'md' | 'lg';

const iconButtonBase =
  /* tw */ 'ui-focus-ring ui-touch-target inline-flex items-center justify-center rounded-[var(--radius-control)] font-semibold transition disabled:pointer-events-none disabled:opacity-50 [&_[data-slot=icon]]:size-5';
const iconButtonVariants = Object.freeze({
  solid: /* tw */ 'bg-accent text-accent-fg shadow-sm hover:brightness-95',
  outline: /* tw */ 'border border-outline/30 text-fg hover:bg-panel-raised',
  plain: /* tw */ 'text-muted-fg hover:bg-panel-raised hover:text-fg',
});
const iconButtonSizes = Object.freeze({
  sm: /* tw */ 'size-9',
  md: /* tw */ 'size-11',
  lg: /* tw */ 'size-12',
});

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
  readonly type = input<'button' | 'reset' | 'submit'>('button');
  readonly variant = input<IconButtonVariant>('plain');

  readonly classes = computed(() =>
    uiClass(iconButtonBase, iconButtonVariants[this.variant()], iconButtonSizes[this.size()]),
  );
}
