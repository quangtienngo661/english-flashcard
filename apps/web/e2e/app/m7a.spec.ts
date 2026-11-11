import { expect, test, type Page } from '@playwright/test';
import { seriousViolations } from '../support/axe';
import { meBody, requests, signedInAs, type MockHandler } from '../support/mock-api';

// M7a journey (plan Part 7, Task M7.7): Cài đặt → Lịch sử giao dịch → a row's detail → Esc puts focus back on the row; Cài đặt → Ngôn ngữ →
// English; Xóa tài khoản with a password ends on the account-deleted page; axe on every M7a screen; no sideways scroll at 390.
const tx = (id: string, fields: Record<string, unknown> = {}) => ({
  id, kind: 'purchase', plan: 'pro', interval: 'quarter', amount_minor: 199000, currency: 'VND', occurred_at: '2026-11-01T13:14:00.000Z',
  period_start: '2026-11-08T03:00:00.000Z', period_end: '2027-02-08T03:00:00.000Z', status: 'succeeded', provider: 'payos',
  provider_transaction_id: 'payos_8f2c41d9a7', ...fields,
});
const ITEMS = [
  tx('t1'),
  tx('t2', { occurred_at: '2026-08-08T03:00:00.000Z', period_start: '2026-08-08T03:00:00.000Z', period_end: '2026-11-08T03:00:00.000Z' }),
  tx('t3', { kind: 'grant', interval: null, amount_minor: null, currency: null, occurred_at: '2026-06-15T03:00:00.000Z', period_start: '2026-06-15T03:00:00.000Z',
    period_end: '2026-07-15T03:00:00.000Z', provider: null, provider_transaction_id: null }),
];
const api = (): Record<string, MockHandler> => ({ 'GET /v1/me/transactions': () => ({ json: { items: ITEMS, next_page_token: null } }) });

async function noSideScroll(page: Page, where: string) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), where).toBe(true);
}

test('Cài đặt → Lịch sử giao dịch → a row → its detail → Esc puts focus back on the row', async ({ page }) => {
  await signedInAs(page, 'pro', api());
  await page.goto('/vi/app/settings');
  await expect(page.getByRole('heading', { level: 1, name: 'Cài đặt' })).toBeVisible();
  expect(await seriousViolations(page), 'settings').toEqual([]);
  await noSideScroll(page, 'settings');

  await page.getByRole('link', { name: 'Xem Lịch sử giao dịch' }).click();
  await expect(page).toHaveURL(/\/vi\/app\/settings\/transactions$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Lịch sử giao dịch' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'tháng 11, 2026' })).toBeVisible();
  const row = page.getByRole('button', { name: /^Mua · Pro · 3 tháng, 01\/11\/2026, 199\.000 ₫, dùng 08\/11\/2026 – 07\/02\/2027, Thành công/ });
  await expect(row).toBeVisible();
  expect(await seriousViolations(page), 'transactions').toEqual([]);
  await noSideScroll(page, 'transactions');

  await row.click();
  const detail = page.getByRole('dialog', { name: 'Chi tiết giao dịch' });
  await expect(detail.getByText('mua · pro · 3 tháng')).toBeVisible();
  await expect(detail.getByText('01/11/2026, 20:14')).toBeVisible();
  await expect(detail.getByText('payOS', { exact: true })).toBeVisible();
  await expect(detail.getByText('payos_8f2c41d9a7')).toBeVisible();
  expect(await seriousViolations(page), 'detail').toEqual([]);
  await noSideScroll(page, 'detail');

  await page.keyboard.press('Escape');
  await expect(detail).toBeHidden();
  await expect(row).toBeFocused();
});

test('Cài đặt → Ngôn ngữ → English opens /en/app/settings in English', async ({ page }) => {
  let me = meBody({ native_language: 'vi' });
  await signedInAs(page, 'pro', {
    'GET /v1/me': () => ({ json: me }),
    'PATCH /v1/me': (req) => {
      me = { ...me, ...(req.body as Record<string, unknown>) };
      return { json: me };
    },
  });
  await page.goto('/vi/app/settings');
  await page.getByRole('button', { name: /Ngôn ngữ/ }).click();
  await page.getByRole('option', { name: 'English', exact: true }).click();
  await expect(page).toHaveURL(/\/en\/app\/settings$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
  // The app also syncs the browser's time zone with its own PATCH; only the language change is pinned here.
  expect(requests(page, 'PATCH', '/v1/me').map((r) => r.body).filter((b) => 'native_language' in (b as object))).toEqual([{ native_language: 'en' }]);
});

test('Tài khoản: axe and no sideways scroll', async ({ page }) => {
  await signedInAs(page, 'pro');
  await page.goto('/vi/app/settings/account');
  await expect(page.getByRole('heading', { level: 1, name: 'Tài khoản' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Tên' })).toHaveValue('Lan');
  expect(await seriousViolations(page)).toEqual([]);
  await noSideScroll(page, 'account');
});

test('Xóa tài khoản with a password: tick, email, password, "Xóa vĩnh viễn" → the account-deleted page', async ({ page }) => {
  await signedInAs(page, 'free');
  await page.goto('/vi/app/settings/delete-account');
  await expect(page.getByRole('heading', { level: 1, name: 'Xóa tài khoản' })).toBeVisible();
  expect(await seriousViolations(page)).toEqual([]);
  await noSideScroll(page, 'delete-account');

  const submit = page.getByRole('button', { name: 'Xóa vĩnh viễn' });
  await expect(submit).toBeDisabled();
  // The checkbox input is visually hidden (React Aria); click its label.
  await page.getByText('Tôi hiểu dữ liệu sẽ mất và không khôi phục được').click();
  await expect(page.getByRole('checkbox', { name: 'Tôi hiểu dữ liệu sẽ mất và không khôi phục được' })).toBeChecked();
  await page.getByRole('textbox', { name: 'Gõ lại email của bạn' }).fill('lan@example.com');
  await page.getByLabel('Mật khẩu', { exact: true }).fill('Secret#123');
  await submit.click();
  await expect(page).toHaveURL(/\/vi\/app\/account-deleted$/);
  await expect(page.getByRole('heading', { name: 'Tài khoản của bạn đã được xóa.' })).toBeVisible();
  expect(requests(page, 'POST', '/v1/me/account/delete').map((r) => r.body)).toEqual([
    { confirm_email: 'lan@example.com', acknowledged: true, password: 'Secret#123' },
  ]);
});

test('Mục lục at 1440: "Tài khoản" is marked at the bottom of the page and after pressing it', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'the Mục lục shows from lg only');
  await signedInAs(page, 'pro');
  await page.goto('/vi/app/settings');
  const toc = page.getByRole('navigation', { name: 'Mục lục' });
  const account = toc.getByRole('link', { name: 'Tài khoản' });
  const atBottom = () => page.waitForFunction(() => window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 1);

  // Pressed: the smooth scroll passes "Phím tắt"; once it has ended, "Tài khoản" is still the marked entry.
  await account.click();
  await atBottom();
  await page.waitForTimeout(1200);
  await expect(account).toHaveAttribute('aria-current', 'true');
  await expect(toc.getByRole('link', { name: 'Phím tắt' })).not.toHaveAttribute('aria-current');

  // Scrolled by hand: back to the top, then straight to the bottom.
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect(toc.getByRole('link', { name: 'Thông tin cá nhân' })).toHaveAttribute('aria-current', 'true');
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
  await expect(account).toHaveAttribute('aria-current', 'true');
});
