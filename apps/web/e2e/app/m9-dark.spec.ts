import { expect, test, type Page } from '@playwright/test';
import { seriousViolations } from '../support/axe';
import { signedInAs, type MockHandler } from '../support/mock-api';

// M9.9: a stored theme beats the OS; the dark background, the dialog scrim and the browser bar follow the theme.
const NOW = new Date('2026-11-08T03:00:00Z');
const api: Record<string, MockHandler> = {
  'GET /v1/groups': () => ({ json: { items: [] } }),
  'GET /v1/me/streak': () => ({ json: { days: 6, studied_today: true } }),
  'GET /v1/me/calendar': (req) => ({
    json: { month: req.query.get('month') ?? '2026-11', days: [], totals: { study_days: 0, learned: 0, reviewed: 0, practice_sessions: 0 } },
  }),
};

async function scrimOf(page: Page) {
  return page.getByRole('dialog').evaluate((dialog) => {
    for (let el: Element | null = dialog; el; el = el.parentElement) {
      if (getComputedStyle(el).position === 'fixed') return getComputedStyle(el).backgroundColor;
    }
    return null;
  });
}

const cases = [
  { stored: 'dark', os: 'light', bar: '#0f1220', scrim: 'rgba(0, 0, 0, 0.55)' },
  { stored: 'light', os: 'dark', bar: '#f6f7fa', scrim: 'rgba(27, 36, 68, 0.3)' },
] as const;

for (const c of cases) {
  test.describe(`stored ${c.stored} on a ${c.os} OS`, () => {
    test.use({ colorScheme: c.os });

    test('themes the page, the browser bar and the Lịch scrim', async ({ page }) => {
      await page.clock.setFixedTime(NOW);
      await page.addInitScript((stored) => localStorage.setItem('wordmet-web.theme', stored), c.stored);
      await signedInAs(page, 'free', api);
      await page.goto('/vi/app/groups');
      const html = page.locator('html');
      await expect(html).toHaveAttribute('data-theme', c.stored);
      if (c.stored === 'dark') expect(await html.evaluate((el) => getComputedStyle(el).colorScheme)).toBe('dark');
      await expect
        .poll(() => page.evaluate(() => [...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')].map((m) => m.content)))
        .toEqual(expect.arrayContaining([c.bar]));
      const bars = await page.evaluate(() => [...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')].map((m) => m.content));
      expect(bars.every((b) => b === c.bar)).toBe(true);
      // A client-side navigation makes Next render fresh metas with the OS values; the bar must stay on the in-app theme.
      await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Hôm nay' }).click();
      await expect(page).toHaveURL(/\/vi\/app$/);
      await expect
        .poll(() => page.evaluate(() => [...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')].map((m) => m.content)))
        .toEqual(expect.arrayContaining([c.bar]));
      await expect
        .poll(() => page.evaluate(() => [...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')].every((m) => m.content === (document.documentElement.dataset.theme === 'dark' ? '#0f1220' : '#f6f7fa'))))
        .toBe(true);
      await page.keyboard.press('l');
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect.poll(() => scrimOf(page)).toBe(c.scrim);
      expect(await seriousViolations(page)).toEqual([]);
    });
  });
}
