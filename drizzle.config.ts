import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './apps/web/api/src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  casing: 'snake_case',
  dbCredentials: {
    url: process.env['DATABASE_URL'] ?? 'postgresql://postgres:postgres@127.0.0.1:5432/themis',
  },
});
