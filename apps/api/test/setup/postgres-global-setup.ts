import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { execSync } from 'node:child_process';
import type { TestProject } from 'vitest/node';

let container: StartedPostgreSqlContainer;

export async function setup(project: TestProject) {
  container = await new PostgreSqlContainer('postgres:17')
    .withStartupTimeout(30_000)
    .start();

  const connectionString = container.getConnectionUri();

  // Apply every committed Prisma migration to this fresh, empty database (B0E5).
  // Existing databases require the documented baseline in prisma.config.ts first.
  execSync('pnpm exec prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: connectionString },
    stdio: 'inherit',
  });

  project.provide('databaseUrl', connectionString);
}

export async function teardown() {
  await container?.stop();
}
