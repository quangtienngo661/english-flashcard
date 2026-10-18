import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

// Review Focus 5 times GET /v1/groups, so it runs alone (pnpm test:e2e:scale): one file, nothing else competing for the
// machine. Same setup as vitest.config.e2e.ts, which excludes this file.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['test/learning/scale.e2e-spec.ts'],
    globalSetup: ['./test/setup/postgres-global-setup.ts', './test/setup/redis-global-setup.ts'],
    fileParallelism: false,
    testTimeout: 300_000,
    hookTimeout: 300_000,
    // Print the measured duration: the default reporter hides console output of passing tests.
    silent: false,
    reporters: ['verbose'],
  },
});
