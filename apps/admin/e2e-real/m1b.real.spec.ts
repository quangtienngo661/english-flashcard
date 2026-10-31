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
 * M1b on the real stack (design §7, nhóm B §5.1): the admin adds an example to the set of `generate_cloze` with its expected forms, freezes
 * version 1, runs that version, the run reaches "Xong", Chi phí has a row for the operation, and Các lần gọi finds the run's calls by their
 * `operation_id` (`eval-<run>-<example>`): the dev example's content is shown, a held-out example's is hidden.
 * The API runs with `AI_FAKE_ENABLED=true` and no provider key: nothing leaves the machine.
 */
test.describe.configure({ mode: 'serial' });

const OP = 'generate_cloze';
const run = randomUUID().slice(0, 8);
const word = `m1bx${run}`;
const state = (): RealState => JSON.parse(readFileSync(STATE_FILE, 'utf8'));
const examples = async (token: string) => (await apiCall<{ items: Array<{ id: string; split: 'dev' | 'held_out' }> }>('GET', `/v1/admin/ai/eval/examples?operation=${OP}`, token)).items;
let runId = '';
let heldOutId = '';
// The version the freeze step makes: 1 on a fresh database (CI), the next one when the suite runs again on the same database.
let version = 1;

async function signInAsAdmin(page: Page) {
  const { admin } = state();
  await signIn(page, admin.email, admin.password);
}

test.beforeAll(async () => {
  const { admin } = state();
  const token = await loginToken(admin.email, admin.password);
  await chooseClozeModel(token, 'fake:ok');
  // The example the dialog adds must land in `dev` (held-out ratio 0.3): seed k held-out rows first, k = max(1, ⌈(30·n − 100·h) / 70⌉) for the set's counts.
  const before = await examples(token);
  const h = before.filter((example) => example.split === 'held_out').length;
  const k = Math.max(1, Math.ceil((30 * before.length - 100 * h) / 70));
  const rows = Array.from({ length: k }, (_, i) => ({
    input: { word: `m1bh${run}${i}`, part_of_speech: 'verb', level: 'A1', meaning_vi: 'nghĩa thử held-out của M1b', context_label: null },
    expected: { forms: [`m1bh${run}${i}`] },
    split: 'held_out',
  }));
  const result = await apiCall<{ created: number; invalid: unknown[] }>('POST', '/v1/admin/ai/eval/examples/bulk', token, { operation: OP, rows });
  expect(result).toMatchObject({ created: k, invalid: [] });
  const known = new Set(before.map((example) => example.id));
  const seeded = (await examples(token)).filter((example) => !known.has(example.id));
  expect(seeded.map((example) => example.split)).toEqual(Array(k).fill('held_out'));
  heldOutId = seeded[0]!.id;
});

test('the admin adds an example to the set of generate_cloze, with its forms, and it lands in dev', async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto(`/ai/eval?op=${OP}`);
  await expect(page.getByRole('heading', { level: 1, name: vi.nav.aiEval })).toBeVisible();
  await expect(page.getByText(vi.ai.eval.heldOutHidden).first()).toBeVisible();
  await page.getByRole('button', { name: vi.ai.eval.add }).filter({ visible: true }).first().click();
  const dialog = page.getByRole('dialog', { name: vi.ai.eval.form.addTitle });
  await dialog.getByLabel('word', { exact: true }).fill(word);
  await dialog.getByLabel('part_of_speech', { exact: true }).fill('verb');
  await dialog.getByLabel('level', { exact: true }).fill('A1');
  await dialog.getByLabel('meaning_vi', { exact: true }).fill('nghĩa thử của M1b');
  await dialog.getByLabel(vi.ai.eval.form.note).fill(`e2e ${run}`);
  // The word is not in the catalog: the box stays empty and says so; the admin types the forms.
  await expect(dialog.getByText(vi.ai.eval.form.expected.forms.notFound)).toBeVisible();
  await dialog.getByLabel(vi.ai.eval.form.expected.forms.label).fill(word);
  await dialog.getByRole('button', { name: vi.ai.eval.form.submitAdd }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText(vi.ai.eval.toast.added, { exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: new RegExp(word) }).first()).toBeVisible();
});

