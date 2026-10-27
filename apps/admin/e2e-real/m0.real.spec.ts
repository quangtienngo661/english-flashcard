import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import vi from '../messages/vi.json' with { type: 'json' };
import { loginToken } from './support/api';
import type { RealState } from './global-setup';
import { STATE_FILE } from './global-setup';

/** M0 on the real stack: the accounts the admin made through the API work, and an editor at an admin-only path is told so. */
const state: RealState = JSON.parse(readFileSync(STATE_FILE, 'utf8'));

test('the accounts made by the admin API can sign in: Minh (editor), Lan and Khoa (learners)', async () => {
  for (const account of [state.editor, state.lan, state.khoa]) {
    expect(await loginToken(account.email, account.password)).toBeTruthy();
  }
});

test('Minh (editor) opening /staff stays there, keeps the title, sees "no access", and [Về trang chủ] leads to /uploads', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(vi.account.login.email).fill(state.editor.email);
  await page.getByLabel(vi.account.login.password, { exact: true }).fill(state.editor.password);
  await page.getByRole('button', { name: vi.account.login.submit }).click();
  await expect(page).toHaveURL(/\/uploads$/);

  await page.goto('/staff');
  await expect(page).toHaveURL(/\/staff$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(vi.nav.staff);
  await expect(page.getByText(vi.noAccess.title)).toBeVisible();

  await page.getByRole('button', { name: vi.noAccess.home }).click();
  await expect(page).toHaveURL(/\/uploads$/);
});
