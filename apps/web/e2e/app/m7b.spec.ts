import { expect, test, type Page } from '@playwright/test';
import { seriousViolations } from '../support/axe';
import { entitlementsBody } from '../support/fixtures';
import { cancelSubscriptionApi, ORDER_ID, orderApi, requests, signedInAs, SUBSCRIPTION } from '../support/mock-api';

// M7b journey (plan Part 7, Task M7.13): Gói học (Free) → 3 tháng → buy → the order page waits, then turns paid → Bắt đầu học; the Pro
// dialog after a soft navigation to Nhóm, closed with "Để sau", and no AdSense request; Hủy gói on a renewing subscription; axe on every
// M7b screen; no sideways scroll (390 px in the mobile project).
async function noSideScroll(page: Page, where: string) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), where).toBe(true);
}

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(colorScheme, () => {
    test.use({ colorScheme });

test('Gói học (Free) → 3 tháng → "Mua gói Pro 3 tháng" → the order page waits, then shows it paid → "Bắt đầu học"', async ({ page }) => {
  let status = 'pending';
  await signedInAs(page, 'free', orderApi(() => status));
  await page.goto('/vi/app/plans');
  await expect(page.getByRole('heading', { level: 1, name: 'Học đều mỗi ngày, lên Pro khi cần' })).toBeVisible();
  await expect(page.getByRole('radio', { name: /^12 tháng/ })).toBeChecked();
  expect(await seriousViolations(page), 'plans').toEqual([]);
  await noSideScroll(page, 'plans');

  // The radio input is visually hidden (React Aria); press the card's title.
  await page.getByText('3 tháng', { exact: true }).click();
  await expect(page.getByRole('radio', { name: /^3 tháng/ })).toBeChecked();
  await page.getByRole('button', { name: 'Mua gói Pro 3 tháng' }).dblclick();

  await expect(page).toHaveURL(new RegExp(`/vi/app/plans/order\\?order=${ORDER_ID}$`));
  const state = page.getByRole('status').filter({ has: page.getByRole('heading', { level: 1 }) });
  await expect(state.getByRole('heading', { level: 1, name: 'Đang chờ xác nhận thanh toán' })).toBeVisible();
  await expect(state.getByText('Gói Pro sẽ tự kích hoạt khi nhận được tiền. Bạn có thể đóng trang này.')).toBeVisible();
  expect(await seriousViolations(page), 'order pending').toEqual([]);
  await noSideScroll(page, 'order pending');
  // One press, or a double click, is one order at the price the 3-month card showed; payOS is asked once.
  const orders = requests(page, 'POST', '/v1/me/orders');
  expect(orders.map((r) => r.body)).toEqual([{ period_months: 3, expected_amount: 199000, locale: 'vi' }]);
  expect(orders[0]?.headers['idempotency-key']).toMatch(/.+/);
  expect(requests(page, 'POST', `/v1/me/orders/${ORDER_ID}/check`)).toHaveLength(1);

  // The next read (every 3 s) finds it paid; the same status element now holds the paid card.
  status = 'paid';
  await expect(state.getByRole('heading', { level: 1, name: 'Thanh toán thành công' })).toBeVisible({ timeout: 10_000 });
  await expect(state.getByText('Gói Pro có hiệu lực đến hết 11/02/2027.')).toBeVisible();
  await expect(state.getByText('Pro, 3 tháng')).toBeVisible();
  await expect(state.getByText('199.000 ₫')).toBeVisible();
  expect(await seriousViolations(page), 'order paid').toEqual([]);
  await noSideScroll(page, 'order paid');

  await state.getByRole('link', { name: 'Bắt đầu học' }).click();
  await expect(page).toHaveURL(/\/vi\/app$/);
});
  });
}

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(colorScheme, () => {
    test.use({ colorScheme });

test('Hôm nay → Nhóm opens "Học nhiều hơn với Pro" for a Free learner with ads on; "Để sau" closes it; nothing goes to AdSense', async ({ page }) => {
  const adsense: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('googlesyndication.com')) adsense.push(request.url());
  });
  await signedInAs(page, 'free', {
    'GET /v1/me/entitlements': () => ({ json: entitlementsBody('free', { ads: { show: true, interstitial_per_day: 3, min_interval_minutes: 10 } }) }),
  });
  await page.goto('/vi/app');
  const nav = page.getByRole('navigation', { name: 'Điều hướng chính' });
  await nav.getByRole('link', { name: 'Nhóm' }).click();
  await expect(page).toHaveURL(/\/vi\/app\/groups$/);

  const dialog = page.getByRole('dialog', { name: 'Học nhiều hơn với Pro' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Pro', { exact: true })).toBeVisible();
  await expect(dialog.getByText('có AI', { exact: true })).toBeVisible();
  await expect(dialog.getByText('30 phiên luyện mỗi ngày')).toBeVisible();
  await expect(dialog.getByText('Từ 79.000 ₫ cho 1 tháng')).toBeVisible();
  await expect(dialog.getByRole('link', { name: 'Xem gói Pro' })).toHaveAttribute('href', '/vi/app/plans');
  expect(await seriousViolations(page), 'pro dialog').toEqual([]);
  await noSideScroll(page, 'pro dialog');

  await dialog.getByRole('button', { name: 'Để sau' }).click();
  await expect(dialog).toBeHidden();
  expect(adsense).toEqual([]);
});
  });
}

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(colorScheme, () => {
    test.use({ colorScheme });

test('Gói học with a renewing subscription → "Hủy gói" → "Hủy gia hạn" sends one cancel → "Đã gửi yêu cầu hủy gia hạn"', async ({ page }) => {
  await signedInAs(page, 'pro', {
    ...cancelSubscriptionApi(),
    'GET /v1/me/entitlements': () => ({ json: entitlementsBody('pro', { sources: [SUBSCRIPTION] }) }),
  });
  await page.goto('/vi/app/plans');
  await expect(page.getByRole('heading', { level: 1, name: 'Bạn đang dùng gói Pro' })).toBeVisible();
  const rows = page.getByRole('region', { name: 'Gói đang đăng ký' });
  await expect(rows.getByText('Gia hạn ngày 08/12/2026')).toBeVisible();

  await rows.getByRole('button', { name: 'Hủy gói' }).click();
  const dialog = page.getByRole('dialog', { name: 'Hủy gói?' });
  await expect(dialog.getByText('Gói vẫn dùng tới hết 08/12/2026, sau đó không gia hạn. Không hoàn tiền cho thời gian còn lại.')).toBeVisible();
  expect(await seriousViolations(page), 'cancel dialog').toEqual([]);
  await noSideScroll(page, 'cancel dialog');

  await dialog.getByRole('button', { name: 'Hủy gia hạn' }).click();
  await expect(dialog).toBeHidden();
  await expect(rows.getByText('Đã gửi yêu cầu hủy gia hạn')).toBeVisible();
  await expect(rows.getByRole('button', { name: 'Hủy gói' })).toHaveCount(0);
  const cancels = requests(page, 'POST', `/v1/me/subscriptions/${SUBSCRIPTION.id}/cancel`);
  expect(cancels).toHaveLength(1);
  expect(cancels[0]?.headers['idempotency-key']).toMatch(/.+/);
});
  });
}
