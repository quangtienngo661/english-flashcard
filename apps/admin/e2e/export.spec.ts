import { expect, test } from '@playwright/test';
import vi from '../messages/vi.json' with { type: 'json' };
import { problem, requests, signedInAs } from './support/mock-api';
import { seriousViolations } from './support/axe';

test.use({ locale: 'vi-VN' });

const t = vi.export;
const TOPICS = { items: [{ code: 'food', names: { vi: 'Ăn uống' }, archived_at: null }] };
const UPLOADS = { items: [{ id: 'b1', status: 'succeeded', file_name: 'cefr-j-1.5.csv', row_count: 3, created_at: '2026-10-14T09:30:00.000Z' }], next_page_token: null };
const EXPORT = 'GET /v1/admin/content/senses/export';

test('the download saves the API response as senses-<date>.csv', async ({ page }) => {
  await signedInAs(page, 'editor', {
    'GET /v1/admin/taxonomy/topics': () => ({ json: TOPICS }),
    'GET /v1/admin/content/uploads': () => ({ json: UPLOADS }),
    [EXPORT]: () => ({ headers: { 'content-type': 'text/csv' }, body: 'sense_id,headword\n1,cat\n' }),
  });
  await page.goto('/export');
  await page.getByRole('button', { name: new RegExp(t.level) }).click();
  await page.getByRole('option', { name: 'B1' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: t.download }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^senses-\d{4}-\d{2}-\d{2}\.csv$/);
  expect(requests(page, 'GET', '/v1/admin/content/senses/export')[0].query.get('level')).toBe('B1');
});

test('B25E12 (e2e): export-too-large shows the narrowing hint', async ({ page }) => {
  await signedInAs(page, 'editor', {
    'GET /v1/admin/taxonomy/topics': () => ({ json: TOPICS }),
    'GET /v1/admin/content/uploads': () => ({ json: UPLOADS }),
    [EXPORT]: () => problem(400, 'export-too-large'),
  });
  await page.goto('/export');
  await page.getByRole('button', { name: t.download }).click();
  await expect(page.getByText(vi.errors['export-too-large'])).toBeVisible();
});

test('axe: the export page has no serious or critical violations, also with a list open', async ({ page }) => {
  await signedInAs(page, 'editor', {
    'GET /v1/admin/taxonomy/topics': () => ({ json: TOPICS }),
    'GET /v1/admin/content/uploads': () => ({ json: UPLOADS }),
  });
  await page.goto('/export');
  await expect(page.getByRole('button', { name: t.download })).toBeVisible();
  const scan = () => seriousViolations(page);
  expect(await scan()).toEqual([]);
  await page.getByRole('button', { name: new RegExp(t.topic) }).click();
  await expect(page.getByRole('listbox')).toBeVisible();
  expect(await scan()).toEqual([]);
});
