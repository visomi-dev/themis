import { sql } from 'drizzle-orm';

import type { AuthConfig } from '../config/auth-config';

import { getDb } from './client';

type TenantContext = {
  accountId: string;
  userId: string;
};

const withAccountContext = async <T>(
  config: AuthConfig,
  context: TenantContext,
  operation: (tx: ReturnType<typeof getDb>) => Promise<T>,
) => {
  const db = getDb(config);

  return db.transaction(async (tx) => {
    if (config.databaseDriver === 'pg') {
      await tx.execute(sql`select set_config('app.current_account_id', ${context.accountId}, true)`);
      await tx.execute(sql`select set_config('app.current_user_id', ${context.userId}, true)`);
    }

    return operation(tx as unknown as ReturnType<typeof getDb>);
  });
};

export { withAccountContext };
export type { TenantContext };
