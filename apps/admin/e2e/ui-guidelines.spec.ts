import { expect, test, type Page } from '@playwright/test';
import en from '../messages/en.json' with { type: 'json' };
import vi from '../messages/vi.json' with { type: 'json' };
import { signedInAs } from './support/mock-api';

/** Defects found by the Web Interface Guidelines review (15/10/2026); each test sets its own viewport. */
test.use({ locale: 'vi-VN' });
test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'sets its own viewport'));

/** Nothing sideways: the page is no wider than the window (Review Focus 4). */
async function expectNoHorizontalScroll(page: Page) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
}

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

test('Checkpoint A: on a 1920 screen the Sources columns share the width instead of piling up on the right', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 900 });
  const source = (id: string, name: string, version: string, license: string) => ({ id, kind: 'third_party', name, version, url: null, license, attribution: '', display_priority: 100 });
  await signedInAs(page, 'editor', {
    'GET /v1/admin/content/sources': () => ({
      json: { items: [source('s1', 'CEFR-J Vocabulary Profile', '1.5', 'CEFR-J terms of use (research/education)'), source('s2', 'Oxford 3000', '2025', 'CC BY 4.0')] },
    }),
  });
  await page.goto('/sources');
  const table = page.getByRole('table');
  await expect(table.getByText('Oxford 3000')).toBeVisible();
  const width = (await table.boundingBox())!.width;
  const shares = await table.locator('thead th').evaluateAll((ths, total) => ths.map((th) => th.getBoundingClientRect().width / (total as number)), width);
  expect(shares[0]).toBeLessThanOrEqual(0.41);
  for (const share of shares.slice(1)) expect(share).toBeGreaterThanOrEqual(0.19);
});

const at = '2026-10-14T09:30:00.000Z';
const wideLists = {
  '/uploads': {
    mocks: { 'GET /v1/admin/content/uploads': () => ({ json: { items: [{ id: 'b1', status: 'running', file_name: 'cefrj-vocabulary-profile-1.5.csv', row_count: 7799, created_at: at }], next_page_token: null } }) },
    shares: [0.4, 0.15, 0.15, 0.2, 0.1],
  },
  '/publish-jobs': {
    mocks: {
      'GET /v1/admin/content/senses/publish-jobs': () => ({
        json: {
          items: [{ id: 'a3f2c1aa-0000-4000-8000-000000000001', status: 'succeeded', filter: { level: 'B1', topic: 'food' }, snapshot_count: 1250, not_ready_count: 0, counters: {}, created_at: at, started_at: at, finished_at: at }],
          next_page_token: null,
        },
      }),
    },
    shares: [0.15, 0.4, 0.15, 0.15, 0.15],
  },
  '/staff': {
    mocks: { 'GET /v1/admin/staff': () => ({ json: { items: [{ id: 'admin-1', email: 'admin@wordmet.com', email_verified: true, staff_role: 'admin' }, { id: 'e1', email: 'lan.editor@wordmet.com', email_verified: false, staff_role: 'editor' }], next_page_token: null } }) },
    shares: [0.4, 0.2, 0.2, 0.2],
  },
} as const;

for (const [path, { mocks, shares }] of Object.entries(wideLists)) {
  test(`Checkpoint A: at 1920 the ${path} columns take their planned shares instead of piling up on the right`, async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 900 });
    await signedInAs(page, 'admin', mocks);
    await page.goto(path);
    const table = page.getByRole('table');
    await expect(table.locator('tbody tr').first()).toBeVisible();
    const width = (await table.boundingBox())!.width;
    const actual = await table.locator('thead th').evaluateAll((ths, total) => ths.map((th) => th.getBoundingClientRect().width / (total as number)), width);
    expect(actual.map((share, i) => Math.abs(share - shares[i]) <= 0.03)).toEqual(shares.map(() => true));
  });

  test(`Checkpoint A: at 1024 the ${path} table fits its sheet and its short cells stay on one line`, async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 800 });
    await signedInAs(page, 'admin', mocks);
    await page.goto(path);
    const table = page.getByRole('table');
    await expect(table.locator('tbody tr').first()).toBeVisible();
    const fits = await table.evaluate((el) => el.getBoundingClientRect().width <= el.parentElement!.getBoundingClientRect().width + 1);
    expect(fits).toBe(true);
    // Every cell but the first two (names and filters wrap on purpose) renders on a single line.
    const multiLine = await table.locator('tbody td').evaluateAll((tds) =>
      tds
        .filter((td) => (td as HTMLTableCellElement).cellIndex >= 2 || td.textContent!.startsWith('#'))
        .filter((td) => {
          // A text node that wraps returns one rect per line; padded pills and buttons around it do not count.
          const walker = document.createTreeWalker(td, NodeFilter.SHOW_TEXT);
          for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            const range = document.createRange();
            range.selectNodeContents(node);
            if (new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size > 1) return true;
          }
          return false;
        })
        .map((td) => td.textContent),
    );
    expect(multiLine).toEqual([]);
  });
}

