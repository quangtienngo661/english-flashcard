import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

// Review Focus 5 (Learning) times GET /v1/groups and Bước 4 Review Focus 2 times a practice session start, so they run alone (pnpm test:e2e:scale), one file at a time, nothing else competing for
// the machine. Same setup as vitest.config.e2e.ts, which excludes these files.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['test/learning/scale.e2e-spec.ts', 'test/practice/scale.e2e-spec.ts'],
    globalSetup: ['./test/setup/postgres-global-setup.ts', './test/setup/redis-global-setup.ts'],
    fileParallelism: false,
    testTimeout: 300_000,
    hookTimeout: 300_000,
    // Print the measured duration: the default reporter hides console output of passing tests.
    silent: false,
    reporters: ['verbose'],
  },
});
