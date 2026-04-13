import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { drizzle } from 'drizzle-orm/node-postgres';

import type { AuthConfig } from '../config/auth-config.js';

import { getPool } from './pool.js';
import * as schema from './schema.js';

let pgliteClient: PGlite | undefined;

const getDb = (config: AuthConfig) => {
  if (config.databaseDriver === 'memory') {
    pgliteClient ??= new PGlite();

    return drizzlePglite({
      casing: 'snake_case',
      client: pgliteClient,
      schema,
    });
  }

  return drizzle({
    casing: 'snake_case',
    client: getPool(config),
    schema,
  });
};

export { getDb };
