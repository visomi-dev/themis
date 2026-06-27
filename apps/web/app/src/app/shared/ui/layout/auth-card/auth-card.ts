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
      'mx-auto w-full max-w-[27.5rem] rounded-[var(--radius-panel)] border border-zinc-950/10 dark:border-white/10 px-5 py-6 shadow-sm sm:px-8 sm:py-8 md:px-10 md:py-10',
      this.tone() === 'raised' ? 'bg-zinc-100 dark:bg-zinc-800' : 'bg-zinc-50 dark:bg-zinc-900',
    ),
  );
}
