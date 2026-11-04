import { expect, test } from '@playwright/test';
import { copy } from './copy';
import { THEME_SCRIPT } from '../src/app-shell/theme/theme-script';
import { mockApi, problem, signedInAs } from './support/mock-api';

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

// Launch prep B design 5.4, M4: /app answers with a policy made for the request (a nonce and 'strict-dynamic'); the landing keeps the static one.
const nonceOf = (csp: string | undefined) => /'nonce-([^']+)'/.exec(csp ?? '')?.[1];

test('LB3E7: /vi/app and /vi/app/login carry one nonce policy, and every script has the nonce of the header (the theme script is let in by its hash)', async ({ page }) => {
  for (const path of ['/vi/app', '/vi/app/login']) {
    const response = await page.goto(path);
    const csp = response?.headers()['content-security-policy'] ?? '';
    expect(csp, path).toContain("'strict-dynamic'");
    // One policy only: a second one (from next.config.ts) would be applied beside it.
    expect(csp.split('default-src').length - 1, path).toBe(1);
    const nonce = nonceOf(csp);
    expect(nonce, path).toBeTruthy();
    const scripts = await page.evaluate(() => [...document.scripts].map((s) => ({ nonce: s.nonce, src: s.src, text: s.textContent ?? '' })));
    expect(scripts.length, path).toBeGreaterThan(0);
    // Without the nonce: the theme script (its hash is in the policy) and, on the sign-in page, the Turnstile script, which a script that has the nonce
    // adds to the page itself (that is what 'strict-dynamic' lets through).
    const without = scripts.filter((s) => s.nonce !== nonce);
    for (const script of without) {
      const theme = script.src === '' && script.text.trim() === THEME_SCRIPT.trim();
      const turnstile = script.src.startsWith('https://challenges.cloudflare.com/turnstile/');
      expect(theme || turnstile, `${path}: ${script.src || script.text.slice(0, 60)}`).toBe(true);
    }
    expect(without.filter((s) => s.src === '').length, path).toBeLessThanOrEqual(1);
  }
});

test('LB3E7: two loads of /vi/app/groups get two nonces; /vi has no nonce and keeps default-src self', async ({ request }) => {
  const first = nonceOf((await request.get('/vi/app/groups')).headers()['content-security-policy']);
  const second = nonceOf((await request.get('/vi/app/groups')).headers()['content-security-policy']);
  expect(first).toBeTruthy();
  expect(second).toBeTruthy();
  expect(first).not.toBe(second);
  const landing = (await request.get('/vi')).headers()['content-security-policy'];
  expect(landing).toContain("default-src 'self'");
  expect(landing).not.toContain("'nonce-");
});

test('LB3E8: no CSP violation on /vi, /vi/app, /vi/app/login and /vi/app/groups (signed in)', async ({ page }) => {
  for (const path of ['/vi', '/vi/app/login']) {
    await mockApi(page, { 'POST /v1/auth/refresh': () => problem(401, 'invalid-token') });
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    expect(await page.evaluate(() => window.__cspViolations), path).toEqual([]);
  }
  await signedInAs(page, 'free');
  for (const path of ['/vi/app', '/vi/app/groups']) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    expect(await page.evaluate(() => window.__cspViolations), path).toEqual([]);
  }
});

// LB3E6: the CSP is per document, so the way from the landing into the app must be a full page load (a plain link, not next/link).
test('LB3E6: from the landing, the link into the app loads a whole new page', async ({ page }) => {
  await page.goto('/vi');
  await page.evaluate(() => { (window as unknown as { __marker: boolean }).__marker = true; });
  await Promise.all([page.waitForURL(/\/vi\/app/), page.locator('a[href^="/vi/app"]').first().click()]);
  expect(await page.evaluate(() => (window as unknown as { __marker?: boolean }).__marker)).toBeUndefined();
});
