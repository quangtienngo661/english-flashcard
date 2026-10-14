import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import vi from '../messages/vi.json' with { type: 'json' };
import { requestCount, requests, signedInAs } from './support/mock-api';

test.use({ locale: 'vi-VN' });

const t = vi.staff;
const LONG_EMAIL = `${'a'.repeat(300)}@${'b'.repeat(15)}.com`;
const list = (items: unknown[]) => () => ({ json: { items, next_page_token: null } });
const row = (id: string, email: string, role: 'admin' | 'editor' | null = 'editor') => ({ id, email, email_verified: true, staff_role: role });

test('Review Focus 3: double-clicking "Xác nhận" in the grant dialog sends exactly one PUT', async ({ page }) => {
  await signedInAs(page, 'admin', {
    'GET /v1/admin/staff': list([row('me', 'admin@wordmet.com', 'admin')]),
    'GET /v1/admin/users': () => ({ json: row('u9', 'new@wordmet.com', null) }),
    'PUT /v1/admin/users/u9/staff-role': () => ({ json: row('u9', 'new@wordmet.com', 'editor') }),
  });
  await page.goto('/staff');
  await page.getByLabel(t.search.label).fill('new@wordmet.com');
  await page.getByRole('button', { name: t.search.submit }).click();
  await page.getByRole('button', { name: t.card.grantEditor }).click();
  await page.getByRole('dialog').getByRole('button', { name: vi.common.confirm }).dblclick();

  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(requestCount(page, 'PUT', '/v1/admin/users/u9/staff-role')).toBe(1);
  expect(requests(page, 'PUT', '/v1/admin/users/u9/staff-role')[0].body).toEqual({ staff_role: 'editor' });
});

test('Review Focus 3: double-clicking "Tạo tài khoản" in the confirmation sends one POST', async ({ page }) => {
  await signedInAs(page, 'admin', {
    'GET /v1/admin/staff': list([row('me', 'admin@wordmet.com', 'admin')]),
    'POST /v1/admin/users': () => ({ status: 201, json: row('u7', 'new@wordmet.com') }),
  });
  await page.goto('/staff');
  await page.getByRole('button', { name: t.createAccount }).click();
  await page.getByRole('dialog').getByLabel(t.create.email).fill('new@wordmet.com');
  await page.getByRole('dialog').getByRole('button', { name: t.create.continue }).click();
  await page.getByRole('dialog').getByRole('button', { name: t.create.submit }).dblclick();

  await expect(page.getByText(t.create.doneBody.replace('{email}', 'new@wordmet.com'))).toBeVisible();
  expect(requestCount(page, 'POST', '/v1/admin/users')).toBe(1);
});

test('Review Focus 2: a 320-character email in a staff row/card does not widen the page', async ({ page }) => {
  await signedInAs(page, 'admin', {
    'GET /v1/admin/staff': list([row('me', 'admin@wordmet.com', 'admin'), row('long', LONG_EMAIL)]),
    'GET /v1/admin/users': () => ({ json: row('long', LONG_EMAIL) }),
  });
  await page.goto('/staff');
  await expect(page.getByText(LONG_EMAIL).first()).toBeAttached();
  await page.getByLabel(t.search.label).fill(LONG_EMAIL);
  await page.getByRole('button', { name: t.search.submit }).click();
  await expect(page.getByRole('heading', { name: LONG_EMAIL })).toBeVisible();

  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.scrollingElement!.scrollWidth,
    clientWidth: document.scrollingElement!.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
});

test('Task 12a: axe has no serious/critical violations on the staff page, with the list and with the grant dialog open', async ({ page }) => {
  await signedInAs(page, 'admin', {
    'GET /v1/admin/staff': list([row('me', 'admin@wordmet.com', 'admin'), row('e1', 'editor@wordmet.com')]),
    'GET /v1/admin/users': () => ({ json: row('u9', 'new@wordmet.com', null) }),
  });
  await page.goto('/staff');
  await expect(page.getByText('editor@wordmet.com').first()).toBeAttached();
  const scan = async () => {
    const results = await new AxeBuilder({ page }).analyze();
    return results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
  };
  expect(await scan()).toEqual([]);

  await page.getByLabel(t.search.label).fill('new@wordmet.com');
  await page.getByRole('button', { name: t.search.submit }).click();
  await page.getByRole('button', { name: t.card.grantEditor }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await scan()).toEqual([]);
});
