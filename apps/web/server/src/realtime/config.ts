type RealtimeConfig = {
  appBaseUrl: string;
  cookieSecure: boolean;
  databaseDriver: 'memory' | 'pg';
  databaseSsl: boolean;
  databaseUrl: string;
  realtimePath: string;
  sessionMaxAgeMs: number;
  sessionSecret: string;
};

const parseBoolean = (value: string | undefined, fallback = false) =>
  value === undefined ? fallback : value === 'true';

const getRealtimeConfig = (): RealtimeConfig => ({
  appBaseUrl: process.env['APP_BASE_URL'] ?? 'http://localhost:8080/app',
  cookieSecure: parseBoolean(process.env['COOKIE_SECURE'], process.env['NODE_ENV'] === 'production'),
  databaseDriver: (process.env['DATABASE_DRIVER'] as RealtimeConfig['databaseDriver'] | undefined) ?? 'pg',
  databaseSsl: parseBoolean(process.env['DATABASE_SSL']),
  databaseUrl: process.env['DATABASE_URL'] ?? 'postgresql://postgres:postgres@127.0.0.1:5432/themis',
  realtimePath: process.env['REALTIME_PATH'] ?? '/socket.io',
  sessionMaxAgeMs: Number(process.env['SESSION_MAX_AGE_MS'] ?? String(1000 * 60 * 60 * 24 * 7)),
  sessionSecret: process.env['SESSION_SECRET'] ?? 'themis-dev-session-secret',
});

export { getRealtimeConfig };
export type { RealtimeConfig };
