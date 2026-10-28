import { expect, test, type Page } from '@playwright/test';
import vi from '../messages/vi.json' with { type: 'json' };
import { seriousViolations } from './support/axe';
import { requests, signedInAs } from './support/mock-api';

test.use({ locale: 'vi-VN' });

const t = vi.refunds;
const LIST = '/v1/admin/practice/refunds';
const ID = '5b1f0000-0000-4000-8000-0000000000a1';
const item = {
  report_id: ID, user_id: 'u-lan', user: { id: 'u-lan', email: 'lan@example.com', system: false }, resolved_by: 'u-minh', resolved_by_role: 'editor',
  resolved_by_user: { id: 'u-minh', email: 'minh@example.com', system: false }, self_resolved: false, refunded: true, resolved_at: '2026-10-18T11:02:00.000Z',
};
const base = { 'GET /v1/admin/content/uploads': () => ({ json: { items: [], next_page_token: null } }) };

async function openNavIfCollapsed(page: Page) {
  if ((page.viewportSize()?.width ?? 0) < 1024) await page.getByRole('button', { name: vi.shell.openMenu }).click();
}

test.describe('Trả lượt (A/76)', () => {
  test('admin: menu → list → filter sends the Vietnam day boundaries → report link; axe clean', async ({ page }) => {
    await signedInAs(page, 'admin', { ...base, [`GET ${LIST}`]: () => ({ json: { items: [item], next_page_token: null } }) });
    await page.goto('/uploads');
    await openNavIfCollapsed(page);
    await page.getByRole('navigation', { name: vi.shell.mainNav }).getByRole('link', { name: vi.nav.refunds }).click();
    await expect(page.getByRole('heading', { level: 1, name: vi.nav.refunds })).toBeVisible();
    await expect(page.getByText('lan@example.com').filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText(t.note).filter({ visible: true }).first()).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);

    await page.getByLabel(t.filters.resolver).fill('minh@example.com');
    await page.getByLabel(t.filters.from).fill('2026-10-01');
    await page.getByLabel(t.filters.to).fill('2026-10-23');
    await page.getByRole('button', { name: t.filters.apply }).click();
    await expect(page).toHaveURL(/resolved_by_email=minh%40example\.com&from=2026-10-01&to=2026-10-23|from=2026-10-01/);
    await expect.poll(() => requests(page, 'GET', LIST).length).toBe(2);
    expect(Object.fromEntries(requests(page, 'GET', LIST)[1]!.query)).toEqual({
      resolved_by_email: 'minh@example.com', from: '2026-10-01T00:00:00+07:00', to: '2026-10-24T00:00:00+07:00', page_size: '20',
    });

    await page.getByRole('link', { name: t.reportLink }).filter({ visible: true }).first().click();
    await expect(page).toHaveURL(new RegExp(`/reports/${ID}$`));
  });

  test('editor: no menu entry, and /refunds shows the no-access view without calling the API', async ({ page }) => {
    await signedInAs(page, 'editor', { ...base, [`GET ${LIST}`]: () => ({ json: { items: [], next_page_token: null } }) });
    await page.goto('/refunds');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(vi.nav.refunds);
    await expect(page.getByText(vi.noAccess.title)).toBeVisible();
    await openNavIfCollapsed(page);
    await expect(page.getByRole('navigation', { name: vi.shell.mainNav }).getByRole('link', { name: vi.nav.refunds })).toHaveCount(0);
    expect(requests(page, 'GET', LIST).length).toBe(0);
  });
});
