import { expect, test, type Page } from '@playwright/test';
import vi from '../messages/vi.json' with { type: 'json' };
import { requestCount, requests, signedInAs } from './support/mock-api';
import { seriousViolations } from './support/axe';

test.use({ locale: 'vi-VN' });

const t = vi.uploads;
const UPLOADS = '/v1/admin/content/uploads';
const csv = (name: string) => ({ name, mimeType: 'text/csv', buffer: Buffer.from('pos,headword\nnoun,cat\n') });
const list = (items: unknown[]) => () => ({ json: { items, next_page_token: null } });
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const scan = (page: Page) => seriousViolations(page);

test('Review Focus 3: double-clicking "Upload" sends exactly one POST', async ({ page }) => {
  await signedInAs(page, 'editor', {
    [`GET ${UPLOADS}`]: list([]),
    [`POST ${UPLOADS}`]: async () => {
      await delay(400);
      return { status: 202, json: { batch_id: 'batch-1', status: 'queued' } };
    },
  });
  await page.goto('/uploads/new');
  await page.setInputFiles('input[type="file"]', csv('one.csv'));
  await page.getByRole('button', { name: t.submit, exact: true }).dblclick();
  await expect(page).toHaveURL(/\/uploads\/batch-1$/);
  expect(requestCount(page, 'POST', UPLOADS)).toBe(1);
});

test('upload success navigates to /uploads/<batch_id>, with a key and the file in the multipart body', async ({ page }) => {
  await signedInAs(page, 'editor', {
    [`GET ${UPLOADS}`]: list([]),
    [`POST ${UPLOADS}`]: () => ({ status: 202, json: { batch_id: 'batch-7', status: 'queued' } }),
  });
  await page.goto('/uploads');
  await page.getByRole('button', { name: t.upload }).click();
  await expect(page.getByRole('dialog', { name: t.formTitle })).toBeVisible();
  await page.setInputFiles('input[type="file"]', csv('seven.csv'));
  await page.getByRole('button', { name: t.submit, exact: true }).click();
  await expect(page).toHaveURL(/\/uploads\/batch-7$/);
  const [post] = requests(page, 'POST', UPLOADS);
  expect(post.headers['idempotency-key']).toMatch(/^[0-9a-f-]{36}$/);
  expect(String(post.body)).toContain('filename="seven.csv"');
});

test('axe: sources list and form, uploads list and form (with a file) have no serious or critical violations', async ({ page }) => {
  await signedInAs(page, 'editor', {
    'GET /v1/admin/content/sources': () => ({
      json: { items: [{ id: 's1', kind: 'third_party', name: 'CEFR-J Vocabulary Profile', version: '1.5', url: null, license: 'CC BY 4.0', attribution: '', display_priority: 10 }] },
    }),
    [`GET ${UPLOADS}`]: list([{ id: 'b1', status: 'succeeded', file_name: 'cefr-j-1.5.csv', row_count: 3200, created_at: '2026-10-14T09:30:00.000Z' }]),
  });
  await page.goto('/sources');
  await expect(page.getByText('CEFR-J Vocabulary Profile').first()).toBeAttached();
  expect(await scan(page)).toEqual([]);

  await page.goto('/sources/new');
  await expect(page.getByLabel(`${vi.sources.form.name} *`)).toBeVisible();
  expect(await scan(page)).toEqual([]);

  await page.goto('/uploads');
  await expect(page.getByText('cefr-j-1.5.csv').first()).toBeAttached();
  expect(await scan(page)).toEqual([]);

  await page.goto('/uploads/new');
  await page.setInputFiles('input[type="file"]', csv('level.csv'));
  await expect(page.getByText('level.csv')).toBeVisible();
  expect(await scan(page)).toEqual([]);
});

