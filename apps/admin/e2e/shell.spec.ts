import { expect, test, type Locator, type Page } from '@playwright/test';
import en from '../messages/en.json' with { type: 'json' };
import vi from '../messages/vi.json' with { type: 'json' };
import { requestCount, signedInAs } from './support/mock-api';
import { seriousViolations } from './support/axe';
import { dashboardMocks } from './support/dashboard-mocks';

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

  test('Task 12a: group titles TỔNG QUAN … HỆ THỐNG are visible at 1440; at 390 the drawer lists all 23 items and scrolls inside the viewport', async ({ page }, info) => {
    await signedInAs(page, 'admin', { 'GET /v1/admin/content/uploads': () => emptyUploads });
    await page.goto('/uploads');
    await openNavIfCollapsed(page);
    const nav = page.getByRole('navigation', { name: vi.shell.mainNav });
    for (const title of Object.values(vi.navGroups)) {
      await expect(nav.getByRole('group', { name: title, exact: true })).toBeAttached();
    }
    await expect(nav.getByRole('link')).toHaveCount(23);
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

  test('the AI dashboard (owner 28/10/2026) shows its sections for an editor with ai.view; axe is clean', async ({ page }) => {
    await signedInAs(page, 'editor', dashboardMocks);
    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(vi.nav.dashboard);
    for (const title of [vi.dashboard.today.title, vi.dashboard.health.title, vi.dashboard.cost.title, vi.dashboard.quality.title,
      vi.dashboard.impact.title, vi.dashboard.usage.title]) {
      await expect(page.getByRole('heading', { level: 2, name: title })).toBeVisible();
    }
    await expect(page.getByRole('group', { name: vi.dashboard.cost.chart })).toBeVisible();
    await expect(page.getByRole('list', { name: vi.dashboard.quality.retry.title })).toBeVisible();
    await expect(page.getByRole('list', { name: vi.dashboard.usage.pro.chart })).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('Task 12a: after login the home is /uploads', async ({ page }) => {
    await signedInAs(page, 'admin', { 'GET /v1/admin/content/uploads': () => emptyUploads });
    await page.goto('/');
    await expect(page).toHaveURL(/\/uploads$/);
  });

  test('an editor opening /staff keeps the title, sees the no-access text, and [Về trang chủ] leads to /uploads', async ({ page }) => {
    await signedInAs(page, 'editor', { 'GET /v1/admin/content/uploads': () => emptyUploads });
    await page.goto('/staff');
    await expect(page).toHaveURL(/\/staff$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(vi.nav.staff);
    await expect(page.getByText(vi.noAccess.title)).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
    await page.getByRole('button', { name: vi.noAccess.home }).click();
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
    expect(await seriousViolations(page)).toEqual([]);
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
    // The foot stays on screen at 1440×900 even with all 23 items: only the menu list scrolls.
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

  test('touch screens: ☰, the drawer items, its ✕, VI/EN, "Chi tiết" and the panel ✕ are at least 44px tall (owner, 15/10/2026)', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile', 'phone layout');
    // Control: this project emulates a touch screen, which is what the larger sizes depend on.
    expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true);
    const at = '2026-10-14T09:30:00.000Z';
    const batch = { id: 'b1', status: 'succeeded', file_name: 'one.csv', row_count: 3, counters: { processed: 3, created: 3 }, warnings: [], created_at: at, started_at: at, finished_at: at, reverted: false };
    await signedInAs(page, 'admin', { 'GET /v1/admin/content/uploads': () => emptyUploads, 'GET /v1/admin/content/uploads/b1': () => ({ json: batch }) });
    const heights: Record<string, number> = {};
    const measure = async (name: string, target: Locator) => {
      heights[name] = Math.round((await target.boundingBox())!.height);
    };
    await page.goto('/uploads');
    await measure('Chi tiết', page.getByRole('link', { name: vi.uploads.open }).filter({ visible: true }).first());
    const burger = page.getByRole('button', { name: vi.shell.openMenu });
    await measure('☰', burger);
    await burger.click();
    const drawer = page.getByRole('dialog');
    await expect.poll(async () => (await drawer.boundingBox())!.x).toBe(0);
    await measure('drawer item', drawer.getByRole('link', { name: vi.nav.uploads }));
    await measure('drawer ✕', drawer.getByRole('button', { name: vi.shell.closeMenu }));
    await measure('VI', drawer.getByRole('button', { name: 'VI', exact: true }));
    await measure('EN', drawer.getByRole('button', { name: 'EN', exact: true }));
    await page.goto('/uploads/b1');
    await measure('panel ✕', page.getByTestId('detail-panel').getByRole('button', { name: vi.common.close }));
    expect(Object.entries(heights).filter(([, height]) => height < 44)).toEqual([]);
  });

  test('owner 15/10/2026: a menu list that scrolls shades its edge where items are hidden (sidebar at 1440×640, drawer at 390)', async ({ page }, info) => {
    if (info.project.name === 'desktop') await page.setViewportSize({ width: 1440, height: 640 });
    await signedInAs(page, 'admin', { 'GET /v1/admin/content/uploads': () => emptyUploads });
    await page.goto('/uploads');
    await openNavIfCollapsed(page);
    const list = page.getByRole('navigation', { name: vi.shell.mainNav }).locator('xpath=..');
    // Control: the list really is cut off here, which is when the hint matters.
    expect(await list.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
    const paint = await list.evaluate((el) => {
      const style = getComputedStyle(el);
      return { attachment: style.backgroundAttachment, gradients: style.backgroundImage.match(/gradient\(/g)?.length ?? 0 };
    });
    // Two canvas covers that scroll with the items (local) over two shadows fixed to the box (scroll): a shadow shows only
    // at an end that still hides items.
    expect(paint).toEqual({ attachment: 'local, local, scroll, scroll', gradients: 4 });
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
