import { defineConfig, devices } from '@playwright/test';

/**
 * Real-stack suite (spec §10): the admin app against a real API, worker, Postgres, Redis and Mailpit.
 * Those run OUTSIDE Playwright (locally: `docker compose up -d`, `pnpm build` and `pnpm run:dev` in `apps/api`;
 * in CI: workflow steps). Only the admin preview is started here. One worker, no retries, desktop only: the
 * tests are one story told in order and each registers or changes real accounts.
 */
export default defineConfig({
  testDir: './e2e-real',
  testMatch: '**/*.real.spec.ts',
  globalSetup: './e2e-real/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  timeout: 60_000,
  use: { baseURL: 'http://localhost:5173', trace: 'retain-on-failure', locale: 'vi-VN' },
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
  webServer: {
    command: 'pnpm build:e2e && pnpm preview',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { VITE_API_BASE_URL: 'http://localhost:3000' },
  },
});
