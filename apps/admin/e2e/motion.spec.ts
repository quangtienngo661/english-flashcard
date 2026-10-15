import { expect, test, type Page } from '@playwright/test';
import vi from '../messages/vi.json' with { type: 'json' };
import { signedInAs } from './support/mock-api';

test.use({ locale: 'vi-VN' });

const uploads = {
  json: { items: [{ id: 'b1', status: 'succeeded', file_name: 'one.csv', row_count: 3, created_at: '2026-10-14T09:30:00.000Z' }], next_page_token: null },
};
const batch = {
  json: {
    id: 'b1',
    status: 'succeeded',
    file_name: 'one.csv',
    row_count: 3,
    counters: { processed: 3, created: 3, updated: 0, unchanged: 0, rejected: 0 },
    warnings: [],
    created_at: '2026-10-14T09:30:00.000Z',
    started_at: '2026-10-14T09:30:05.000Z',
    finished_at: '2026-10-14T09:31:00.000Z',
    reverted: false,
  },
};
const mocks = { 'GET /v1/admin/content/uploads': () => uploads, 'GET /v1/admin/content/uploads/b1': () => batch };
const accountButton = (page: Page) => page.getByRole('button', { name: new RegExp(`^${vi.shell.account}:`) });
const twoFrames = (page: Page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

/** Records the name and duration of every CSS animation that starts from now on. */
async function recordAnimations(page: Page) {
  await page.evaluate(() => {
    const seen: Array<{ name: string; duration: string }> = [];
    (window as unknown as { __animations: typeof seen }).__animations = seen;
    document.addEventListener('animationstart', (e) => seen.push({ name: e.animationName, duration: getComputedStyle(e.target as Element).animationDuration }));
  });
}
const recorded = (page: Page) => page.evaluate(() => (window as unknown as { __animations: Array<{ name: string; duration: string }> }).__animations);

test.describe('desktop', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'the account menu sits in the sidebar from 64rem'));

  test('UBE22 opening and closing the account menu ten times fast leaves no menu', async ({ page }) => {
    await signedInAs(page, 'editor', mocks);
    await page.goto('/uploads');
    // A mouse user: open, click outside, open again while the menu is still exiting, ten times. (Escape is not used:
    // a menu reopened during its exit gets no focus back, so Escape would not reach it; a click outside still closes it.)
    const title = (await page.getByRole('heading', { level: 1 }).boundingBox())!;
    for (let i = 0; i < 10; i += 1) {
      await accountButton(page).click();
      await page.mouse.click(title.x + 4, title.y + title.height / 2);
    }
    await page.waitForTimeout(400);
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect(page.locator('[data-exiting]')).toHaveCount(0);
  });

  test('UBE23 reopening the account menu while it closes leaves it open', async ({ page }) => {
    await signedInAs(page, 'editor', mocks);
    await page.goto('/uploads');
    await accountButton(page).click();
    await expect(page.getByRole('menu')).toBeVisible();
    await page.keyboard.press('Escape');
    await accountButton(page).click();
    await page.waitForTimeout(400);
    await expect(page.getByRole('menu')).toBeVisible();
  });

  test('UBE20 with reduced motion the account menu runs no animation and vanishes at once', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await signedInAs(page, 'editor', mocks);
    await page.goto('/uploads');
    await accountButton(page).click();
    await expect(page.getByRole('menu')).toBeVisible();
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
    await page.keyboard.press('Escape');
    await twoFrames(page);
    expect(await page.getByRole('menu').count()).toBe(0);
  });

  test('the revert dialog enters in 250ms and the account menu in 200ms', async ({ page }) => {
    await signedInAs(page, 'editor', mocks);
    await page.goto('/uploads/b1');
    await recordAnimations(page);
    await page.getByRole('button', { name: vi.batch.revert }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect.poll(() => recorded(page)).toEqual(
      expect.arrayContaining([
        { name: 'fade-in', duration: '0.2s' },
        { name: 'dialog-in', duration: '0.25s' },
      ]),
    );
    await page.getByRole('dialog').getByRole('button', { name: vi.common.cancel }).click();
    await accountButton(page).click();
    await expect.poll(() => recorded(page)).toEqual(expect.arrayContaining([{ name: 'menu-in-up', duration: '0.2s' }]));
  });
});

test.describe('mobile', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'mobile', 'the drawer exists below 64rem'));

  test('UBE22 the drawer opened and closed ten times fast leaves no overlay', async ({ page }) => {
    await signedInAs(page, 'editor', mocks);
    await page.goto('/uploads');
    for (let i = 0; i < 10; i += 1) {
      await page.getByRole('button', { name: vi.shell.openMenu }).click();
      await page.keyboard.press('Escape');
    }
    await page.waitForTimeout(400);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('[data-exiting]')).toHaveCount(0);
  });

  test('UBE20 with reduced motion the drawer runs no animation and vanishes at once', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await signedInAs(page, 'editor', mocks);
    await page.goto('/uploads');
    await page.getByRole('button', { name: vi.shell.openMenu }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);
    await page.keyboard.press('Escape');
    await twoFrames(page);
    expect(await page.getByRole('dialog').count()).toBe(0);
  });

  test('the drawer slides in from the left in 250ms', async ({ page }) => {
    await signedInAs(page, 'editor', mocks);
    await page.goto('/uploads');
    await recordAnimations(page);
    await page.getByRole('button', { name: vi.shell.openMenu }).click();
    await expect.poll(() => recorded(page)).toEqual(expect.arrayContaining([{ name: 'drawer-in', duration: '0.25s' }]));
  });
});
