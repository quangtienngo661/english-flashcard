import { expect, test } from '@playwright/test';
import en from '../messages/en.json' with { type: 'json' };
import vi from '../messages/vi.json' with { type: 'json' };
import { signedInAs } from './support/mock-api';

/** Defects found by the Web Interface Guidelines review (15/10/2026); each test sets its own viewport. */
test.use({ locale: 'vi-VN' });
test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'sets its own viewport'));

const UPLOADS = {
  items: [{ id: 'b1', status: 'succeeded', file_name: 'cefrj-vocabulary-profile-1.5.csv', row_count: 7799, created_at: '2026-10-14T09:30:00.000Z' }],
  next_page_token: null,
};
const TOPICS = { items: [{ code: 'food', names: { vi: 'Ăn uống' }, archived_at: null }] };
const listMocks = {
  'GET /v1/admin/content/uploads': () => ({ json: UPLOADS }),
  'GET /v1/admin/taxonomy/topics': () => ({ json: TOPICS }),
};

test('a long select list at 390×640 scrolls inside its popover, so the last option can be chosen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 640 });
  await signedInAs(page, 'editor', listMocks);
  await page.goto('/export');
  await page.getByRole('button', { name: new RegExp(vi.export.pos) }).click();
  const last = page.getByRole('option', { name: 'interjection' });
  // Scroll the popover itself (a user's wheel or swipe; the page does not scroll while the list is open), then the
  // last option must sit inside both the popover and the viewport.
  const fits = await page.getByRole('listbox').evaluate((list) => {
    const popover = list.parentElement!;
    popover.scrollTop = popover.scrollHeight;
    const option = [...list.querySelectorAll('[role=option]')].at(-1)!.getBoundingClientRect();
    const box = popover.getBoundingClientRect();
    return option.bottom <= box.bottom + 1 && option.bottom <= innerHeight;
  });
  expect(fits).toBe(true);
  await last.click();
  await expect(page.getByRole('button', { name: new RegExp(vi.export.pos) })).toContainText('interjection');
});

test('table cells wrap between words: "Chi tiết" stays on one line at 1024', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 });
  await signedInAs(page, 'editor', listMocks);
  await page.goto('/uploads');
  const open = page.getByRole('table').getByRole('link', { name: vi.uploads.open });
  await expect(open).toBeVisible();
  const lines = await open.evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    return new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size;
  });
  expect(lines).toBe(1);
});

test('number columns and counters use tabular figures', async ({ page }) => {
  await signedInAs(page, 'editor', listMocks);
  await page.goto('/uploads');
  const cell = page.getByRole('table').getByRole('cell', { name: '7.799' });
  await expect(cell).toHaveCSS('font-variant-numeric', 'tabular-nums');
});

test('a skip link is the first Tab stop and moves focus to the main content', async ({ page }) => {
  await signedInAs(page, 'editor', listMocks);
  await page.goto('/uploads');
  await expect(page.getByRole('main')).toBeVisible();
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: vi.shell.skipToContent });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
});

test('email fields turn spellcheck off; the staff search does not invite autofill', async ({ page }) => {
  await signedInAs(page, 'admin', { 'GET /v1/admin/users': () => ({ json: { items: [], next_page_token: null } }) });
  await page.goto('/staff');
  const search = page.getByLabel(vi.staff.search.label);
  await expect(search).toHaveAttribute('spellcheck', 'false');
  await expect(search).toHaveAttribute('autocomplete', 'off');
  await page.getByRole('button', { name: vi.staff.createAccount }).click();
  await expect(page.getByRole('dialog').getByLabel(vi.staff.create.email)).toHaveAttribute('spellcheck', 'false');
});

test('the select trigger and the inactive language button change colour on hover', async ({ page }) => {
  await signedInAs(page, 'editor', listMocks);
  await page.goto('/export');
  for (const control of [page.getByRole('button', { name: new RegExp(vi.export.level) }), page.getByRole('button', { name: 'EN' })]) {
    const rest = await control.evaluate((el) => getComputedStyle(el).backgroundColor);
    await control.hover();
    await expect.poll(() => control.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(rest);
  }
});

test('the brand name is marked translate="no"', async ({ page }) => {
  await signedInAs(page, 'editor', listMocks);
  await page.goto('/uploads');
  await expect(page.getByText(en.shell.brand).first()).toHaveAttribute('translate', 'no');
});

test('the table header stays at the top while a 40-row list scrolls', async ({ page }) => {
  const items = Array.from({ length: 40 }, (_, i) => ({ id: `b${i}`, status: 'succeeded', file_name: `file-${i}.csv`, row_count: i, created_at: '2026-10-14T09:30:00.000Z' }));
  await signedInAs(page, 'editor', { 'GET /v1/admin/content/uploads': () => ({ json: { items, next_page_token: null } }) });
  await page.goto('/uploads');
  await expect(page.getByRole('table').getByText('file-39.csv')).toBeAttached();
  await page.mouse.wheel(0, 800);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(400);
  const head = await page.getByRole('table').locator('thead th').first().boundingBox();
  expect(head!.y).toBeGreaterThanOrEqual(0);
  expect(head!.y).toBeLessThanOrEqual(2);
});
