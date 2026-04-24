import type { IncomingMessage, Server as HttpServer, ServerResponse } from 'node:http';

import { Server } from 'socket.io';

import { getRealtimePool } from './pool';

import { createSessionMiddleware, createSessionStore, env, logger, realtimeBus } from 'web-shared';

function createRealtimeServer(server: HttpServer) {
  const sessionConfig = {
    cookieSecure: env.COOKIE_SECURE,
    databaseDriver: env.DATABASE_DRIVER,
    sessionMaxAgeMs: env.SESSION_MAX_AGE_MS,
    sessionSecret: env.SESSION_SECRET,
  };
  const store = createSessionStore(sessionConfig, env.DATABASE_DRIVER === 'pg' ? getRealtimePool() : undefined);
  const sessionMiddleware = createSessionMiddleware(sessionConfig, store);
  const io = new Server(server, {
    cors: {
      credentials: true,
      origin: env.APP_BASE_URL,
    },
    path: env.REALTIME_PATH,
  });

  io.engine.use((req: IncomingMessage, res: ServerResponse, next: (error?: Error) => void) =>
    sessionMiddleware(req as never, res as never, next as never),
  );

  io.use((socket, next) => {
    const request = socket.request as typeof socket.request & {
      session?: { passport?: { user?: { id?: string } } };
    };
    const userId = request.session?.passport?.user?.id;

    if (!userId) {
      next(new Error('Unauthorized'));
      return;
    }

    socket.data.userId = userId;
    next();
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.data.userId}`);
  });

  realtimeBus.on('async-job', (event) => {
    io.to(`user:${event.job.userId}`).emit(event.eventName, event);
  });

  logger.info({ path: env.REALTIME_PATH }, 'Realtime server ready');

  return io;
}

export { createRealtimeServer };
