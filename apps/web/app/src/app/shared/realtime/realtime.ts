import { isPlatformServer } from '@angular/common';
import { PLATFORM_ID, effect, inject, Injectable, signal } from '@angular/core';
import { io, Socket } from 'socket.io-client';

import { Auth } from '../auth/auth';

import type { AsyncJobEvent } from './realtime.models';

@Injectable({ providedIn: 'root' })
export class Realtime {
  private readonly auth = inject(Auth);
  private readonly platformId = inject(PLATFORM_ID);

  private socket: Socket | null = null;
  private readonly lastEventState = signal<AsyncJobEvent | null>(null);
  private readonly connectedState = signal(false);

  readonly connected = this.connectedState.asReadonly();
  readonly lastEvent = this.lastEventState.asReadonly();

  readonly authEffect = effect(() => {
    const user = this.auth.user();

    if (isPlatformServer(this.platformId)) {
      return;
    }

    if (!user) {
      this.disconnect();
      
      return;
    }

    this.connect();
  });

  private connect() {
    if (this.socket?.connected) {
      return;
    }

    this.socket?.disconnect();
    this.socket = io('/', {
      autoConnect: true,
      path: '/socket.io',
      transports: ['websocket'],
      withCredentials: true,
    });

    this.socket.on('connect', () => this.connectedState.set(true));
    this.socket.on('disconnect', () => this.connectedState.set(false));

    for (const name of ['job:queued', 'job:started', 'job:progress', 'job:completed', 'job:failed'] as const) {
      this.socket.on(name, (event: AsyncJobEvent) => this.lastEventState.set(event));
    }
  }

  private disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.connectedState.set(false);
    this.lastEventState.set(null);
  }
}
