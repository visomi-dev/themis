import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { Auth } from '../auth/auth';

const socketMocks = vi.hoisted(() => {
  const disconnectSocket = vi.fn();
  const on = vi.fn();
  const socketFactory = vi.fn(() => ({
    connected: true,
    disconnect: disconnectSocket,
    on,
  }));

  return { disconnectSocket, on, socketFactory };
});

vi.mock('socket.io-client', () => ({
  io: socketMocks.socketFactory,
}));

import { Realtime } from './realtime';

describe('Realtime', () => {
  const userState = signal<{ email: string; emailVerifiedAt: string | null; id: string } | null>(null);

  beforeEach(() => {
    userState.set(null);
    socketMocks.socketFactory.mockClear();
    socketMocks.on.mockClear();
    socketMocks.disconnectSocket.mockClear();

    TestBed.configureTestingModule({
      providers: [
        Realtime,
        {
          provide: Auth,
          useValue: {
            user: userState.asReadonly(),
          },
        },
      ],
    });
  });

  it('connects when an authenticated user is available', () => {
    TestBed.inject(Realtime);

    userState.set({ email: 'engineer@themis.dev', emailVerifiedAt: '2026-01-01T00:00:00.000Z', id: 'user-1' });
    TestBed.flushEffects();

    expect(socketMocks.socketFactory).toHaveBeenCalledWith('/', expect.objectContaining({ path: '/socket.io' }));
  });

  it('disconnects when the authenticated user becomes null', () => {
    TestBed.inject(Realtime);

    userState.set({ email: 'engineer@themis.dev', emailVerifiedAt: '2026-01-01T00:00:00.000Z', id: 'user-1' });
    TestBed.flushEffects();
    userState.set(null);
    TestBed.flushEffects();

    expect(socketMocks.disconnectSocket).toHaveBeenCalled();
  });
});
