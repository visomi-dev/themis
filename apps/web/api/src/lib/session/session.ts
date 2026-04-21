import connectPgSimple from 'connect-pg-simple';
import session, { MemoryStore, type SessionOptions, type Store } from 'express-session';
import type { Pool } from 'pg';

import type { AuthConfig } from '../config/auth-config.js';

type SessionConfig = Pick<AuthConfig, 'cookieSecure' | 'databaseDriver' | 'sessionMaxAgeMs' | 'sessionSecret'>;

const globalKey = '__themisSessionStore';
const globalState = globalThis as typeof globalThis & {
  [globalKey]?: Store;
};

const createSessionStore = (config: SessionConfig, pool?: Pool) => {
  if (globalState[globalKey]) {
    return globalState[globalKey] as Store;
  }

  const store =
    config.databaseDriver === 'memory'
      ? new MemoryStore()
      : new (connectPgSimple(session))({
          pool,
          createTableIfMissing: true,
          tableName: 'user_sessions',
        });

  globalState[globalKey] = store;

  return store;
};

const createSessionMiddleware = (config: SessionConfig, store: Store) =>
  session({
    cookie: {
      httpOnly: true,
      maxAge: config.sessionMaxAgeMs,
      sameSite: 'lax',
      secure: config.cookieSecure,
    },
    resave: false,
    rolling: true,
    saveUninitialized: false,
    secret: config.sessionSecret,
    store,
  } satisfies SessionOptions);

export { createSessionMiddleware, createSessionStore };
