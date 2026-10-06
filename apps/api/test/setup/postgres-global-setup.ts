import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import type { TestProject } from 'vitest/node';

let container: StartedPostgreSqlContainer;

export async function setup(project: TestProject) {
  container = await new PostgreSqlContainer('postgres:17')
    .withStartupTimeout(30_000)
    .start();

  const connectionString = container.getConnectionUri();

  // Apply every committed migration to this fresh, empty database before any test runs (B0E5) —
  // the same migration files this repo would apply to a long-lived dev database.
  const migrationPool = new Pool({ connectionString });
  try {
    await migrate(drizzle(migrationPool), { migrationsFolder: './drizzle' });
  } finally {
    await migrationPool.end();
  }

  project.provide('databaseUrl', connectionString);
}

export async function teardown() {
  await container?.stop();
}
