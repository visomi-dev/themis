import { createRealtimeServer } from './socket';
import { realtimeBus } from './realtime-bus';
const engineUse = jest.fn();
const emitToRoom = jest.fn();
const join = jest.fn();
const on = jest.fn();
const to = jest.fn(() => ({ emit: emitToRoom }));

let connectionHandler: ((socket: { data: { userId: string }; join: typeof join }) => void) | undefined;
let authMiddleware:
  | ((
      socket: { request: { session?: { passport?: { user?: { id?: string } } } }; data: Record<string, unknown> },
      next: (error?: Error) => void,
    ) => void)
  | undefined;

jest.mock('socket.io', () => ({
  Server: jest.fn().mockImplementation(() => ({
    engine: { use: engineUse },
    on: jest.fn((event: string, handler: (...args: never[]) => void) => {
      if (event === 'connection') {
        connectionHandler = handler as never;
      }
      on(event, handler);
    }),
    to,
    use: jest.fn((handler: typeof authMiddleware) => {
      authMiddleware = handler;
    }),
  })),
}));

jest.mock('./session', () => ({
  createSessionMiddleware: jest.fn(() => (_req: unknown, _res: unknown, next: () => void) => next()),
  createSessionStore: jest.fn(() => ({ store: true })),
}));

jest.mock('./config', () => ({
  getRealtimeConfig: jest.fn(() => ({
    appBaseUrl: 'http://localhost:8080/app',
    cookieSecure: false,
    databaseDriver: 'memory',
    realtimePath: '/socket.io',
    sessionMaxAgeMs: 1000,
    sessionSecret: 'secret',
  })),
}));

jest.mock('./pool', () => ({
  getRealtimePool: jest.fn(),
}));

describe('createRealtimeServer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    connectionHandler = undefined;
    authMiddleware = undefined;
  });

  it('authenticates a socket from the shared session and joins the user room', () => {
    createRealtimeServer({} as never);

    const socket = {
      data: {},
      request: {
        session: {
          passport: {
            user: { id: 'user-1' },
          },
        },
      },
    } as { data: Record<string, unknown>; request: { session?: { passport?: { user?: { id?: string } } } } };
    const next = jest.fn();

    authMiddleware?.(socket, next);
    connectionHandler?.({ data: { userId: 'user-1' }, join } as never);

    expect(next).toHaveBeenCalledWith();
    expect(join).toHaveBeenCalledWith('user:user-1');
  });

  it('relays async-job events to the authenticated user room', () => {
    createRealtimeServer({} as never);

    realtimeBus.emit('async-job', {
      eventName: 'job:progress',
      job: {
        completedAt: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        errorMessage: null,
        id: 'job-1',
        progress: 55,
        projectId: 'project-1',
        resultJson: null,
        status: 'running',
        type: 'project_seed',
        updatedAt: '2026-01-01T00:00:00.000Z',
        userId: 'user-1',
      },
      message: 'Halfway there',
      timestamp: '2026-01-01T00:00:00.000Z',
    });

    expect(to).toHaveBeenCalledWith('user:user-1');
    expect(emitToRoom).toHaveBeenCalledWith(
      'job:progress',
      expect.objectContaining({
        message: 'Halfway there',
      }),
    );
  });
});
