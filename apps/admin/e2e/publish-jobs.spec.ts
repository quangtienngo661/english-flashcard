import { expect, test, type Page } from '@playwright/test';
import vi from '../messages/vi.json' with { type: 'json' };
import { requestCount, signedInAs } from './support/mock-api';
import { seriousViolations } from './support/axe';

test.use({ locale: 'vi-VN' });

const t = vi.publishJobs;
// The form is a dialog too (UB9): name the confirmation that opens over it.
// The form's own submit sits inside its dialog; the page head has a "Tạo publish job" button too.
const formButton = (page: Page) => page.getByRole('dialog', { name: t.formTitle }).getByRole('button', { name: t.create });
const confirmAll = (page: Page) => page.getByRole('dialog', { name: t.confirmAllTitle }).getByRole('button', { name: t.confirmAllSubmit }).click();
const JOBS = '/v1/admin/content/senses/publish-jobs';
const ID = 'a3f2c1aa-0000-4000-8000-000000000001';
const job = (over: Record<string, unknown> = {}) => ({
  id: ID,
  status: 'succeeded',
  filter: { level: 'B1', topic: 'food' },
  snapshot_count: 1250,
  not_ready_count: 0,
  counters: { processed: 1250, pending: 0, published: 1201, already_published: 37, refused: 12 },
  created_at: '2026-10-14T10:15:00.000Z',
  started_at: '2026-10-14T10:15:05.000Z',
  finished_at: '2026-10-14T10:16:00.000Z',
  ...over,
});
const base = {
  'GET /v1/admin/taxonomy/topics': () => ({ json: { items: [{ code: 'food', names: { vi: 'Ăn uống' }, archived_at: null }] } }),
  'GET /v1/admin/content/uploads': () => ({ json: { items: [], next_page_token: null } }),
};

const scan = (page: Page) => seriousViolations(page);

test('B25#18: a 429 with Retry-After 5 on create disables the button with a 5 s countdown, then frees it', async ({ page }) => {
  let limited = true;
  await signedInAs(page, 'editor', {
    ...base,
    [`POST ${JOBS}`]: () =>
      limited
        ? { status: 429, headers: { 'content-type': 'application/problem+json', 'retry-after': '5' }, json: { type: 'http://localhost:3000/problems/rate-limited', status: 429, title: 'x' } }
        : { status: 202, json: { job_id: ID } },
    [`GET ${JOBS}/${ID}`]: () => ({ json: job() }),
  });
  await page.goto('/publish-jobs/new');
  await formButton(page).click();
  await confirmAll(page);
  const locked = page.getByRole('button', { name: /Thử lại sau [1-5] giây/ });
  await expect(locked).toBeDisabled();
  await expect(formButton(page)).toBeEnabled({ timeout: 9000 });

  limited = false;
  await formButton(page).click();
  await confirmAll(page);
  await expect(page).toHaveURL(new RegExp(`/publish-jobs/${ID}$`));
  expect(requestCount(page, 'POST', JOBS)).toBe(2);
});

test('Review Focus 3: double-clicking "Tạo publish job" sends exactly one POST', async ({ page }) => {
  await signedInAs(page, 'editor', {
    ...base,
    [`POST ${JOBS}`]: async () => {
      await new Promise((resolve) => setTimeout(resolve, 400));
      return { status: 202, json: { job_id: ID } };
    },
    [`GET ${JOBS}/${ID}`]: () => ({ json: job() }),
  });
  await page.goto('/publish-jobs/new');
  await formButton(page).click();
  await page.getByRole('dialog', { name: t.confirmAllTitle }).getByRole('button', { name: t.confirmAllSubmit }).dblclick();
  await expect(page).toHaveURL(new RegExp(`/publish-jobs/${ID}$`));
  expect(requestCount(page, 'POST', JOBS)).toBe(1);
});

test('axe and overflow: publish job list, form and detail have no serious or critical violations', async ({ page }) => {
  await signedInAs(page, 'editor', {
    ...base,
    [`GET ${JOBS}`]: () => ({ json: { items: [job({ filter: { level: 'B1', topic: 'food', pos: 'modal auxiliary', batch_id: 'b1c2d3e4-0000-4000-8000-000000000003' } })], next_page_token: null } }),
    [`GET ${JOBS}/${ID}`]: () => ({ json: job() }),
  });
  for (const path of ['/publish-jobs', '/publish-jobs/new', `/publish-jobs/${ID}`]) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText(/#a3f2c1|Tạo publish job|Tải report/).first()).toBeVisible();
    expect(await scan(page), path).toEqual([]);
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({ scrollWidth: document.scrollingElement!.scrollWidth, clientWidth: document.scrollingElement!.clientWidth }));
    expect(scrollWidth, path).toBeLessThanOrEqual(clientWidth);
  }
});

