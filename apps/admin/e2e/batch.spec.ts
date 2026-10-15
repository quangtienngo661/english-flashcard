import { expect, test, type Page } from '@playwright/test';
import vi from '../messages/vi.json' with { type: 'json' };
import { requestCount, signedInAs, type MockHandler } from './support/mock-api';
import { seriousViolations } from './support/axe';

test.use({ locale: 'vi-VN' });

const t = vi.batch;
const BATCH = 'GET /v1/admin/content/uploads/b1';
const REVERT = 'POST /v1/admin/content/uploads/b1/revert';
const LIST = 'GET /v1/admin/content/uploads';
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const at = '2026-10-14T09:30:00.000Z';
const batch = (over: Record<string, unknown> = {}) => ({
  id: 'b1',
  status: 'partial',
  file_name: 'cefr-j-1.5.csv',
  row_count: 3200,
  counters: { processed: 3200, created: 1500, updated: 400, unchanged: 250, rejected: 1050 },
  warnings: ['Dòng 12: bỏ dấu đã rà của revision 3f2a…', `Dòng 37: ${'x'.repeat(200)}`],
  created_at: at,
  started_at: '2026-10-14T09:30:05.000Z',
  finished_at: '2026-10-14T09:33:00.000Z',
  reverted: false,
  ...over,
});
const row = (id: string, file_name: string, status = 'partial') => ({ id, status, file_name, row_count: 3200, created_at: at });
// The batch opens beside its list (UB8): the list answers with two rows whose names differ from the panel's title.
const list: MockHandler = () => ({ json: { items: [row('b1', 'one.csv'), row('b2', 'two.csv', 'succeeded')], next_page_token: null } });
const b2: MockHandler = () => ({ json: batch({ id: 'b2', file_name: 'second.csv', status: 'succeeded', counters: { processed: 5, created: 5, rejected: 0 } }) });
const panel = (page: Page) => page.getByTestId('detail-panel');
const desktopOnly = () => test.skip(test.info().project.name !== 'desktop', 'sets its own viewport');

test('Review Focus 3: double-clicking the revert dialog\'s confirm sends exactly one POST', async ({ page }) => {
  let reverted = false;
  await signedInAs(page, 'editor', {
    [LIST]: list,
    [BATCH]: () => ({ json: batch({ reverted }) }),
    [REVERT]: async () => {
      await delay(400);
      reverted = true;
      return { json: { report: { removed: { entry: 1, variant: 0, level: 0, sense: 2, revision: 2 }, skipped: [] } } };
    },
  });
  await page.goto('/uploads/b1');
  await panel(page).getByRole('button', { name: t.revert }).click();
  await page.getByRole('dialog', { name: t.revertTitle.replace('{file}', 'cefr-j-1.5.csv') }).getByRole('button', { name: t.revert }).dblclick();
  await expect(page.getByRole('dialog', { name: t.revertTitle.replace('{file}', 'cefr-j-1.5.csv') })).toHaveCount(0);
  await expect(panel(page).getByText(t.revertedNotice)).toBeVisible();
  expect(requestCount(page, 'POST', '/v1/admin/content/uploads/b1/revert')).toBe(1);
});

