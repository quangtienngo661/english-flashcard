import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

// Postgres-backed integration tests for SQL claims, locks, and concurrency (Audit 23/11, Task A1.1).
// Kept separate from `pnpm test` (`vitest.config.ts`) so default unit tests never need Docker.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['test/integration/**/*.int-spec.ts'],
    globalSetup: ['./test/setup/postgres-global-setup.ts', './test/setup/redis-global-setup.ts'],
    fileParallelism: false,
    testTimeout: 120_000,
    hookTimeout: 180_000,
  },
});