for (const width of [1440, 1280]) {
  test(`UBE35 at ${width} a 60-character file name wraps inside the panel title, "Chi tiết" stays on one line and nothing scrolls sideways`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const long = `cefrj-vocabulary-profile-${'x'.repeat(31)}.csv`;
    expect(long).toHaveLength(60);
    await signedInAs(page, 'editor', {
      'GET /v1/admin/content/uploads': () => ({ json: { items: [{ id: 'b1', status: 'partial', file_name: long, row_count: 12, created_at: at }], next_page_token: null } }),
      'GET /v1/admin/content/uploads/b1': () => ({
        json: { id: 'b1', status: 'partial', file_name: long, row_count: 12, counters: { processed: 12, created: 10, rejected: 2 }, warnings: [], created_at: at, started_at: at, finished_at: at, reverted: false },
      }),
    });
    await page.goto('/uploads/b1');
    const panel = page.getByTestId('detail-panel');
    const title = panel.getByRole('heading', { level: 2, name: long });
    await expect(title).toBeVisible();
    const [titleBox, panelBox] = [(await title.boundingBox())!, (await panel.boundingBox())!];
    expect(titleBox.x + titleBox.width).toBeLessThanOrEqual(panelBox.x + panelBox.width);
    const open = page.locator('table').getByRole('link', { name: vi.uploads.open, includeHidden: true });
    const lines = await open.evaluate((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      return new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size;
    });
    expect(lines).toBe(1);
    const { scrollWidth, clientWidth } = await page.evaluate(() => ({ scrollWidth: document.scrollingElement!.scrollWidth, clientWidth: document.scrollingElement!.clientWidth }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
}

test('the no-access page at 390 fits the window and its text and button are in view', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signedInAs(page, 'editor', listMocks);
  await page.goto('/staff');
  await expect(page.getByText(vi.noAccess.title)).toBeVisible();
  await expect(page.getByRole('button', { name: vi.noAccess.home })).toBeVisible();
  await expectNoHorizontalScroll(page);
});

test('Tình trạng at 390 fits the window with six operations, a warning and a last error', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const ops = ['generate_cloze', 'lookup_word', 'translate_sentence', 'generate_meaning_question', 'generate_sentence_mcq', 'check_private_word'];
  await signedInAs(page, 'admin', {
    'GET /v1/admin/ai/status': () => ({
      json: {
        operations: ops.map((operation, i) => ({
          operation, ready: i === 0, reason: i === 0 ? null : 'provider-not-configured', model: { provider: 'anthropic', model_id: 'claude-sonnet-long-model-id-20261130' },
          effort: null, thinking: null, max_output_tokens: null,
          last_error: i === 1 ? { at, outcome: 'provider-unavailable-timeout', http_status: 504, purpose: 'test' } : null,
          model_warning: i === 0 ? { shutdown_at: '2026-11-30T00:00:00.000Z', lifecycle: 'deprecated' } : null,
        })),
        today: { calls: 1240, cap: 3000, failed_calls: 12, failed_cost_usd: '0.0400', cost_usd: '2.3100', cost_vnd: 60291 },
        ai_enabled: true,
        providers: { openai: true, anthropic: true, fake: true },
      },
    }),
  });
  await page.goto('/ai/status');
  await expect(page.getByText('Lời gọi hôm nay: 1.240/3.000')).toBeVisible();
  await expectNoHorizontalScroll(page);
});
