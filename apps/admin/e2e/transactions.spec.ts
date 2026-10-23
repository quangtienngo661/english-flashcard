import { expect, test, type Page } from '@playwright/test';
import vi from '../messages/vi.json' with { type: 'json' };
import { seriousViolations } from './support/axe';
import { signedInAs, type MockRequest } from './support/mock-api';

const t = vi.transactions;
const row = {
  id: 't1', kind: 'renewal', plan: 'pro', interval: 'month', amount_minor: 99000, currency: 'VND', occurred_at: '2026-10-15T02:12:00.000Z',
  period_start: '2026-10-15T02:12:00.000Z', period_end: '2026-11-15T02:12:00.000Z', status: 'pending', provider: 'fake',
  provider_transaction_id: 'fake_txn_8f2c41d9a7', user: { id: '6b1f0000-0000-4000-8000-00000000e42a', email: 'lan@example.com' },
};
const uploads = { json: { items: [], next_page_token: null } };

async function openNavIfCollapsed(page: Page) {
  if ((page.viewportSize()?.width ?? 0) < 1024) await page.getByRole('button', { name: vi.shell.openMenu }).click();
}

test.describe('Giao dịch (A/90)', () => {
  test.use({ locale: 'vi-VN' });

  test('admin: menu → list → filter sends the Vietnam day boundaries → detail; axe clean', async ({ page }) => {
    const seen: MockRequest[] = [];
    await signedInAs(page, 'admin', {
      'GET /v1/admin/content/uploads': () => uploads,
      'GET /v1/admin/transactions': (req) => {
        seen.push(req);
        return { json: { items: [row], next_page_token: null } };
      },
    });
    await page.goto('/uploads');
    await openNavIfCollapsed(page);
    await page.getByRole('navigation', { name: vi.shell.mainNav }).getByRole('link', { name: vi.nav.transactions }).click();
    await expect(page.getByRole('heading', { level: 1, name: vi.nav.transactions })).toBeVisible();
    await expect(page.getByText('lan@example.com').filter({ visible: true }).first()).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);

    await page.getByLabel(t.filters.email).fill('lan@example.com');
    await page.getByLabel(t.filters.from).fill('2026-10-01');
    await page.getByLabel(t.filters.to).fill('2026-10-23');
    await page.getByRole('button', { name: t.filters.apply }).click();
    await expect.poll(() => seen.length).toBe(2);
    expect(Object.fromEntries(seen[1].query)).toEqual({
      email: 'lan@example.com', from: '2026-10-01T00:00:00+07:00', to: '2026-10-24T00:00:00+07:00', page_size: '50',
    });

    await page.getByRole('button', { name: t.detailFor.replace('{email}', 'lan@example.com') }).filter({ visible: true }).first().click();
    const dialog = page.getByRole('dialog', { name: t.detail.title });
    await expect(dialog.getByText('fake_txn_8f2c41d9a7')).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
    await dialog.getByRole('button', { name: t.detail.close }).click();
    await expect(dialog).toBeHidden();
  });

  test('editor: no menu entry, and /transactions sends them home without calling the API', async ({ page }) => {
    let calls = 0;
    await signedInAs(page, 'editor', {
      'GET /v1/admin/content/uploads': () => uploads,
      'GET /v1/admin/transactions': () => {
        calls += 1;
        return { json: { items: [], next_page_token: null } };
      },
    });
    await page.goto('/transactions');
    await expect(page).toHaveURL(/\/uploads$/);
    await openNavIfCollapsed(page);
    await expect(page.getByRole('navigation', { name: vi.shell.mainNav }).getByRole('link', { name: vi.nav.transactions })).toHaveCount(0);
    expect(calls).toBe(0);
  });
});
