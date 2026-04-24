import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { drizzle } from 'drizzle-orm/node-postgres';

import { env } from '../env';

import { getPool } from './pool';
import * as schema from './schema';

let pgliteClient: PGlite | undefined;

function getDb() {
  if (env.DATABASE_DRIVER === 'memory') {
    if (!pgliteClient) {
      pgliteClient = new PGlite();
    }

    return drizzlePglite({
      casing: 'snake_case',
      client: pgliteClient,
      schema,
    });
  }

  return drizzle({
    casing: 'snake_case',
    client: getPool(),
    schema,
  });
}

const db = getDb();

export { db, getDb };
