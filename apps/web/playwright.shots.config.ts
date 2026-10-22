import { defineConfig, devices } from '@playwright/test';

// Screenshots for the owner's milestone review, against the real stack (API + worker + DB) and the app on :3001
// (`pnpm dev:app`). Not part of CI. Output: test-results/shots/<milestone>/<locale>-<scheme>-<width>-<page>.png
export default defineConfig({
  testDir: './e2e-shots',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  timeout: 300_000,
  use: { ...devices['Desktop Chrome'], baseURL: process.env.SHOTS_BASE_URL ?? 'http://localhost:3001' },
});
