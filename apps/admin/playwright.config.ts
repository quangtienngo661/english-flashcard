import { defineConfig, devices } from '@playwright/test';

// Another worktree's dev server may already hold 5173 (then Playwright would reuse it and test the wrong checkout):
// ADMIN_E2E_PORT moves this run to a free port. The mocked API reads the same variable for its CORS origin.
const port = Number(process.env.ADMIN_E2E_PORT ?? 5173);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: `http://localhost:${port}`, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    // Chromium with a phone-sized touch viewport (the plan's 390×844), not WebKit, so one browser is enough.
    { name: 'mobile', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, hasTouch: true } },
  ],
  webServer: {
    command: `pnpm build:e2e && pnpm exec vite preview --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { VITE_API_BASE_URL: 'http://localhost:3000' },
  },
});
