import { Pool } from 'pg';

import type { RealtimeConfig } from './config.js';

let pool: Pool | undefined;

const getRealtimePool = (config: RealtimeConfig) => {
  pool ??= new Pool({
    connectionString: config.databaseUrl,
    ssl: config.databaseSsl ? { rejectUnauthorized: false } : undefined,
  });

  return pool;
};

export { getRealtimePool };
