import { Component, computed, input } from '@angular/core';

import { uiClass } from '../../classes';

type LabelTone = 'plain' | 'mono-uppercase';

const labelTones = Object.freeze({
  plain: /* tw */ 'text-zinc-950 dark:text-zinc-50 text-sm font-semibold',
  'mono-uppercase': /* tw */ 'text-zinc-500 dark:text-zinc-400 font-mono text-xs font-semibold tracking-widest uppercase',
});

@Component({
  host: {
    class: /* tw */ 'block',
  },
  selector: 'app-label',
  templateUrl: './label.html',
  styleUrl: './label.css',
})
export class Label {
  readonly for = input<string | null>(null);
  readonly tone = input<LabelTone>('mono-uppercase');

  readonly classes = computed(() => uiClass('block', labelTones[this.tone()]));
}
