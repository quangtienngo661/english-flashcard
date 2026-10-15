import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import en from '../messages/en.json' with { type: 'json' };
import vi from '../messages/vi.json' with { type: 'json' };
import { requestCount, signedInAs } from './support/mock-api';

const emptyUploads = {
  json: { items: [{ id: 'b1', status: 'succeeded', file_name: 'one.csv', row_count: 3, created_at: '2026-10-14T09:30:00.000Z' }], next_page_token: null },
};
const oneBatch = (page: Page) => page.getByText('one.csv').filter({ visible: true }).first();

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

  test('Task 12a: group titles TỔNG QUAN … HỆ THỐNG are visible at 1440; at 390 the drawer lists all 16 items and scrolls inside the viewport', async ({ page }, info) => {
    await signedInAs(page, 'admin', { 'GET /v1/admin/content/uploads': () => emptyUploads });
    await page.goto('/uploads');
    await openNavIfCollapsed(page);
    const nav = page.getByRole('navigation', { name: vi.shell.mainNav });
    for (const title of Object.values(vi.navGroups)) {
      await expect(nav.getByRole('group', { name: title, exact: true })).toBeAttached();
    }
    await expect(nav.getByRole('link')).toHaveCount(16);
    if (info.project.name === 'mobile') {
      const last = nav.getByRole('link', { name: vi.nav.staff });
      await last.scrollIntoViewIfNeeded();
      await expect(last).toBeInViewport();
      const box = await page.getByRole('dialog').boundingBox();
      expect(box!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
    } else {
      await expect(nav.getByText(vi.navGroups.overview, { exact: true })).toBeVisible();
      await expect(nav.getByText(vi.navGroups.system, { exact: true })).toBeVisible();
    }
  });

  test('Task 12a: an unavailable menu item opens "Tính năng chưa có" with its purpose and planned step; axe is clean', async ({ page }) => {
    await signedInAs(page, 'admin', {});
    await page.goto('/ai/costs');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(vi.nav.aiCosts);
    await expect(page.getByText(vi.comingSoon.title)).toBeVisible();
    await expect(page.getByText(vi.comingSoon.purpose.aiCosts)).toBeVisible();
    await expect(page.getByText('Dự kiến: Bước 6')).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    const bad = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
  });

  test('Task 12a: after login the home is /uploads', async ({ page }) => {
    await signedInAs(page, 'admin', { 'GET /v1/admin/content/uploads': () => emptyUploads });
    await page.goto('/');
    await expect(page).toHaveURL(/\/uploads$/);
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

    await expect(oneBatch(page)).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    const bad = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
  });

  test('Review Focus 2: at 390 a 320-character email in the account menu does not make the page scroll sideways', async ({ page }) => {
    const longEmail = `${'a'.repeat(300)}@${'b'.repeat(15)}.com`;
    expect(longEmail).toHaveLength(320);
    await signedInAs(page, 'admin', { 'GET /v1/admin/content/uploads': () => emptyUploads }, { email: longEmail });
    await page.goto('/uploads');
    await expect(oneBatch(page)).toBeVisible();
    const overflow = await page.evaluate(() => {
      const el = document.scrollingElement!;
      return { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth };
    });
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
  });

  test('UBC10 at 1440 the sidebar sits on the canvas, the active item is highlighted, and VI/EN and the account sit at its foot', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'desktop layout');
    await signedInAs(page, 'admin', { 'GET /v1/admin/content/uploads': () => emptyUploads });
    await page.goto('/uploads');
    const aside = page.locator('aside').filter({ has: page.getByRole('navigation', { name: vi.shell.mainNav }) });
    await expect(aside).toHaveCSS('box-shadow', 'none');
    await expect(aside).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    const active = aside.getByRole('link', { name: vi.nav.uploads });
    await expect(active).toHaveAttribute('aria-current', 'page');
    expect(await active.getByText(vi.nav.uploads).evaluate((el) => getComputedStyle(el).backgroundImage)).toContain('linear-gradient');
    for (const link of await aside.getByRole('link').all()) await expect(link.locator('svg')).toHaveCount(1);
    // The foot stays on screen at 1440×900 even with all 16 items: only the menu list scrolls.
    await expect(aside.getByRole('group', { name: vi.shell.language })).toBeInViewport({ ratio: 1 });
    const account = aside.getByRole('button', { name: new RegExp(`^${vi.shell.account}:`) });
    await expect(account).toBeInViewport({ ratio: 1 });
    await account.click();
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    expect((await menu.boundingBox())!.y).toBeLessThan((await account.boundingBox())!.y);
  });

  test('UBC11 at 390 the top bar is primary, ☰ opens the drawer from the left with VI/EN and the account; nothing scrolls sideways', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile', 'phone layout');
    await signedInAs(page, 'admin', { 'GET /v1/admin/content/uploads': () => emptyUploads });
    await page.goto('/uploads');
    const burger = page.getByRole('button', { name: vi.shell.openMenu });
    await expect(burger.locator('xpath=..')).toHaveCSS('background-color', 'rgb(36, 69, 214)');
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({ scrollWidth: document.scrollingElement!.scrollWidth, clientWidth: document.scrollingElement!.clientWidth }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    await burger.click();
    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible();
    await expect.poll(async () => (await drawer.boundingBox())!.x).toBe(0);
    await expect(drawer.getByRole('group', { name: vi.shell.language })).toBeInViewport({ ratio: 1 });
    await expect(drawer.getByRole('button', { name: new RegExp(`^${vi.shell.account}:`) })).toBeInViewport({ ratio: 1 });
  });

  test('offline (spec §8): a request that aborts shows the offline banner, keeps the data, and "Thử lại" refetches', async ({ page }) => {
    let dead = false;
    await signedInAs(page, 'editor', {
      'GET /v1/admin/content/uploads': () => (dead ? { abort: true } : emptyUploads),
    });
    await page.goto('/uploads');
    await expect(oneBatch(page)).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);

    dead = true;
    const before = requestCount(page, 'GET', '/v1/admin/content/uploads');
    await page.evaluate(() => window.dispatchEvent(new Event('visibilitychange')));
    const banner = page.getByRole('alert');
    await expect(banner).toContainText(vi.offline.message);
    await expect(oneBatch(page)).toBeVisible();

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

    await openNavIfCollapsed(page); // below 64rem VI/EN sits at the foot of the drawer
    await page.getByRole('button', { name: 'EN', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    if ((page.viewportSize()?.width ?? 0) < 1024) await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(en.nav.uploads);
    expect(await page.evaluate(() => localStorage.getItem('wordmet-admin.locale'))).toBe('en');

    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(en.nav.uploads);
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  });
});
