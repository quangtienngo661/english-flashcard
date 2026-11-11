import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';

const port = 3100;
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, hasTouch: true } },
  ],
  webServer: {
    command: 'pnpm cf:build && node scripts/e2e-cf.mjs && pnpm cf:dev',
    url: `${baseURL}/vi`,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    env: {
      NEXT_PUBLIC_SITE_URL: baseURL,
      NEXT_PUBLIC_LEARNER_APP: 'on',
      NEXT_PUBLIC_API_BASE_URL: 'http://localhost:3000',
      // Đợt C §5.5: pronunciation files come from the mocked API's dev audio route (CSP media-src).
      NEXT_PUBLIC_AUDIO_BASE_URL: 'http://localhost:3000/v1/dev/audio',
      // Cloudflare's test site key (always passes): the form tests get a stub script from mockApi(), E23 loads the real widget.
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: '1x00000000000000000000AA',
      // M8.3: the e2e build never reads the API for the landing's prices and FAQ; the home page shows the fallback (M8 Review Focus 1).
      LANDING_DATA_SOURCE: 'fallback',
      CLOUDFLARE_CF_FETCH_PATH: fileURLToPath(new URL('./.wrangler/e2e-cf.json', import.meta.url)),
    },
  },
});
