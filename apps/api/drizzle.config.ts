// Migrations in this project must be additive (no destructive DROP / ALTER ... NOT NULL
// without a separate reviewed step) so the same migration set applies cleanly to both an
// empty Testcontainers-provisioned test database and a long-lived dev database with data (B0E5).
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/**/schema.ts',
  out: './drizzle',
});
