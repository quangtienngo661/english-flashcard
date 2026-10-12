import { RedisContainer, type StartedRedisContainer } from '@testcontainers/redis';
import type { TestProject } from 'vitest/node';

let container: StartedRedisContainer;

export async function setup(project: TestProject) {
  container = await new RedisContainer('redis:7.4-alpine')
    .withStartupTimeout(30_000)
    .start();

  const connectionString = container.getConnectionUrl();
  project.provide('redisUrl', connectionString);
}

export async function teardown() {
  await container?.stop();
}
