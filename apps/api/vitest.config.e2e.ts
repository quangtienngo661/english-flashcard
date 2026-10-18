import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    // Timed alone by vitest.config.e2e-scale.ts (pnpm test:e2e:scale): beside 68 other files it measured the machine, not the SQL.
    exclude: ['**/node_modules/**', 'test/learning/scale.e2e-spec.ts', 'test/practice/scale.e2e-spec.ts'],
    globalSetup: ['./test/setup/postgres-global-setup.ts', './test/setup/redis-global-setup.ts'],
    // Container-backed e2e tests: module import alone took 27-75 s across the suite on 07/10 under
    // load from other local containers, so the 5 s default made a single-query test flaky.
    testTimeout: 30_000,
    // Isolated-database suites run `prisma migrate deploy` synchronously in beforeAll; four in parallel exceeded 10 s on 12/10/2026.
    hookTimeout: 60_000,
  },
});
