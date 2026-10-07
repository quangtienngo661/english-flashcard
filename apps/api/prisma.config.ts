// Start Postgres → prisma migrate deploy → prisma generate --sql (also emits the client) → run tests; --sql needs a live, migrated DB to infer result types.
import { existsSync } from 'node:fs';
import { defineConfig, env } from 'prisma/config';

if (existsSync('.env')) {
  process.loadEnvFile();
}

/*
 * The schema deliberately makes idempotency key/userId/endpoint/status/payloadHash and
 * createdAt/updatedAt NOT NULL: the old Drizzle DDL left these nullable, but every write
 * supplies them (or uses the timestamp defaults), and no real populated database exists.
 * responseStatus/responseBody remain nullable; rate-limit columns were already NOT NULL.
 *
 * Baselining an existing database (documentation only; this path has not been tested):
 * If idempotency_keys/rate_limit_counters already exist from the old Drizzle migrations,
 * verify their schema matches prisma/models/common.prisma, including the required NOT NULL columns,
 * then run prisma migrate resolve --applied <initial-migration-folder-name> before
 * prisma migrate deploy. Replace the placeholder with the committed init folder name
 * under prisma/migrations. Resolving records the baseline; it does not alter existing tables.
 */
export default defineConfig({
  schema: 'prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: env('DATABASE_URL') },
});