test('UBE27 the job row turns "Hoàn tất" when the panel sees it finish', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop', 'one layout is enough');
  let lists = 0;
  let polls = 0;
  await signedInAs(page, 'editor', {
    ...base,
    [`GET ${JOBS}`]: () => {
      lists += 1;
      return { json: { items: [job({ status: lists < 2 ? 'running' : 'succeeded' })], next_page_token: null } };
    },
    [`GET ${JOBS}/${ID}`]: () => {
      polls += 1;
      return { json: polls < 2 ? job({ status: 'running', finished_at: null, counters: { processed: 10 } }) : job() };
    },
  });
  await page.goto(`/publish-jobs/${ID}`);
  const row = page.getByRole('table').getByRole('row', { name: /#a3f2c1/ });
  await expect(row.getByText(vi.status.running, { exact: true })).toBeVisible();
  await expect(row.getByText(vi.status.succeeded, { exact: true })).toBeVisible({ timeout: 8000 });
});

test('stopping a running job: the confirmation has no serious axe violations; confirming posts once and the job reads "Đã dừng"', async ({ page }) => {
  let stopped = false;
  const current = () => (stopped ? job({ status: 'failed', cancelled: true, counters: { processed: 480, pending: 770, published: 480, already_published: 0, refused: 0 } })
    : job({ status: 'running', finished_at: null, counters: { processed: 480, pending: 770, published: 480, already_published: 0, refused: 0 } }));
  await signedInAs(page, 'editor', {
    ...base,
    [`GET ${JOBS}`]: () => ({ json: { items: [current()], next_page_token: null } }),
    [`GET ${JOBS}/${ID}`]: () => ({ json: current() }),
    [`POST ${JOBS}/${ID}/cancel`]: () => {
      stopped = true;
      return { json: current() };
    },
  });
  await page.goto(`/publish-jobs/${ID}`);
  await page.getByTestId('detail-panel').getByRole('button', { name: t.stop }).click();
  const dialog = page.getByRole('dialog', { name: t.stopTitle.replace('{id}', 'a3f2c1') });
  await expect(dialog.getByText(t.stopBody)).toBeVisible();
  expect(await scan(page)).toEqual([]);
  await dialog.getByRole('button', { name: t.stop }).click();
  await expect(page.getByTestId('detail-panel').getByText(vi.status.cancelled, { exact: true })).toBeVisible();
  await expect(page.getByTestId('detail-panel').getByRole('button', { name: t.stop })).toHaveCount(0);
  expect(requestCount(page, 'POST', `${JOBS}/${ID}/cancel`)).toBe(1);
});

test('Review Focus 5: Back after "Publish lô này" in the batch panel reopens that batch and polls it again', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop', 'one layout is enough');
  const at = '2026-10-14T09:30:00.000Z';
  await signedInAs(page, 'editor', {
    ...base,
    'GET /v1/admin/content/uploads': () => ({ json: { items: [{ id: 'b1', status: 'succeeded', file_name: 'one.csv', row_count: 3, created_at: at }], next_page_token: null } }),
    'GET /v1/admin/content/uploads/b1': () => ({
      json: { id: 'b1', status: 'succeeded', file_name: 'one.csv', row_count: 3, counters: { processed: 3, created: 3, rejected: 0 }, warnings: [], created_at: at, started_at: at, finished_at: at, reverted: false },
    }),
    [`POST ${JOBS}`]: () => ({ status: 202, json: { job_id: ID } }),
    [`GET ${JOBS}`]: () => ({ json: { items: [job()], next_page_token: null } }),
    [`GET ${JOBS}/${ID}`]: () => ({ json: job() }),
  });
  await page.goto('/uploads/b1');
  await page.getByTestId('detail-panel').getByRole('button', { name: vi.batch.publish }).click();
  await expect(page).toHaveURL(new RegExp(`/publish-jobs/${ID}$`));
  await expect(page.getByRole('heading', { level: 2, name: t.jobTitle.replace('{id}', 'a3f2c1') })).toBeVisible();
  const before = requestCount(page, 'GET', '/v1/admin/content/uploads/b1');
  await page.goBack();
  await expect(page).toHaveURL(/\/uploads\/b1$/);
  await expect(page.getByRole('heading', { level: 2, name: 'one.csv' })).toBeVisible();
  await expect.poll(() => requestCount(page, 'GET', '/v1/admin/content/uploads/b1')).toBeGreaterThan(before);
});
