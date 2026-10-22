import { expect, test } from '@playwright/test';
import { copy } from './copy';

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
  await page
    .getByRole('region', { name: copy.vi.Cloze.region })
    .getByRole('button', { name: copy.vi.Cloze.items.deploy.answer, exact: true })
    .click();
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
