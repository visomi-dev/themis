import { Component, computed, input } from '@angular/core';

import { uiClass } from '../../classes';

type CardPadding = 'sm' | 'md' | 'lg';
type CardTone = 'default' | 'raised' | 'ghost';

const cardPadding = Object.freeze({
  sm: /* tw */ 'p-3 md:p-4',
  md: /* tw */ 'p-4 md:p-6',
  lg: /* tw */ 'p-5 md:p-8',
});

const cardTones = Object.freeze({
  default: /* tw */ 'bg-panel',
  ghost: /* tw */ 'bg-transparent',
  raised: /* tw */ 'bg-panel-raised shadow-panel',
});

@Component({
  host: {
    class: /* tw */ 'block',
  },
  selector: 'app-card',
  templateUrl: './card.html',
  styleUrl: './card.css',
})
export class Card {
  readonly cardId = input<string | null>(null);
  readonly padding = input<CardPadding>('md');
  readonly tone = input<CardTone>('default');

  readonly classes = computed(() =>
    uiClass(
      'flex flex-col gap-4 rounded-[var(--radius-panel)] text-fg',
      cardPadding[this.padding()],
      cardTones[this.tone()],
    ),
  );
}