test('Review Focus 2: a 60-character file name at 390 does not widen the page', async ({ page }) => {
  const long = `${'x'.repeat(56)}.csv`;
  await signedInAs(page, 'editor', {
    [`GET ${UPLOADS}`]: list([{ id: 'b1', status: 'partial', file_name: long, row_count: 12, created_at: '2026-10-14T09:30:00.000Z' }]),
  });
  await page.goto('/uploads');
  await expect(page.getByText(long).first()).toBeAttached();
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({ scrollWidth: document.scrollingElement!.scrollWidth, clientWidth: document.scrollingElement!.clientWidth }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  await page.goto('/uploads/new');
  await page.setInputFiles('input[type="file"]', csv(long));
  await expect(page.getByRole('dialog', { name: t.formTitle }).getByText(long)).toBeVisible();
  const again = await page.evaluate(() => ({ scrollWidth: document.scrollingElement!.scrollWidth, clientWidth: document.scrollingElement!.clientWidth }));
  expect(again.scrollWidth).toBeLessThanOrEqual(again.clientWidth);
});

const batchView = (id: string, file_name: string) => ({
  id,
  status: 'queued',
  file_name,
  row_count: 0,
  counters: {},
  warnings: [],
  created_at: '2026-10-14T09:30:00.000Z',
  started_at: null,
  finished_at: null,
  reverted: false,
});

test('UBC13 a successful upload closes the dialog and opens the batch panel', async ({ page }) => {
  await signedInAs(page, 'editor', {
    [`GET ${UPLOADS}`]: list([]),
    [`POST ${UPLOADS}`]: () => ({ status: 202, json: { batch_id: 'batch-1', status: 'queued' } }),
    [`GET ${UPLOADS}/batch-1`]: () => ({ json: batchView('batch-1', 'one.csv') }),
  });
  await page.goto('/uploads/new');
  const dialog = page.getByRole('dialog', { name: t.formTitle });
  await page.setInputFiles('input[type="file"]', csv('one.csv'));
  await dialog.getByRole('button', { name: t.submit, exact: true }).click();
  await expect(page).toHaveURL(/\/uploads\/batch-1$/);
  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId('detail-panel').getByRole('heading', { level: 2, name: 'one.csv' })).toBeVisible();
});

test('UBE30 Back during a pending upload closes the dialog; the panel opens when the POST returns', async ({ page }) => {
  await signedInAs(page, 'editor', {
    [`GET ${UPLOADS}`]: list([]),
    [`POST ${UPLOADS}`]: async () => {
      await delay(800);
      return { status: 202, json: { batch_id: 'batch-1', status: 'queued' } };
    },
    [`GET ${UPLOADS}/batch-1`]: () => ({ json: batchView('batch-1', 'one.csv') }),
  });
  await page.goto('/uploads');
  await page.getByRole('button', { name: t.upload }).click();
  await page.setInputFiles('input[type="file"]', csv('one.csv'));
  await page.getByRole('dialog', { name: t.formTitle }).getByRole('button', { name: t.submit, exact: true }).click();
  await page.goBack();
  await expect(page).toHaveURL(/\/uploads$/);
  await expect(page.getByRole('dialog', { name: t.formTitle })).toHaveCount(0);
  await expect(page).toHaveURL(/\/uploads\/batch-1$/, { timeout: 5000 });
  await expect(page.getByTestId('detail-panel').getByRole('heading', { level: 2, name: 'one.csv' })).toBeVisible();
});

test('Esc and a click outside do not close the dialog while the upload is pending', async ({ page }) => {
  await signedInAs(page, 'editor', {
    [`GET ${UPLOADS}`]: list([]),
    [`POST ${UPLOADS}`]: async () => {
      await delay(1500);
      return { status: 202, json: { batch_id: 'batch-1', status: 'queued' } };
    },
    [`GET ${UPLOADS}/batch-1`]: () => ({ json: batchView('batch-1', 'one.csv') }),
  });
  await page.goto('/uploads/new');
  const dialog = page.getByRole('dialog', { name: t.formTitle });
  await page.setInputFiles('input[type="file"]', csv('one.csv'));
  await dialog.getByRole('button', { name: t.submit, exact: true }).click();
  await page.keyboard.press('Escape');
  await page.mouse.click(5, 5);
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(/\/uploads\/new$/);
  await expect(page).toHaveURL(/\/uploads\/batch-1$/, { timeout: 5000 });
});

test('UBE31 after upload the dialog closes and the panel opens with no overlay left', async ({ page }) => {
  await signedInAs(page, 'editor', {
    [`GET ${UPLOADS}`]: list([]),
    [`POST ${UPLOADS}`]: () => ({ status: 202, json: { batch_id: 'batch-1', status: 'queued' } }),
    [`GET ${UPLOADS}/batch-1`]: () => ({ json: batchView('batch-1', 'one.csv') }),
  });
  await page.goto('/uploads/new');
  await page.setInputFiles('input[type="file"]', csv('one.csv'));
  await page.getByRole('dialog', { name: t.formTitle }).getByRole('button', { name: t.submit, exact: true }).click();
  await expect(page).toHaveURL(/\/uploads\/batch-1$/);
  await page.waitForTimeout(400);
  await expect(page.locator('[data-exiting]')).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: t.formTitle })).toHaveCount(0);
  await expect(page.getByTestId('detail-panel')).toHaveCount(1);
});
