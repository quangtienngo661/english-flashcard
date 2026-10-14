import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import en from '../messages/en.json' with { type: 'json' };
import vi from '../messages/vi.json' with { type: 'json' };
import { requestCount, signedInAs } from './support/mock-api';

const emptyUploads = { json: { items: [{ id: 'b1', file_name: 'one.csv' }], next_page_token: null } };

/** Below 64rem the nav sits behind ☰; open it so both layouts can be asserted the same way. */
async function openNavIfCollapsed(page: Page) {
  const collapsed = (page.viewportSize()?.width ?? 0) < 1024; // 64rem
  if (collapsed) await page.getByRole('button', { name: vi.shell.openMenu }).click();
}

test.describe('shell (vi)', () => {
  test.use({ locale: 'vi-VN' });

  test('B25#1: editor sees no "Vai trò" in the sidebar; admin sees it', async ({ page }) => {
    await signedInAs(page, 'editor', { 'GET /v1/admin/content/uploads': () => emptyUploads });
    await page.goto('/uploads');
    await openNavIfCollapsed(page);
    const nav = page.getByRole('navigation', { name: vi.shell.mainNav });
    await expect(nav.getByRole('link', { name: vi.nav.uploads })).toBeVisible();
    await expect(nav.getByRole('link', { name: vi.nav.staff })).toHaveCount(0);

    const admin = await page.context().newPage();
    await signedInAs(admin, 'admin', { 'GET /v1/admin/content/uploads': () => emptyUploads });
    await admin.goto('/uploads');
    await openNavIfCollapsed(admin);
    await expect(admin.getByRole('navigation', { name: vi.shell.mainNav }).getByRole('link', { name: vi.nav.staff })).toBeVisible();
  });

  test('an editor opening /staff is sent to the first visible page', async ({ page }) => {
    await signedInAs(page, 'editor', { 'GET /v1/admin/content/uploads': () => emptyUploads });
    await page.goto('/staff');
    await expect(page).toHaveURL(/\/uploads$/);
  });

  test('B25#21: below 64rem the sidebar is behind ☰ and opens as a drawer; axe has no serious/critical violations', async ({ page }, info) => {
    await signedInAs(page, 'admin', { 'GET /v1/admin/content/uploads': () => emptyUploads });
    await page.goto('/uploads');
    const nav = page.getByRole('navigation', { name: vi.shell.mainNav });
    const burger = page.getByRole('button', { name: vi.shell.openMenu });

    if (info.project.name === 'mobile') {
      await expect(burger).toBeVisible();
      await expect(nav).toHaveCount(0);
      await burger.click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(nav.getByRole('link', { name: vi.nav.staff })).toBeVisible();
      await page.getByRole('button', { name: vi.shell.closeMenu }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
    } else {
      await expect(burger).toBeHidden();
      await expect(nav).toBeVisible();
    }

    await expect(page.getByTestId('placeholder-count')).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    const bad = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
  });

  test('Review Focus 2: at 390 a 320-character email in the account menu does not make the page scroll sideways', async ({ page }) => {
    const longEmail = `${'a'.repeat(300)}@${'b'.repeat(15)}.com`;
    expect(longEmail).toHaveLength(320);
    await signedInAs(page, 'admin', { 'GET /v1/admin/content/uploads': () => emptyUploads }, { email: longEmail });
    await page.goto('/uploads');
    await expect(page.getByTestId('placeholder-count')).toBeVisible();
    const overflow = await page.evaluate(() => {
      const el = document.scrollingElement!;
      return { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth };
    });
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
  });

  test('offline (spec §8): a request that aborts shows the offline banner, keeps the data, and "Thử lại" refetches', async ({ page }) => {
    let dead = false;
    await signedInAs(page, 'editor', {
      'GET /v1/admin/content/uploads': () => (dead ? { abort: true } : emptyUploads),
    });
    await page.goto('/uploads');
    await expect(page.getByTestId('placeholder-count')).toHaveText('1');
    await expect(page.getByRole('alert')).toHaveCount(0);

    dead = true;
    const before = requestCount(page, 'GET', '/v1/admin/content/uploads');
    await page.evaluate(() => window.dispatchEvent(new Event('visibilitychange')));
    const banner = page.getByRole('alert');
    await expect(banner).toContainText(vi.offline.message);
    await expect(page.getByTestId('placeholder-count')).toHaveText('1');

    dead = false;
    await banner.getByRole('button', { name: vi.common.retry }).click();
    await expect(page.getByRole('alert')).toHaveCount(0);
    expect(requestCount(page, 'GET', '/v1/admin/content/uploads')).toBeGreaterThan(before);
  });
});

test.describe('language', () => {
  test.use({ locale: 'vi-VN' });

  test('B25#22: switching to EN changes the shell text to messages/en.json and survives a reload', async ({ page }) => {
    await signedInAs(page, 'admin', { 'GET /v1/admin/content/uploads': () => emptyUploads });
    await page.goto('/uploads');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(vi.nav.uploads);
    await expect(page.locator('html')).toHaveAttribute('lang', 'vi');

    await page.getByRole('button', { name: 'EN', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(en.nav.uploads);
    expect(await page.evaluate(() => localStorage.getItem('wordmet-admin.locale'))).toBe('en');

    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(en.nav.uploads);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });
});
