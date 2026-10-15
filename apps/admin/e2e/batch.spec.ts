import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import vi from '../messages/vi.json' with { type: 'json' };
import { requestCount, signedInAs } from './support/mock-api';

test.use({ locale: 'vi-VN' });

const t = vi.batch;
const BATCH = 'GET /v1/admin/content/uploads/b1';
const REVERT = 'POST /v1/admin/content/uploads/b1/revert';
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const batch = (over: Record<string, unknown> = {}) => ({
  id: 'b1',
  status: 'partial',
  file_name: 'cefr-j-1.5.csv',
  row_count: 3200,
  counters: { processed: 3200, created: 1500, updated: 400, unchanged: 250, rejected: 1050 },
  warnings: ['Dòng 12: bỏ dấu đã rà của revision 3f2a…', `Dòng 37: ${'x'.repeat(200)}`],
  created_at: '2026-10-14T09:30:00.000Z',
  started_at: '2026-10-14T09:30:05.000Z',
  finished_at: '2026-10-14T09:33:00.000Z',
  reverted: false,
  ...over,
});

test('Review Focus 3: double-clicking the revert dialog\'s confirm sends exactly one POST', async ({ page }) => {
  let reverted = false;
  await signedInAs(page, 'editor', {
    [BATCH]: () => ({ json: batch({ reverted }) }),
    [REVERT]: async () => {
      await delay(400);
      reverted = true;
      return { json: { report: { removed: { entry: 1, variant: 0, level: 0, sense: 2, revision: 2 }, skipped: [] } } };
    },
  });
  await page.goto('/uploads/b1');
  await page.getByRole('button', { name: t.revert }).click();
  await page.getByRole('dialog').getByRole('button', { name: t.revert }).dblclick();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByText(t.revertedNotice)).toBeVisible();
  expect(requestCount(page, 'POST', '/v1/admin/content/uploads/b1/revert')).toBe(1);
});

test('axe: the batch page (partial, long warning) and its revert dialog have no serious or critical violations; no sideways scroll', async ({ page }) => {
  await signedInAs(page, 'editor', { [BATCH]: () => ({ json: batch() }) });
  await page.goto('/uploads/b1');
  await expect(page.getByRole('heading', { level: 2, name: 'cefr-j-1.5.csv' })).toBeVisible();
  const scan = async () => {
    const results = await new AxeBuilder({ page }).analyze();
    return results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
  };
  expect(await scan()).toEqual([]);
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({ scrollWidth: document.scrollingElement!.scrollWidth, clientWidth: document.scrollingElement!.clientWidth }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);

  await page.getByRole('button', { name: t.revert }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await scan()).toEqual([]);
});

test('B25#13 (e2e): a running batch is refreshed by itself and the page ends on the final status', async ({ page }) => {
  let polls = 0;
  await signedInAs(page, 'editor', {
    [BATCH]: () => {
      polls += 1;
      return { json: polls < 2 ? batch({ status: 'running', counters: { processed: 100 }, finished_at: null }) : batch({ status: 'succeeded' }) };
    },
  });
  await page.goto('/uploads/b1');
  await expect(page.getByText(/Đang xử lý/)).toBeVisible();
  await expect(page.getByText(vi.status.succeeded, { exact: true })).toBeVisible({ timeout: 8000 });
});
