import { expect, test, type Page } from '@playwright/test';
import { copy } from '../copy';
import { seriousViolations } from '../support/axe';
import { entitlementsBody } from '../support/fixtures';
import { requestCount, signedInAs, type MockHandler } from '../support/mock-api';

const vi = copy.vi.App.transactions;
const LONG_TX = `fake_txn_${'9'.repeat(60)}`;
const row = (id: string, fields: Record<string, unknown> = {}) => ({
  id, kind: 'renewal', plan: 'pro', interval: 'month', amount_minor: 99000, currency: 'VND', occurred_at: '2026-10-15T02:12:00.000Z',
  period_start: '2026-10-15T02:12:00.000Z', period_end: '2026-11-15T02:12:00.000Z', status: 'succeeded', provider: 'fake',
  provider_transaction_id: 'fake_txn_8f2c41d9a7', ...fields,
});
const ITEMS = [
  row('g1', { kind: 'grant', interval: null, amount_minor: null, currency: null, occurred_at: '2026-10-20T03:00:00.000Z',
    period_start: '2026-10-20T03:00:00.000Z', period_end: '2026-12-31T17:00:00.000Z', provider: null, provider_transaction_id: null }),
  row('t1', { status: 'pending', provider_transaction_id: LONG_TX }),
  row('t2', { kind: 'refund', occurred_at: '2026-09-16T03:00:00.000Z', status: 'reversed' }),
  row('t3', { kind: 'plan_change', interval: 'year', amount_minor: 990000, occurred_at: '2026-09-15T03:00:00.000Z',
    period_start: '2026-09-15T03:00:00.000Z', period_end: '2027-09-15T03:00:00.000Z', status: 'refunded' }),
  row('t4', { kind: 'purchase', occurred_at: '2026-08-15T03:00:00.000Z' }),
];

function api(items: unknown[] = ITEMS): Record<string, MockHandler> {
  return {
    'GET /v1/me/entitlements': () => {
      const body = entitlementsBody('pro');
      return { json: { ...body, sources: [{ kind: 'grant_plan', id: 'g1', status: null, starts_at: '2026-10-20T03:00:00.000Z',
        ends_at: '2026-12-31T17:00:00.000Z', renews_at: null, cancel_at_period_end: null, pending_interval: null }] } };
    },
    'GET /v1/me/transactions': () => ({ json: { items, next_page_token: null } }),
  };
}

async function noSideScroll(page: Page, where: string) {
  const wide = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(wide, where).toBe(false);
}

test.describe('M4b flows (mocked API)', () => {
  test('Cài đặt → Lịch sử giao dịch: the list, a row\'s detail, Đóng', async ({ page }) => {
    await signedInAs(page, 'pro', api());
    await page.goto('/vi/app/settings');
    await page.getByRole('link', { name: copy.vi.App.settings.transactions }).click();
    await expect(page).toHaveURL(/\/vi\/app\/settings\/transactions$/);
    await expect(page.getByRole('heading', { level: 1, name: vi.title })).toBeVisible();
    await page.getByRole('button', { name: /^Gia hạn, 15\/10\/2026/ }).click();
    const dialog = page.getByRole('dialog', { name: vi.detail.title });
    await expect(dialog.getByText(vi.providers.fake)).toBeVisible();
    await expect(dialog.getByText(LONG_TX)).toBeVisible();
    await dialog.getByRole('button', { name: vi.detail.close }).click();
    await expect(dialog).toBeHidden();
    expect(requestCount(page, 'GET', '/v1/me/transactions')).toBe(1);
  });

  test('K/95c: no transactions yet', async ({ page }) => {
    await signedInAs(page, 'free', api([]));
    await page.goto('/vi/app/settings/transactions');
    await expect(page.getByText(vi.emptyTitle)).toBeVisible();
  });
});

for (const scheme of ['light', 'dark'] as const) {
  for (const locale of ['vi', 'en'] as const) {
    test(`axe and overflow: transaction history and its detail (${locale}, ${scheme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await signedInAs(page, 'pro', api(), { native_language: locale });
      await page.goto(`/${locale}/app/settings/transactions`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByRole('list').getByRole('button').first()).toBeVisible();
      await noSideScroll(page, `${locale} list`);
      expect(await seriousViolations(page), `${locale} list`).toEqual([]);
      await page.getByRole('list').getByRole('button').nth(1).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await noSideScroll(page, `${locale} detail`);
      expect(await seriousViolations(page), `${locale} detail`).toEqual([]);
    });
  }
}
