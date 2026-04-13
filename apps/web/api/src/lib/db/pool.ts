import { Pool } from 'pg';

import type { AuthConfig } from '../config/auth-config.js';

let pool: Pool | undefined;
let cachedUrl: string | undefined;

const getPool = (config: AuthConfig): Pool => {
  if (!pool || cachedUrl !== config.databaseUrl) {
    cachedUrl = config.databaseUrl;
    pool = new Pool({
      connectionString: config.databaseUrl,
      ssl: config.databaseSsl ? { rejectUnauthorized: false } : undefined,
    });
  }

  return pool as Pool;
};

export { getPool };
