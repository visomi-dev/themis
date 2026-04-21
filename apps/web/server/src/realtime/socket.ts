import type { Server as HttpServer, IncomingMessage, ServerResponse } from 'node:http';

import { Server } from 'socket.io';

import { getRealtimeConfig } from './config.js';
import { getRealtimePool } from './pool.js';
import { realtimeBus } from './realtime-bus.js';
import { createSessionMiddleware, createSessionStore } from './session.js';

const createRealtimeServer = (server: HttpServer) => {
  const config = getRealtimeConfig();
  const store = createSessionStore(config, config.databaseDriver === 'pg' ? getRealtimePool(config) : undefined);
  const sessionMiddleware = createSessionMiddleware(config, store);
  const io = new Server(server, {
    cors: {
      origin: config.appBaseUrl,
      credentials: true,
    },
    path: config.realtimePath,
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
    const userRoom = `user:${socket.data.userId}`;
    socket.join(userRoom);
  });

  realtimeBus.on('async-job', (event) => {
    io.to(`user:${event.job.userId}`).emit(event.eventName, event);
  });

  return io;
};

export { createRealtimeServer };
