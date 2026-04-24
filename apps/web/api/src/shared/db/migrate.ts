import { resolve } from 'node:path';

import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

import { env } from '../env';

import { db } from './client';

let migrationPromise: Promise<void> | undefined;

export async function runMigrationsIfEnabled() {
  if (!env.DATABASE_AUTO_MIGRATE) {
    return;
  }

  migrationPromise ??=
    env.DATABASE_DRIVER === 'memory'
      ? migratePglite(db, {
          migrationsFolder: resolve(process.cwd(), 'drizzle'),
        }).then(() => undefined)
      : migrate(db as never, {
          migrationsFolder: resolve(process.cwd(), 'drizzle'),
        }).then(() => undefined);

  await migrationPromise;
}
