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
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(t.formTitle);
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
  await expect(page.getByText(long)).toBeVisible();
  const again = await page.evaluate(() => ({ scrollWidth: document.scrollingElement!.scrollWidth, clientWidth: document.scrollingElement!.clientWidth }));
  expect(again.scrollWidth).toBeLessThanOrEqual(again.clientWidth);
});