test('the admin freezes the next version of the set', async ({ page }) => {
  const { admin } = state();
  const frozen = await apiCall<{ items: Array<{ version: number }> }>('GET', `/v1/admin/ai/eval/sets?operation=${OP}`, await loginToken(admin.email, admin.password));
  version = Math.max(0, ...frozen.items.map((set) => set.version)) + 1;
  await signInAsAdmin(page);
  await page.goto(`/ai/eval?op=${OP}`);
  await page.getByRole('button', { name: vi.ai.eval.freeze.button, exact: true }).filter({ visible: true }).first().click();
  const dialog = page.getByRole('dialog', { name: vi.ai.eval.freeze.title.replace('{version}', String(version)) });
  await dialog.getByRole('button', { name: vi.ai.eval.freeze.confirm, exact: true }).click();
  await expect(page.getByText(vi.ai.eval.toast.frozen.replace('{version}', String(version)), { exact: true })).toBeVisible();
  await expect(page.getByText(vi.ai.eval.sets.version.replace('{version}', String(version))).first()).toBeVisible();
});

test('the admin runs the new version, the run reaches "Xong" and shows the result of each dev example', async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto(`/ai/eval?op=${OP}`);
  await page.getByRole('button', { name: vi.ai.eval.run.start }).click();
  await expect(page).toHaveURL(/\/ai\/eval\/runs\/[0-9a-f-]{36}/);
  runId = /\/runs\/([0-9a-f-]{36})/.exec(page.url())![1]!;
  const panel = page.getByTestId('detail-panel');
  await expect(panel.getByText(vi.ai.eval.status.finished, { exact: true })).toBeVisible({ timeout: 45_000 });
  await expect(panel.getByText(vi.ai.eval.set.version.replace('{version}', String(version))).first()).toBeVisible();
  await expect(panel.getByRole('heading', { name: vi.ai.eval.detail.results })).toBeVisible();
  await expect(panel.getByText(word).filter({ visible: true }).first()).toBeVisible();
  // The held-out examples count in the totals but are never listed.
  await expect(panel.getByText(vi.ai.eval.detail.stats.heldOutHidden)).toBeVisible();
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

test('Các lần gọi shows the content of the dev example and hides the content of the held-out one', async ({ page }) => {
  const { admin } = state();
  const token = await loginToken(admin.email, admin.password);
  const detail = await apiCall<{ items: Array<{ example_id: string; split: string }> }>('GET', `/v1/admin/ai/eval/runs/${runId}/items`, token);
  expect(detail.items.map((item) => item.split)).toEqual(detail.items.map(() => 'dev'));
  const search = async (operationId: string) => {
    await page.goto('/ai/calls');
    await page.getByLabel(vi.ai.calls.search.label).fill(operationId);
    await page.getByRole('button', { name: vi.ai.calls.search.submit }).click();
    await expect(page.getByText(vi.ai.calls.forId.replace('{id}', operationId))).toBeVisible();
    const row = page.getByRole('row').filter({ hasText: vi.ai.status.purposes.eval }).first();
    await expect(row).toBeVisible();
    return row;
  };

  await signInAsAdmin(page);
  await search(`eval-${runId}-${detail.items[0]!.example_id}`);
  await page.getByRole('button', { name: vi.ai.calls.viewFor.replace('{attempt}', '1') }).filter({ visible: true }).first().click();
  const dialog = page.getByRole('dialog', { name: vi.ai.calls.content.title });
  await expect(dialog.getByRole('heading', { name: vi.ai.calls.content.request })).toBeVisible();
  await page.screenshot({ path: 'test-results/m1b-calls.png' });
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();

  const hidden = await search(`eval-${runId}-${heldOutId}`);
  await expect(hidden.getByText(vi.ai.calls.heldOut, { exact: true })).toBeVisible();
  await expect(hidden.getByText(vi.ai.calls.hiddenContent)).toBeVisible();
  await expect(page.getByRole('button', { name: vi.ai.calls.viewFor.replace('{attempt}', '1') })).toHaveCount(0);
  await page.screenshot({ path: 'test-results/m1b-calls-held-out.png' });
});
