# Database migrations

## Non-production passwordless reset

The passwordless cutover is intentionally destructive. It has no compatibility
or backfill path. Do not apply it to a database whose data must be retained.

For local development and disposable test environments:

1. Stop every Themis runtime that uses the database.
2. Drop and recreate the disposable database using your normal PostgreSQL or
   container tooling. Do not copy password-era rows into the new database.
3. Set `DATABASE_URL` to the recreated database.
4. Run `pnpm db:migrate` from the workspace root.
5. Restart the required Nx targets and create fresh test identities and
   passkeys.

The in-memory `PGlite` runtime needs no manual reset: stop the process and start
it again with `DATABASE_AUTO_MIGRATE=true`. A new process creates an empty
database and applies the complete migration sequence.
