import { expect, test } from '@playwright/test';
import vi from '../messages/vi.json' with { type: 'json' };
import { seriousViolations } from './support/axe';
import { problem, requests, signedInAs } from './support/mock-api';

test.use({ locale: 'vi-VN' });

const t = vi.reportReasons;
const PATH = '/v1/admin/practice/report-reasons';
const reason = (over: Record<string, unknown> = {}) => ({
  code: 'wrong_meaning', label_vi: 'Nghĩa sai', label_en: 'Wrong meaning', detail_hint_vi: null, detail_hint_en: null, applies_to: 'all',
  note_required: false, refundable: true, active: true, position: 10, updated_at: '2026-10-20T03:00:00.000Z',
  updated_by_user: { id: 'u1', email: 'admin@wordmet.com', system: false }, ...over,
});
const items = [reason(), reason({ code: 'other', label_vi: 'Khác', label_en: 'Other', refundable: false, position: 1000 })];
const uploads = { 'GET /v1/admin/content/uploads': () => ({ json: { items: [], next_page_token: null } }) };

test.describe('Lý do báo lỗi (A/75, A/75b)', () => {
  test('list in API order; the switch sends PATCH { active }; axe clean', async ({ page }) => {
    await signedInAs(page, 'admin', {
      ...uploads,
      [`GET ${PATH}`]: () => ({ json: { items } }),
      [`PATCH ${PATH}/wrong_meaning`]: () => ({ json: reason({ active: false }) }),
    });
    await page.goto('/report-reasons');
    await expect(page.getByRole('heading', { level: 1, name: vi.nav.reportReasons })).toBeVisible();
    await expect(page.getByText(/báo lỗi cũ giữ tên lúc gửi/)).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);

    await page.getByRole('switch', { name: t.activeFor.replace('{code}', 'wrong_meaning') }).filter({ visible: true }).first().click({ force: true });
    await expect.poll(() => requests(page, 'PATCH', `${PATH}/wrong_meaning`).length).toBe(1);
    expect(requests(page, 'PATCH', `${PATH}/wrong_meaning`)[0]!.body).toEqual({ active: false });
  });

  test('409 report-reason-exists: the message sits on the code field', async ({ page }) => {
    await signedInAs(page, 'admin', {
      ...uploads,
      [`GET ${PATH}`]: () => ({ json: { items } }),
      [`POST ${PATH}`]: () => problem(409, 'report-reason-exists'),
    });
    await page.goto('/report-reasons/new');
    const dialog = page.getByRole('dialog', { name: t.newTitle });
    await dialog.getByLabel(t.form.code).fill('other');
    await dialog.getByLabel(t.form.labelVi).fill('Khác');
    await dialog.getByLabel(t.form.labelEn).fill('Other');
    expect(await seriousViolations(page)).toEqual([]);
    await dialog.getByRole('button', { name: t.form.save }).click();
    await expect(dialog.getByText(vi.errors['report-reason-exists'])).toBeVisible();
    await expect(dialog.getByLabel(t.form.code)).toBeFocused();
    expect(requests(page, 'POST', PATH)[0]!.headers['idempotency-key']).toBeTruthy();
  });

  test('a typed form asks before [Hủy] closes it; keeping it leaves the dialog open', async ({ page }) => {
    await signedInAs(page, 'admin', { ...uploads, [`GET ${PATH}`]: () => ({ json: { items } }) });
    await page.goto('/report-reasons/new');
    const dialog = page.getByRole('dialog', { name: t.newTitle });
    await dialog.getByLabel(t.form.code).fill('typo');
    await dialog.getByRole('button', { name: vi.common.cancel }).click();
    await expect(page.getByText(vi.leave.discardTitle)).toBeVisible();
    await page.getByRole('button', { name: vi.leave.keepEditing }).click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: vi.common.cancel }).click();
    await page.getByRole('button', { name: vi.leave.discard }).click();
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/\/report-reasons$/);
  });
});
