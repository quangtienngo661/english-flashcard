import { expect, test, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import vi from '../messages/vi.json' with { type: 'json' };
import type { RealState } from './global-setup';
import { STATE_FILE } from './global-setup';
import { API, loginToken, retryAfterSeconds } from './support/api';
import { signIn } from './support/sign-in';

/**
 * M4 (Người học) on the real stack: the admin finds Khoa by email, locks and unlocks him; Minh (editor) looks up Lan, grants
 * Pro, moves the end date and revokes; the admin then grants Pro starting now to Lan twice, so the first grant reads
 * "Bị thay thế" (design R3: replaced = revoked and ended at the same instant, checked here on Postgres).
 * Lan and Khoa are made by the admin, so a reused state has earlier grants of Lan: every row is found by this run's own reason.
 */
test.describe.configure({ mode: 'serial' });

let state: RealState;
const run = randomUUID().slice(0, 8);
const t = vi.entitlements;
const u = vi.users;
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

test.beforeAll(() => {
  // Read late: admin.real.spec.ts rewrites the file when it changes the admin's password.
  state = JSON.parse(readFileSync(STATE_FILE, 'utf8'));
});

/** yyyy-mm-dd of today + `days` in the browser's calendar (a month of margin keeps "future" true whatever the time zone). */
function dayFromNow(days: number): string {
  const d = new Date(Date.now() + days * 86_400_000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** The grants list narrowed to Lan (the filter box is applied with [Lọc]); returns the row that carries `reason`. */
async function lanRow(page: Page, reason: string) {
  await page.goto('/entitlements');
  await expect(page.getByRole('heading', { level: 1, name: vi.nav.entitlements })).toBeVisible();
  await page.getByLabel(t.filters.learner).fill(state.lan.email);
  await page.getByRole('button', { name: t.filters.apply }).click();
  const row = page.getByRole('row').filter({ hasText: reason });
  await expect(row).toHaveCount(1);
  return row;
}

async function grantPro(page: Page, reason: string, to: string) {
  await page.goto('/entitlements');
  await page.getByRole('button', { name: t.new.open }).filter({ visible: true }).first().click();
  const dialog = page.getByRole('dialog', { name: t.new.title });
  await dialog.getByLabel(t.new.email).fill(state.lan.email);
  await dialog.getByRole('button', { name: t.new.check }).click();
  await expect(dialog.getByText(t.new.confirmed.replace('{email}', state.lan.email))).toBeVisible();
  await dialog.getByLabel(t.new.to).fill(to);
  await dialog.getByLabel(t.new.reason).fill(reason);
  await dialog.getByRole('button', { name: t.new.submit }).click();
  await expect(page.getByText(t.new.done.replace('{email}', state.lan.email))).toBeVisible();
  await expect(dialog).toBeHidden();
}

test('the admin finds Khoa by email, locks him with a reason (he cannot log in), then unlocks him', async ({ page }) => {
  await signIn(page, state.admin.email, state.admin.password);
  await page.goto('/users');
  await expect(page.getByRole('heading', { level: 1, name: vi.nav.users })).toBeVisible();
  await page.getByLabel(u.search).fill(state.khoa.email);
  const link = page.getByRole('link', { name: state.khoa.email }).filter({ visible: true });
  await expect(link).toHaveCount(1);
  await link.click();

  const panel = page.getByTestId('detail-panel');
  await expect(page).toHaveURL(/\/users\/[0-9a-f-]{36}/);
  await panel.getByRole('button', { name: u.detail.lock }).click();
  const dialog = page.getByRole('dialog', { name: u.lock.title.replace('{email}', state.khoa.email) });
  const reason = `Thử khóa e2e ${run}`;
  await dialog.getByLabel(u.lock.reason).fill(reason);
  await dialog.getByRole('button', { name: u.lock.confirm }).click();
  await expect(panel.getByText(new RegExp(`Đang khóa từ .* · bởi ${escape(state.admin.email)}`))).toBeVisible();
  await expect(panel.getByText(u.detail.lockReason.replace('{reason}', reason))).toBeVisible();

  // The API refuses the locked account. The unlock below, followed by a good login with the same password, rules out a wrong password.
  const tryLogin = () =>
    fetch(`${API}/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Protection': '1' },
      body: JSON.stringify({ email: state.khoa.email, password: state.khoa.password, client: 'web', device_label: 'e2e-real' }),
    });
  let refused = await tryLogin();
  if (refused.status === 429) {
    // `auth.login.ip` (20 a minute) answered, not the account check: wait it out and ask once more.
    await new Promise((resolve) => setTimeout(resolve, (retryAfterSeconds(refused.headers.get('retry-after')) + 1) * 1000));
    refused = await tryLogin();
  }
  expect(refused.status).toBe(403);
  expect(((await refused.json()) as { type: string }).type).toMatch(/account-locked$/);

  await panel.getByRole('button', { name: u.detail.unlock }).click();
  await expect(panel.getByRole('button', { name: u.detail.lock })).toBeVisible();
  await expect(panel.getByText(/Đang khóa từ/)).toHaveCount(0);
  expect(await loginToken(state.khoa.email, state.khoa.password)).toBeTruthy();
});

test('Minh looks up Lan, grants Pro, moves the end date and revokes it', async ({ page }) => {
  await signIn(page, state.editor.email, state.editor.password);
  const reason = `Giải IELTS ${run}`;
  await grantPro(page, reason, dayFromNow(30));

  const row = await lanRow(page, reason);
  await expect(row).toContainText(t.kinds.plan);
  await expect(row).toContainText(t.statuses.active);
  await expect(row).toContainText(state.editor.email);

  await row.getByRole('button', { name: t.actions.editDatesFor.replace('{email}', state.lan.email) }).click();
  const edit = page.getByRole('dialog', { name: t.editDates.title.replace('{email}', state.lan.email) });
  await expect(edit.getByText(t.editDates.fromLocked)).toBeVisible();
  await edit.getByLabel(t.editDates.to).fill(dayFromNow(60));
  await edit.getByLabel(t.editDates.reason).fill(`Kéo dài ${run}`);
  await edit.getByRole('button', { name: t.editDates.confirm }).click();
  await expect(page.getByText(t.editDates.done.replace('{email}', state.lan.email))).toBeVisible();
  await expect(edit).toBeHidden();

  // The date really moved in the API: after a reload the dialog quotes the change.
  await page.reload();
  await page.getByLabel(t.filters.learner).fill(state.lan.email);
  await page.getByRole('button', { name: t.filters.apply }).click();
  const again = page.getByRole('row').filter({ hasText: reason });
  await again.getByRole('button', { name: t.actions.editDatesFor.replace('{email}', state.lan.email) }).click();
  const dialog = page.getByRole('dialog', { name: t.editDates.title.replace('{email}', state.lan.email) });
  await expect(dialog.getByText(new RegExp(`Lần sửa trước: .* · ${escape(state.editor.email)} · tới .* · Kéo dài ${run}`))).toBeVisible();
  await dialog.getByRole('button', { name: t.editDates.keep }).click();

  await again.getByRole('button', { name: t.actions.revokeFor.replace('{email}', state.lan.email) }).click();
  const revoke = page.getByRole('dialog', { name: t.revoke.title.replace('{email}', state.lan.email) });
  await revoke.getByLabel(t.revoke.reason).fill(`Nhầm người ${run}`);
  await revoke.getByRole('button', { name: t.revoke.confirm }).click();
  await expect(page.getByText(t.revoke.done.replace('{email}', state.lan.email))).toBeVisible();
  const revoked = page.getByRole('row').filter({ hasText: reason });
  await expect(revoked).toContainText(t.statuses.revoked);
  await expect(revoked).toContainText(t.revokedNote.replace('{reason}', `Nhầm người ${run}`));
  await expect(revoked.getByRole('button', { name: t.actions.revokeFor.replace('{email}', state.lan.email) })).toHaveCount(0);
});

test('the admin grants Pro starting now to Lan twice: the first grant reads "Bị thay thế"', async ({ page }) => {
  await signIn(page, state.admin.email, state.admin.password);
  const first = `Pro lần một ${run}`;
  const second = `Pro lần hai ${run}`;
  await grantPro(page, first, dayFromNow(30));
  await grantPro(page, second, dayFromNow(45));

  await lanRow(page, first);
  const replaced = page.getByRole('row').filter({ hasText: first });
  await expect(replaced).toContainText(t.statuses.replaced);
  await expect(replaced.getByRole('button', { name: t.actions.revokeFor.replace('{email}', state.lan.email) })).toHaveCount(0);
  await expect(page.getByRole('row').filter({ hasText: second })).toContainText(t.statuses.active);
});
