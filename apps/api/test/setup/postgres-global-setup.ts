import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import type { TestProject } from 'vitest/node';

let container: StartedPostgreSqlContainer;

export async function setup(project: TestProject) {
  container = await new PostgreSqlContainer('postgres:17')
    .withStartupTimeout(30_000)
    .start();
  project.provide('databaseUrl', container.getConnectionUri());
}

export async function teardown() {
  await container?.stop();
}
