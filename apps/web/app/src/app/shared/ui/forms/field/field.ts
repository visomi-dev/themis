import { Component, computed, input } from '@angular/core';

import { uiClass } from '../../classes';

@Component({
  host: {
    class: /* tw */ 'block',
  },
  selector: 'app-field',
  templateUrl: './field.html',
  styleUrl: './field.css',
})
export class Field {
  readonly compact = input(false);

  readonly classes = computed(() => uiClass('grid', this.compact() ? 'gap-1.5' : 'gap-2'));
}
