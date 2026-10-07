import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    globalSetup: ['./test/setup/postgres-global-setup.ts'],
    // Container-backed e2e tests: module import alone took 27-75 s across the suite on 07/10 under
    // load from other local containers, so the 5 s default made a single-query test flaky.
    testTimeout: 30_000,
  },
});