test('axe: the batch panel (partial, long warning) and its revert dialog have no serious or critical violations; no sideways scroll', async ({ page }) => {
  await signedInAs(page, 'editor', { [LIST]: list, [BATCH]: () => ({ json: batch() }) });
  await page.goto('/uploads/b1');
  await expect(page.getByRole('heading', { level: 2, name: 'cefr-j-1.5.csv' })).toBeVisible();
  const scan = () => seriousViolations(page);
  expect(await scan()).toEqual([]);
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({ scrollWidth: document.scrollingElement!.scrollWidth, clientWidth: document.scrollingElement!.clientWidth }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

  await panel(page).getByRole('button', { name: t.revert }).click();
  await expect(page.getByRole('dialog', { name: t.revertTitle.replace('{file}', 'cefr-j-1.5.csv') })).toBeVisible();
  expect(await scan()).toEqual([]);
});

test('B25#13 (e2e): a running batch is refreshed by itself and the panel ends on the final status', async ({ page }) => {
  let polls = 0;
  await signedInAs(page, 'editor', {
    [LIST]: list,
    [BATCH]: () => {
      polls += 1;
      return { json: polls < 2 ? batch({ status: 'running', counters: { processed: 100 }, finished_at: null }) : batch({ status: 'succeeded' }) };
    },
  });
  await page.goto('/uploads/b1');
  await expect(panel(page).getByText(/Đang xử lý/)).toBeVisible();
  await expect(panel(page).getByText(vi.status.succeeded, { exact: true })).toBeVisible({ timeout: 8000 });
});

test('UBC12 at 1440 a row click opens the panel beside the table and the table stays clickable', async ({ page }) => {
  desktopOnly();
  await signedInAs(page, 'editor', { [LIST]: list, [BATCH]: () => ({ json: batch() }), 'GET /v1/admin/content/uploads/b2': b2 });
  await page.goto('/uploads');
  await page.getByRole('table').getByText('one.csv').click();
  await expect(page).toHaveURL(/\/uploads\/b1$/);
  await expect(panel(page)).toBeVisible();
  expect(await panel(page).evaluate((el) => el.tagName)).toBe('ASIDE');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('table').getByText('two.csv').click();
  await expect(page).toHaveURL(/\/uploads\/b2$/);
  await expect(page.getByRole('heading', { level: 2, name: 'second.csv' })).toBeVisible();
});

test('UB22 at 1280 the panel slides over the table as a modal and the table stays a table', async ({ page }) => {
  desktopOnly();
  await page.setViewportSize({ width: 1280, height: 800 });
  await signedInAs(page, 'editor', { [LIST]: list, [BATCH]: () => ({ json: batch() }) });
  await page.goto('/uploads/b1');
  await expect(page.getByRole('dialog', { name: 'cefr-j-1.5.csv' })).toBeVisible();
  await expect(page.locator('table')).toBeVisible();
  await expect(page.locator('[data-testid="card"]').first()).toBeHidden();
});

test('UBE25 another row swaps the panel without a new entrance animation', async ({ page }) => {
  desktopOnly();
  await signedInAs(page, 'editor', { [LIST]: list, [BATCH]: () => ({ json: batch() }), 'GET /v1/admin/content/uploads/b2': b2 });
  await page.goto('/uploads/b1');
  await expect(page.getByRole('heading', { level: 2, name: 'cefr-j-1.5.csv' })).toBeVisible();
  await expect.poll(() => panel(page).evaluate((el) => el.getAnimations().length)).toBe(0);
  await page.getByRole('table').getByText('two.csv').click();
  await expect(page).toHaveURL(/\/uploads\/b2$/);
  expect(await panel(page).evaluate((el) => el.getAnimations().length)).toBe(0);
  await expect(page.getByRole('heading', { level: 2, name: 'second.csv' })).toBeVisible();
});

test('UBE26 Back closes the panel and returns to /uploads', async ({ page }) => {
  desktopOnly();
  await signedInAs(page, 'editor', { [LIST]: list, [BATCH]: () => ({ json: batch() }) });
  await page.goto('/uploads');
  await page.getByRole('table').getByRole('link', { name: vi.uploads.open }).first().click();
  await expect(panel(page)).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/uploads$/);
  await expect(panel(page)).toHaveCount(0);
});

