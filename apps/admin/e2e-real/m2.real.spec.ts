import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import vi from '../messages/vi.json' with { type: 'json' };
import type { RealState } from './global-setup';
import { STATE_FILE } from './global-setup';
import { signIn } from './support/sign-in';

/** M2 on the real stack (design §7): one field changed on two tabs, one save; the history shows both rows with the admin's email. */
const s = vi.settings;

async function setNumber(page: Page, label: string): Promise<number> {
  const field = page.getByRole('textbox', { name: label });
  const current = Number(await field.inputValue());
  const next = current === 4 ? 5 : 4; // settings live on between runs on one database: always a real change
  await field.fill(String(next));
  await field.blur();
  return next;
}

test('the admin changes a field on Nhắc học and one on AI, saves once, and the history lists both with their email', async ({ page }) => {
  // Read here, not at load: admin.real.spec.ts changes the admin password and writes it back to the state file.
  const state: RealState = JSON.parse(readFileSync(STATE_FILE, 'utf8'));
  // The shared helper waits out a 429 of `auth.login.ip` (20 a minute): the suite signs in more often than that around this spec.
  await signIn(page, state.admin.email, state.admin.password);

  await page.goto('/settings');
  await expect(page.getByRole('heading', { level: 1, name: vi.nav.settings })).toBeVisible();
  const gap = await setNumber(page, s.fields.reminders.min_gap_days);
  await page.getByRole('tab', { name: new RegExp(`^${s.tabs.ai}`) }).click();
  await expect(page).toHaveURL(/\/settings\?tab=ai$/);
  const timeout = await setNumber(page, s.fields.ai.call_timeout_seconds);
  await page.getByRole('button', { name: s.save }).click();
  await expect(page.getByText(s.saved)).toBeVisible();

  await page.reload();
  await expect(page.getByRole('textbox', { name: s.fields.ai.call_timeout_seconds })).toHaveValue(String(timeout));

  await page.getByRole('button', { name: s.history }).click();
  const dialog = page.getByRole('dialog', { name: s.historyDialog.title });
  const rows = dialog.getByRole('listitem');
  await expect(rows.first()).toBeVisible();
  const top = [await rows.nth(0).innerText(), await rows.nth(1).innerText()];
  const gapRow = top.find((text) => text.includes('reminders.min_gap_days'));
  const timeoutRow = top.find((text) => text.includes('ai.call_timeout_seconds'));
  expect(gapRow).toContain(`→ ${gap}`);
  expect(timeoutRow).toContain(`→ ${timeout}`);
  for (const row of [gapRow, timeoutRow]) expect(row).toContain(state.admin.email);
});
