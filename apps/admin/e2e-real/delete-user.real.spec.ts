import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import vi from '../messages/vi.json' with { type: 'json' };
import type { RealState } from './global-setup';
import { STATE_FILE } from './global-setup';
import { API, createAccount, loginToken } from './support/api';
import { signIn } from './support/sign-in';

/** Bước 8 on the real stack (D17): an admin deletes a learner from the detail page by typing the email again. */
const state: RealState = JSON.parse(readFileSync(STATE_FILE, 'utf8'));

test('the admin deletes a learner from the detail page; the list no longer shows it and the API says 404', async ({ page }) => {
  test.setTimeout(120_000);
  const adminToken = await loginToken(state.admin.email, state.admin.password);
  const email = `e2e-delete-${state.run}-${randomUUID().slice(0, 6)}@example.com`;
  const { id } = await createAccount(adminToken, email, null);

  await signIn(page, state.admin.email, state.admin.password);
  await page.goto(`/users/${id}`);
  await expect(page.getByText(email).first()).toBeVisible();
  await page.getByRole('button', { name: vi.users.detail.deleteAction }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: vi.users.delete.confirm })).toBeDisabled();
  await dialog.getByLabel(vi.users.delete.typeEmail).fill(email);
  await dialog.getByRole('button', { name: vi.users.delete.confirm }).click();

  await expect(page.getByText(`Đã xóa tài khoản ${email}.`)).toBeVisible();
  await expect(page).toHaveURL(/\/users(\?.*)?$/);
  await page.goto(`/users?q=${encodeURIComponent(email)}`);
  await expect(page.getByText(vi.users.emptySearch.replace('{q}', email))).toBeVisible();

  const gone = await fetch(`${API}/v1/admin/users/${id}`, { headers: { Authorization: `Bearer ${adminToken}`, 'X-CSRF-Protection': '1' } });
  expect(gone.status).toBe(404);
});
