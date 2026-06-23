import { Signal, Injectable, signal } from '@angular/core';

import { Realtime } from './realtime';
import type { AsyncJobEvent } from './realtime.models';

@Injectable()
export class ServerRealtime extends Realtime {
  private readonly $connected: import('@angular/core').WritableSignal<boolean> = signal(false);
  private readonly $lastEvent: import('@angular/core').WritableSignal<AsyncJobEvent | null> =
    signal<AsyncJobEvent | null>(null);

  readonly connected: Signal<boolean> = this.$connected.asReadonly();
  readonly lastEvent: Signal<AsyncJobEvent | null> = this.$lastEvent.asReadonly();
}
