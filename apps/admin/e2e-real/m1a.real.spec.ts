import { expect, test, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import vi from '../messages/vi.json' with { type: 'json' };
import type { RealState } from './global-setup';
import { STATE_FILE } from './global-setup';

/**
 * M1a on the real stack (design §7): the admin adds a fake model, chooses it for `generate_cloze`, Tình trạng turns "Sẵn sàng",
 * then edits, saves and test-runs the prompt. The API runs with `AI_FAKE_ENABLED=true` and no provider key: nothing leaves the machine.
 * A model can be added once: a database that already has `fake:ok` skips the adding.
 */
test.describe.configure({ mode: 'serial' });

/** The fake provider only knows its own model ids (`FAKE_MODELS` in the API); `fake:ok` always answers. */
const modelId = 'fake:ok';
const run = randomUUID().slice(0, 8);
const OP = 'generate_cloze';

/** Read when the test runs, not when the file loads: the earlier admin story changes the admin's password and rewrites the state file. */
const state = (): RealState => JSON.parse(readFileSync(STATE_FILE, 'utf8'));

async function signInAsAdmin(page: Page) {
  const { admin } = state();
  await page.goto('/login');
  await page.getByLabel(vi.account.login.email).fill(admin.email);
  await page.getByLabel(vi.account.login.password, { exact: true }).fill(admin.password);
  await page.getByRole('button', { name: vi.account.login.submit }).click();
  await expect(page).toHaveURL(/\/uploads$/);
}

const opRow = (page: Page) => page.getByRole('group', { name: new RegExp(OP) });

test('the admin adds a fake model, chooses it for generate_cloze, and Tình trạng says "Sẵn sàng"', async ({ page }) => {
  await signInAsAdmin(page);

  await page.goto('/ai/models');
  await expect(page.getByRole('heading', { level: 1, name: vi.nav.aiModels })).toBeVisible();
  const listed = page.getByText(`Fake · ${modelId}`).filter({ visible: true });
  await expect(listed.or(page.getByText(vi.ai.models.empty).filter({ visible: true }))).toBeVisible();
  if ((await listed.count()) === 0) {
    await page.getByRole('button', { name: vi.ai.models.add }).filter({ visible: true }).first().click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: new RegExp(vi.ai.models.form.provider) }).click();
    await page.getByRole('option', { name: 'Fake' }).click();
    await dialog.getByLabel(vi.ai.models.form.modelId).fill(modelId);
    await dialog.getByRole('button', { name: vi.ai.models.form.submitAdd }).click();
    await expect(dialog).toBeHidden();
  }
  await expect(listed).toBeVisible();

  await page.goto('/ai/operations');
  await expect(opRow(page)).toBeVisible();
  await opRow(page).getByRole('button', { name: new RegExp(`${vi.ai.operations.row.model}$`) }).click();
  await page.getByRole('option', { name: `Fake · ${modelId}` }).click();
  const save = opRow(page).getByRole('button', { name: vi.ai.operations.row.saveFor.replace('{operation}', OP) });
  // A database that an earlier run already set up has this choice saved: [Lưu] is off then, and there is nothing to save.
  if (await save.isEnabled()) {
    await save.click();
    await expect(page.getByText(vi.ai.operations.row.saved)).toBeVisible();
  }

  await page.goto('/ai/status');
  const row = page.getByRole('row').filter({ hasText: OP });
  await expect(row.getByText(vi.ai.status.ready, { exact: true })).toBeVisible();
  await expect(row).toContainText(`Fake · ${modelId}`);
});

test('the admin edits the generate_cloze instructions, saves a new revision and test-runs it', async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto(`/ai/prompts?op=${OP}`);
  const t = vi.ai.prompts;
  const instructions = page.getByLabel(t.instructions);
  await expect(instructions).not.toHaveValue('');
  const before = await page.getByText(/^Bản số \d+$/).innerText();
  await instructions.fill(`Write one short sentence. (e2e ${run})`);

  await page.getByRole('button', { name: t.save, exact: true }).click();
  await expect(page.getByText(/^Đã lưu bản số \d+\./)).toBeVisible();
  await expect(page.getByText(before, { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: t.save, exact: true })).toBeDisabled();

  await page.getByRole('button', { name: t.test.run }).click();
  const sample = page.getByRole('group', { name: t.test.sample.replace('{n}', '1') });
  await expect(sample).toBeVisible();
  await expect(sample).toContainText(t.test.statuses.succeeded);
});
