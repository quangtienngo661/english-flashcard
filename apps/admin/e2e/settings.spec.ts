import { expect, test, type Page } from '@playwright/test';
import vi from '../messages/vi.json' with { type: 'json' };
import { problem, requests, signedInAs } from './support/mock-api';
import { settingsMocks, settingsView } from './support/settings';

const s = vi.settings;
const uploads = { json: { items: [], next_page_token: null } };

async function openNavIfCollapsed(page: Page) {
  if ((page.viewportSize()?.width ?? 0) < 1024) await page.getByRole('button', { name: vi.shell.openMenu }).click();
}

test.describe('Cài đặt hệ thống (A/70a–A/70f)', () => {
  test.use({ locale: 'vi-VN' });

  test('admin: menu → change a field on two tabs → one save with both keys → toast; the tab stays in the URL', async ({ page }) => {
    await signedInAs(page, 'admin', {
      'GET /v1/admin/content/uploads': () => uploads,
      ...settingsMocks,
      'PUT /v1/admin/settings': () => ({ json: { version: 2, values: settingsView().values } }),
    });
    await page.goto('/uploads');
    await openNavIfCollapsed(page);
    await page.getByRole('navigation', { name: vi.shell.mainNav }).getByRole('link', { name: vi.nav.settings }).click();
    await expect(page.getByRole('heading', { level: 1, name: vi.nav.settings })).toBeVisible();

    await page.getByRole('textbox', { name: s.fields.reminders.min_gap_days }).fill('3');
    await page.getByRole('textbox', { name: s.fields.reminders.min_gap_days }).blur();
    await page.getByRole('tab', { name: new RegExp(`^${s.tabs.ai}`) }).click();
    await expect(page).toHaveURL(/\/settings\?tab=ai$/);
    await expect(page.getByText(vi.leave.title)).toHaveCount(0);
    await page.getByRole('textbox', { name: s.fields.ai.call_timeout_seconds }).fill('12');
    await page.getByRole('textbox', { name: s.fields.ai.call_timeout_seconds }).blur();
    await page.getByRole('button', { name: s.save }).click();
    await expect(page.getByText(s.saved)).toBeVisible();
    const [put] = requests(page, 'PUT', '/v1/admin/settings');
    expect(put.body).toEqual({ version: 1, values: { reminders: { min_gap_days: 3 }, ai: { call_timeout_seconds: 12 } } });
    expect(put.headers['idempotency-key']).toBeTruthy();
  });

  test('nhóm B: the AI tab shows the held-out share as a percent in its hint, and 0,25 is saved as 0.25', async ({ page }) => {
    await signedInAs(page, 'admin', {
      ...settingsMocks,
      'PUT /v1/admin/settings': () => ({ json: { version: 2, values: settingsView().values } }),
    });
    await page.goto('/settings?tab=ai');
    const box = page.getByRole('textbox', { name: s.fields.ai.eval_held_out_ratio });
    await expect(box).toHaveValue('0,3');
    await expect(page.getByText('eval_held_out_ratio · 10%–50% · mặc định 30%')).toBeVisible();
    await box.fill('0,25');
    await box.blur();
    await page.getByRole('button', { name: s.save }).click();
    await expect(page.getByText(s.saved)).toBeVisible();
    expect(requests(page, 'PUT', '/v1/admin/settings')[0].body).toEqual({ version: 1, values: { ai: { eval_held_out_ratio: 0.25 } } });
  });

  test('a 400 on a field of another tab opens that tab and focuses the field', async ({ page }) => {
    await signedInAs(page, 'admin', {
      ...settingsMocks,
      'PUT /v1/admin/settings': () =>
        problem(400, 'validation-failed', { violations: ['values.practice.default_questions_per_session: Expected at most max_questions_per_session'] }),
    });
    await page.goto('/settings?tab=practice');
    // The fixed maximum sits under its choice "Số câu tối đa mỗi phiên" (practice AI count, 09/11/2026).
    await page.getByRole('group', { name: s.fields.practice.session_max_mode })
      .getByRole('textbox', { name: s.fields.practice.max_questions_per_session }).fill('5');
    await page.getByRole('tab', { name: new RegExp(`^${s.tabs.reminders}`) }).click();
    await page.getByRole('button', { name: s.save }).click();
    const field = page.getByRole('textbox', { name: s.fields.practice.default_questions_per_session });
    await expect(field).toBeFocused();
    await expect(page.getByRole('tab', { name: new RegExp(`^${s.tabs.practice}`) })).toHaveAttribute('aria-selected', 'true');
  });

  test('practice tab: switch the maximum to "Bằng số từ của phạm vi" and the AI cap to a fixed 3, save → PUT body has session_max_mode scope_words, ai_max_mode fixed, ai_max_fixed 3', async ({ page }) => {
    await signedInAs(page, 'admin', {
      ...settingsMocks,
      'PUT /v1/admin/settings': () => ({ json: { version: 2, values: settingsView().values } }),
    });
    await page.goto('/settings?tab=practice');
    const p = s.fields.practice;
    const choose = async (field: string, option: string) => {
      await page.getByRole('button', { name: new RegExp(field) }).click();
      await page.getByRole('option', { name: option }).click();
    };
    await expect(page.getByText('Ví dụ: phiên 7 câu → tối đa 3 câu AI · phiên 10 câu → 5 · phiên 20 câu → 10')).toBeVisible();
    await choose(p.session_max_mode, s.choices.session_max_mode.scope_words);
    await expect(page.getByRole('group', { name: p.session_max_mode }).getByRole('textbox')).toHaveCount(0);
    await choose(p.ai_max_mode, s.choices.ai_max_mode.fixed);
    const fixed = page.getByRole('group', { name: p.ai_max_mode }).getByRole('textbox', { name: p.ai_max_fixed });
    await fixed.fill('3');
    await fixed.blur();
    await expect(page.getByText('Ví dụ: phiên 7 câu → tối đa 3 câu AI · phiên 10 câu → 3 · phiên 20 câu → 3')).toBeVisible();
    await page.getByRole('button', { name: s.save }).click();
    await expect(page.getByText(s.saved)).toBeVisible();
    expect(requests(page, 'PUT', '/v1/admin/settings')[0].body).toEqual({
      version: 1, values: { practice: { session_max_mode: 'scope_words', ai_max_mode: 'fixed', ai_max_fixed: 3 } },
    });
  });

  test('leaving with an unsaved change asks "Rời trang?"; [Ở lại] keeps the value', async ({ page }) => {
    await signedInAs(page, 'admin', { 'GET /v1/admin/content/uploads': () => uploads, ...settingsMocks });
    await page.goto('/settings');
    await page.getByRole('textbox', { name: s.fields.reminders.min_gap_days }).fill('4');
    await page.getByRole('textbox', { name: s.fields.reminders.min_gap_days }).blur();
    await openNavIfCollapsed(page);
    await page.getByRole('navigation', { name: vi.shell.mainNav }).getByRole('link', { name: vi.nav.uploads }).click();
    const ask = page.getByRole('dialog', { name: vi.leave.title });
    await expect(ask).toBeVisible();
    await ask.getByRole('button', { name: vi.leave.stay }).click();
    await expect(page).toHaveURL(/\/settings$/);
    await expect(page.getByRole('textbox', { name: s.fields.reminders.min_gap_days })).toHaveValue('4');
  });

  test('editor: no menu entry, and /settings shows the no-access view without calling the API', async ({ page }) => {
    await signedInAs(page, 'editor', { 'GET /v1/admin/content/uploads': () => uploads, ...settingsMocks });
    await page.goto('/settings');
    await expect(page.getByText(vi.noAccess.title)).toBeVisible();
    expect(requests(page, 'GET', '/v1/admin/settings')).toHaveLength(0);
    await openNavIfCollapsed(page);
    await expect(page.getByRole('navigation', { name: vi.shell.mainNav }).getByRole('link', { name: vi.nav.settings })).toHaveCount(0);
  });
});
