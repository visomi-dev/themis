import { Component, computed, input } from '@angular/core';

import { uiClass } from '../../classes';

type AuthCardTone = 'panel' | 'raised';

@Component({
  host: {
    class: /* tw */ 'block w-full',
  },
  selector: 'app-auth-card',
  templateUrl: './auth-card.html',
  styleUrl: './auth-card.css',
})
export class AuthCard {
  readonly cardId = input<string | null>(null);
  readonly tone = input<AuthCardTone>('panel');

  readonly classes = computed(() =>
    uiClass(
      'mx-auto w-full max-w-[27.5rem] rounded-[var(--radius-panel)] border border-outline-variant/60 px-[1.375rem] py-7 shadow-sm md:px-10 md:py-10',
      this.tone() === 'raised' ? 'bg-panel-raised' : 'bg-panel',
    ),
  );
}
