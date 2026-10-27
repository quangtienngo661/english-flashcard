import { expect, test, type Page } from '@playwright/test';
import en from '../messages/en.json' with { type: 'json' };
import vi from '../messages/vi.json' with { type: 'json' };
import { seriousViolations } from './support/axe';
import { mockApi, problem, signedInAs, type MockHandler } from './support/mock-api';
import { settingsMocks } from './support/settings';

/** Design §8: axe on every refreshed screen × VI/EN × 1440/390 (the two projects): no serious or critical violation. */

const at = '2026-10-14T09:30:00.000Z';
const JOB = 'a3f2c1aa-0000-4000-8000-000000000001';
const batch = {
  id: 'b1',
  status: 'partial',
  file_name: 'cefrj-vocabulary-profile-1.5.csv',
  row_count: 7799,
  counters: { processed: 7799, created: 7512, updated: 240, unchanged: 40, rejected: 7 },
  warnings: ['Dòng 12: bỏ dấu đã rà của revision 3f2a'],
  created_at: at,
  started_at: at,
  finished_at: at,
  reverted: false,
};
const job = { id: JOB, status: 'running', filter: { level: 'B1' }, snapshot_count: 1250, not_ready_count: 0, counters: { processed: 480, published: 480 }, created_at: at, started_at: at, finished_at: null };
const staffRow = { id: 'u9', email: 'new@wordmet.com', email_verified: true, staff_role: null };
const mocks: Record<string, MockHandler> = {
  'GET /v1/admin/content/uploads': () => ({ json: { items: [{ id: 'b1', status: 'partial', file_name: batch.file_name, row_count: 7799, created_at: at }], next_page_token: null } }),
  'GET /v1/admin/content/uploads/b1': () => ({ json: batch }),
  'GET /v1/admin/content/senses/publish-jobs': () => ({ json: { items: [job], next_page_token: null } }),
  [`GET /v1/admin/content/senses/publish-jobs/${JOB}`]: () => ({ json: job }),
  'GET /v1/admin/content/sources': () => ({ json: { items: [{ id: 's1', kind: 'third_party', name: 'CEFR-J Vocabulary Profile', version: '1.5', url: null, license: 'CC BY 4.0', attribution: '', display_priority: 10 }] } }),
  'GET /v1/admin/taxonomy/topics': () => ({ json: { items: [{ code: 'food', names: { vi: 'Ăn uống' }, archived_at: null }] } }),
  'GET /v1/admin/staff': () => ({ json: { items: [{ id: 'admin-1', email: 'admin@wordmet.com', email_verified: true, staff_role: 'admin' }], next_page_token: null } }),
  'GET /v1/admin/users': () => ({ json: staffRow }),
  'PUT /v1/admin/users/u9/staff-role': () => ({ json: { ...staffRow, staff_role: 'editor' } }),
  ...settingsMocks,
  'GET /v1/admin/transactions': () => ({ json: { items: [{
    id: 't1', kind: 'renewal', plan: 'pro', interval: 'month', amount_minor: 99000, currency: 'VND', occurred_at: at, period_start: at,
    period_end: '2026-11-14T09:30:00.000Z', status: 'pending', provider: 'fake', provider_transaction_id: 'fake_txn_8f2c41d9a7',
    user: { id: 'u1', email: 'lan@example.com' },
  }], next_page_token: null } }),
};

const pages = ['/uploads', '/uploads/b1', '/uploads/new', '/publish-jobs', `/publish-jobs/${JOB}`, '/sources', '/sources/new', '/export', '/ai/costs', '/transactions', '/settings', '/settings?tab=entitlements'];

for (const [lang, copy] of [['vi', vi], ['en', en]] as const) {
  test.describe(`axe (${lang})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((l) => localStorage.setItem('wordmet-admin.locale', l), lang);
    });

    test('the login page', async ({ page }) => {
      await mockApi(page, { 'POST /v1/auth/refresh': () => problem(401, 'invalid-token') });
      await page.goto('/login');
      await expect(page.getByRole('heading', { level: 1, name: copy.account.login.title })).toBeVisible();
      expect(await seriousViolations(page)).toEqual([]);
    });

    test('every signed-in screen, its panels and dialogs', async ({ page }) => {
      await signedInAs(page, 'admin', mocks);
      for (const path of pages) {
        await page.goto(path);
        await expect(page.getByRole('heading', { level: 1 })).toBeAttached();
        await waitForContent(page, path);
        expect(await seriousViolations(page), path).toEqual([]);
      }
    });

    test('the staff page with a role-change toast', async ({ page }) => {
      await signedInAs(page, 'admin', mocks);
      await page.goto('/staff');
      await page.getByLabel(copy.staff.search.label).fill(staffRow.email);
      await page.getByRole('button', { name: copy.staff.search.submit }).click();
      await page.getByRole('button', { name: copy.staff.card.grantEditor }).click();
      await page.getByRole('dialog').getByRole('button', { name: copy.common.confirm }).click();
      await expect(page.getByText(copy.staff.toast.granted.replace('{role}', 'editor').replace('{email}', staffRow.email))).toBeVisible();
      expect(await seriousViolations(page)).toEqual([]);
    });
  });
}

/** Wait until what a screen loads is on it, so axe does not scan a loading state. */
async function waitForContent(page: Page, path: string) {
  if (path.endsWith('/new')) await expect(page.getByRole('dialog')).toBeVisible();
  else if (path === '/uploads/b1') await expect(page.getByTestId('detail-panel').getByRole('heading', { level: 2, name: batch.file_name })).toBeVisible();
  else if (path.startsWith('/publish-jobs/')) await expect(page.getByTestId('detail-panel').getByRole('heading', { level: 2 })).toContainText('a3f2c1');
  else if (path === '/export' || path === '/ai/costs') await expect(page.getByRole('main')).toBeVisible();
  else if (path.startsWith('/settings')) await expect(page.getByRole('tabpanel').getByRole('heading', { level: 2 })).toBeVisible();
  else await expect(page.locator('tbody tr, [data-testid="card"]').first()).toBeAttached();
}
