import { expect, test } from '@playwright/test';
import { copy } from './copy';
import { mockApi, problem } from './support/mock-api';

declare global {
  interface Window {
    __cspViolations: string[];
  }
}

// E23: the browser never reports a CSP violation (design §4.6).
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__cspViolations = [];
    document.addEventListener('securitypolicyviolation', (e) => {
      window.__cspViolations.push(`${e.violatedDirective} ${e.blockedURI} ${e.sample}`);
    });
  });
});

test('E23: the landing carries the CSP and raises no violation', async ({ page }) => {
  const response = await page.goto('/vi');
  expect(response?.headers()['content-security-policy']).toContain("default-src 'self'");
  await page.getByRole('tab', { name: copy.vi.Landing.showcase.tabs.lookup }).click();
  await page.waitForLoadState('networkidle');
  expect(await page.evaluate(() => window.__cspViolations)).toEqual([]);
});

test('E23: the learner app carries the CSP and raises no violation', async ({ page }) => {
  const response = await page.goto('/vi/app');
  expect(response?.headers()['content-security-policy']).toContain("frame-ancestors 'none'");
  await page.locator('body').click();
  await page.waitForLoadState('networkidle');
  expect(await page.evaluate(() => window.__cspViolations)).toEqual([]);
});

// LA1#13: the headers besides the CSP (launch prep A, design 4.4). Only what the Worker answers is checked here; the static
// files Workers Static Assets serves directly are checked with curl after the deploy (deploy checklist).
test('LA1#13: the landing carries the nosniff, referrer and permissions headers', async ({ page }) => {
  const response = await page.goto('/vi');
  const headers = response?.headers() ?? {};
  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(headers['permissions-policy']).toBe('camera=(), microphone=(), geolocation=()');
});

// LA1#14: the real Turnstile widget (Cloudflare's test site key, loaded from Cloudflare, so this one needs the network) runs
// under our CSP without a single violation. Turnstile draws its iframe inside a closed shadow root, so the page cannot be asked
// for the iframe; the proof that the challenge ran is the sign-in button, which stays off until Cloudflare hands the form a token.
test('LA1#14: the sign-in page runs the real Turnstile widget and raises no CSP violation', async ({ page }) => {
  test.setTimeout(75_000);
  await mockApi(page, { 'POST /v1/auth/refresh': () => problem(401, 'invalid-token') }, { realTurnstile: true });
  await page.goto('/vi/app/login');
  await expect(page.getByRole('button', { name: copy.vi.App.auth.login.submit })).toBeEnabled({ timeout: 45_000 });
  await page.waitForLoadState('networkidle');
  expect(await page.evaluate(() => window.__cspViolations)).toEqual([]);
});
