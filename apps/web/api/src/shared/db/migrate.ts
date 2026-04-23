import { resolve } from 'node:path';

import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

import type { AuthConfig } from '../config/auth-config';

import { getDb } from './client';

let migrationPromise: Promise<void> | undefined;

async function runMigrationsIfEnabled(config: AuthConfig) {
  if (!config.databaseAutoMigrate) {
    return;
  }

  migrationPromise ??=
    config.databaseDriver === 'memory'
      ? migratePglite(getDb(config), {
          migrationsFolder: resolve(process.cwd(), 'drizzle'),
        }).then(() => undefined)
      : migrate(getDb(config) as never, {
          migrationsFolder: resolve(process.cwd(), 'drizzle'),
        }).then(() => undefined);

  await migrationPromise;
}

export { runMigrationsIfEnabled };
