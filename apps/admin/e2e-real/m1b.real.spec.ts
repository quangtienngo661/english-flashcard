import { expect, test, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import vi from '../messages/vi.json' with { type: 'json' };
import type { RealState } from './global-setup';
import { STATE_FILE } from './global-setup';
import { apiCall, loginToken } from './support/api';
import { chooseClozeModel } from './support/ai-report';
import { signIn } from './support/sign-in';

/**
 * M1b on the real stack (design §7): the admin adds an example to the set of `generate_cloze`, runs the set, the run reaches "Xong",
 * Chi phí has a row for the operation, and Các lần gọi finds the run's calls by their `operation_id` (`eval-<run>-<example>`).
 * The API runs with `AI_FAKE_ENABLED=true` and no provider key: nothing leaves the machine.
 */
test.describe.configure({ mode: 'serial' });

const OP = 'generate_cloze';
const run = randomUUID().slice(0, 8);
const word = `m1bx${run}`;
const state = (): RealState => JSON.parse(readFileSync(STATE_FILE, 'utf8'));
let runId = '';

async function signInAsAdmin(page: Page) {
  const { admin } = state();
  await signIn(page, admin.email, admin.password);
}

test.beforeAll(async () => {
  const { admin } = state();
  await chooseClozeModel(await loginToken(admin.email, admin.password), 'fake:ok');
});

test('the admin adds an example to the set of generate_cloze', async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto(`/ai/eval?op=${OP}`);
  await expect(page.getByRole('heading', { level: 1, name: vi.nav.aiEval })).toBeVisible();
  await page.getByRole('button', { name: vi.ai.eval.add }).filter({ visible: true }).first().click();
  const dialog = page.getByRole('dialog', { name: vi.ai.eval.form.addTitle });
  await dialog.getByLabel('word', { exact: true }).fill(word);
  await dialog.getByLabel('part_of_speech', { exact: true }).fill('verb');
  await dialog.getByLabel('level', { exact: true }).fill('A1');
  await dialog.getByLabel('meaning_vi', { exact: true }).fill('nghĩa thử của M1b');
  await dialog.getByLabel(vi.ai.eval.form.note).fill(`e2e ${run}`);
  await dialog.getByRole('button', { name: vi.ai.eval.form.submitAdd }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText(vi.ai.eval.toast.added)).toBeVisible();
  await expect(page.getByRole('cell', { name: new RegExp(word) }).first()).toBeVisible();
});

test('the admin runs the set, the run reaches "Xong" and shows the result of each example', async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto(`/ai/eval?op=${OP}`);
  await page.getByRole('button', { name: vi.ai.eval.run.start }).click();
  await expect(page).toHaveURL(/\/ai\/eval\/runs\/[0-9a-f-]{36}/);
  runId = /\/runs\/([0-9a-f-]{36})/.exec(page.url())![1]!;
  const panel = page.getByTestId('detail-panel');
  await expect(panel.getByText(vi.ai.eval.status.finished, { exact: true })).toBeVisible({ timeout: 45_000 });
  await expect(panel.getByRole('heading', { name: vi.ai.eval.detail.results })).toBeVisible();
  await expect(panel.getByText(word).filter({ visible: true }).first()).toBeVisible();
  await page.screenshot({ path: 'test-results/m1b-run.png' });
  await page.goto(`/ai/eval?op=${OP}`);
  await expect(page.getByRole('row').filter({ hasText: vi.ai.eval.status.finished }).first()).toBeVisible();
});

test('Chi phí has a row for the operation', async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto('/ai/costs?group_by=operation');
  await expect(page.getByRole('heading', { level: 1, name: vi.nav.aiCosts })).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: OP }).first()).toBeVisible();
});

test('Các lần gọi finds the calls of the run by operation_id and shows the content', async ({ page }) => {
  const { admin } = state();
  const token = await loginToken(admin.email, admin.password);
  const detail = await apiCall<{ items: Array<{ example_id: string }> }>('GET', `/v1/admin/ai/eval/runs/${runId}`, token);
  const operationId = `eval-${runId}-${detail.items[0]!.example_id}`;

  await signInAsAdmin(page);
  await page.goto('/ai/calls');
  await page.getByLabel(vi.ai.calls.search.label).fill(operationId);
  await page.getByRole('button', { name: vi.ai.calls.search.submit }).click();
  await expect(page.getByText(vi.ai.calls.forId.replace('{id}', operationId))).toBeVisible();
  const row = page.getByRole('row').filter({ hasText: vi.ai.status.purposes.eval }).first();
  await expect(row).toBeVisible();
  await page.getByRole('button', { name: vi.ai.calls.viewFor.replace('{attempt}', '1') }).filter({ visible: true }).first().click();
  const dialog = page.getByRole('dialog', { name: vi.ai.calls.content.title });
  await expect(dialog.getByRole('heading', { name: vi.ai.calls.content.request })).toBeVisible();
  await page.screenshot({ path: 'test-results/m1b-calls.png' });
});