test('UBE27 the row\'s pill turns "Hoàn tất" when the panel\'s polling sees the batch finish', async ({ page }) => {
  desktopOnly();
  let lists = 0;
  let polls = 0;
  await signedInAs(page, 'editor', {
    [LIST]: () => {
      lists += 1;
      return { json: { items: [row('b1', 'one.csv', lists < 2 ? 'running' : 'succeeded')], next_page_token: null } };
    },
    [BATCH]: () => {
      polls += 1;
      return { json: polls < 2 ? batch({ status: 'running', counters: { processed: 100 }, finished_at: null }) : batch({ status: 'succeeded' }) };
    },
  });
  await page.goto('/uploads/b1');
  const pill = page.getByRole('table').getByRole('row', { name: /one\.csv/ });
  await expect(pill.getByText(vi.status.running, { exact: true })).toBeVisible();
  await expect(pill.getByText(vi.status.succeeded, { exact: true })).toBeVisible({ timeout: 8000 });
});

test('UBE29 at 390 the panel covers the screen and keeps focus inside', async ({ page }) => {
  test.skip(test.info().project.name !== 'mobile', 'phone layout');
  await signedInAs(page, 'editor', { [LIST]: list, [BATCH]: () => ({ json: batch() }) });
  await page.goto('/uploads/b1');
  const dialog = page.getByRole('dialog', { name: 'cefr-j-1.5.csv' });
  await expect(dialog).toBeVisible();
  await expect.poll(async () => Math.round((await dialog.boundingBox())!.width)).toBe(390);
  for (let i = 0; i < 10; i += 1) await page.keyboard.press('Tab');
  expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
});

test('Review Focus 1: Esc in the revert dialog over the side panel closes only the dialog', async ({ page }) => {
  desktopOnly();
  await signedInAs(page, 'editor', { [LIST]: list, [BATCH]: () => ({ json: batch() }) });
  await page.goto('/uploads/b1');
  await panel(page).getByRole('button', { name: t.revert }).click();
  const dialog = page.getByRole('dialog', { name: t.revertTitle.replace('{file}', 'cefr-j-1.5.csv') });
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(panel(page)).toBeVisible();
  await expect(page).toHaveURL(/\/uploads\/b1$/);
});

test('Review Focus 2: double-clicking a row leaves one history entry', async ({ page }) => {
  desktopOnly();
  await signedInAs(page, 'editor', { [LIST]: list, [BATCH]: () => ({ json: batch() }) });
  await page.goto('/uploads');
  await page.getByRole('table').getByText('one.csv').dblclick();
  await expect(page).toHaveURL(/\/uploads\/b1$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/uploads$/);
});

test('Review Focus 3: resizing 1280 → 1440 → 1280 with the panel open keeps it open with no leftover overlay', async ({ page }) => {
  desktopOnly();
  await page.setViewportSize({ width: 1280, height: 800 });
  await signedInAs(page, 'editor', { [LIST]: list, [BATCH]: () => ({ json: batch() }) });
  await page.goto('/uploads/b1');
  await expect(page.getByRole('dialog', { name: 'cefr-j-1.5.csv' })).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(panel(page)).toBeVisible();
  expect(await panel(page).evaluate((el) => el.tagName)).toBe('ASIDE');
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect(page.getByRole('dialog', { name: 'cefr-j-1.5.csv' })).toBeVisible();
  await expect(page.locator('[data-testid="detail-panel"]')).toHaveCount(1);
});

// Final review I2: the panel may only sit beside the table while the table stays a table (UB22).
for (const [width, beside] of [[1350, false], [1392, true]] as const) {
  test(`UB22 at ${width} with the panel open the list is still a table (${beside ? 'panel beside it' : 'panel over it'})`, async ({ page }) => {
    desktopOnly();
    await page.setViewportSize({ width, height: 800 });
    await signedInAs(page, 'editor', { [LIST]: list, [BATCH]: () => ({ json: batch() }) });
    await page.goto('/uploads/b1');
    await expect(panel(page)).toBeVisible();
    expect(await panel(page).evaluate((el) => el.tagName)).toBe(beside ? 'ASIDE' : 'SECTION');
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('[data-testid="card"]').first()).toBeHidden();
  });
}
