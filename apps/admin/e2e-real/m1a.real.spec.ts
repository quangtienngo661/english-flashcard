import { expect, test, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import vi from '../messages/vi.json' with { type: 'json' };
import type { RealState } from './global-setup';
import { STATE_FILE } from './global-setup';
import { loginToken } from './support/api';
import { ensureFrozenSet } from './support/ai-config';
import { signIn } from './support/sign-in';

/**
 * M1a on the real stack (design §7, nhóm B §6): the admin adds a fake model, publishes it for `generate_cloze` through a draft on Cấu hình (the draft,
 * a run of it on the frozen example set, the publish), Tình trạng turns "Sẵn sàng", then edits, saves, test-runs and deletes a draft. The API runs with
 * `AI_FAKE_ENABLED=true` and no provider key: nothing leaves the machine. A model can be added once, and a live config that already has `fake:ok`
 * skips the publish.
 */
test.describe.configure({ mode: 'serial' });

/** The fake provider only knows its own model ids (`FAKE_MODELS` in the API); `fake:ok` always answers. */
const modelId = 'fake:ok';
const run = randomUUID().slice(0, 8);
const OP = 'generate_cloze';
const t = vi.ai.configs;

/** Read when the test runs, not when the file loads: the earlier admin story changes the admin's password and rewrites the state file. */
const state = (): RealState => JSON.parse(readFileSync(STATE_FILE, 'utf8'));

async function signInAsAdmin(page: Page) {
  const { admin } = state();
  await signIn(page, admin.email, admin.password);
}

// A run needs a frozen version of the example set; the API makes one from the seeded few-shot examples when the database has none.
test.beforeAll(async () => {
  const { admin } = state();
  await ensureFrozenSet(await loginToken(admin.email, admin.password), OP);
});

test('the admin publishes fake:ok for generate_cloze on Cấu hình, and Tình trạng says "Sẵn sàng"', async ({ page }) => {
  await signInAsAdmin(page);

  await page.goto('/ai/models');
  await expect(page.getByRole('heading', { level: 1, name: vi.nav.aiModels })).toBeVisible();
  const listed = page.getByText(`Fake · ${modelId}`).filter({ visible: true });
  await expect(listed.or(page.getByText(vi.ai.models.empty).filter({ visible: true }))).toBeVisible();
  if ((await listed.count()) === 0) {
    await page.getByRole('button', { name: vi.ai.models.add }).filter({ visible: true }).first().click();
    const dialog = page.getByRole('dialog', { name: vi.ai.models.form.addTitle });
    await dialog.getByRole('button', { name: new RegExp(vi.ai.models.form.provider) }).click();
    await page.getByRole('option', { name: 'Fake' }).click();
    await dialog.getByLabel(vi.ai.models.form.modelId).fill(modelId);
    await dialog.getByRole('button', { name: vi.ai.models.form.submitAdd }).click();
    await expect(dialog).toBeHidden();
  }
  await expect(listed).toBeVisible();

  await page.goto(`/ai/configs?op=${OP}`);
  await expect(page.getByRole('heading', { level: 1, name: vi.nav.aiConfigs })).toBeVisible();
  const live = page.getByRole('region', { name: /^Bản đang chạy · cấu hình \d+$/ });
  await expect(live).toBeVisible();
  // A database that an earlier run already set up has this model live: there is nothing to publish then.
  if ((await live.getByText(`Fake · ${modelId}`).count()) === 0) {
    await page.getByRole('button', { name: t.draft.create, exact: true }).click();
    const draft = page.getByRole('region', { name: /^Nháp · cấu hình \d+ · lần sửa \d+$/ });
    await expect(draft).toBeVisible();
    await draft.getByRole('button', { name: new RegExp(`${vi.ai.operations.row.model}$`) }).click();
    await page.getByRole('option', { name: `Fake · ${modelId}` }).click();
    await draft.getByRole('button', { name: t.draft.save, exact: true }).click();
    await expect(page.getByText(/^Đã lưu nháp, lần sửa \d+\.$/)).toBeVisible();

    // The run of the saved draft on the newest frozen version opens its result; "Xong" means every example has its result.
    await page.getByRole('button', { name: t.draft.runSet }).click();
    await expect(page).toHaveURL(/\/ai\/eval\/runs\/[0-9a-f-]{36}/);
    await expect(page.getByTestId('detail-panel').getByText(vi.ai.eval.status.finished, { exact: true })).toBeVisible({ timeout: 60_000 });
    await page.goBack();

    const publish = page.getByRole('region', { name: t.publish.title });
    const submit = publish.getByRole('button', { name: t.publish.submit, exact: true });
    // A React Aria checkbox hides its input: its visible label is what is seen and clicked.
    const acknowledge = publish.getByText(t.publish.acknowledge);
    // The check is read again on return: "Publish" is on, or the warnings wait for the acknowledgement.
    await expect.poll(async () => (await submit.isEnabled()) || (await acknowledge.isVisible()), { timeout: 20_000 }).toBe(true);
    if (await acknowledge.isVisible()) await acknowledge.click();
    await submit.click();
    await expect(page.getByText(/^Đã publish cấu hình \d+\. Áp từ lần gọi sau\.$/)).toBeVisible();
    await expect(live).toContainText(`Fake · ${modelId}`);
  }

  await page.goto('/ai/status');
  const row = page.getByRole('row').filter({ hasText: OP });
  await expect(row.getByText(vi.ai.status.ready, { exact: true })).toBeVisible();
  await expect(row).toContainText(`Fake · ${modelId}`);
});

// It ends by deleting its draft: files run in name order with one worker, and m3 changes the model of generate_cloze through a published config
// (the helper stops on a draft that is not its own).
test('the admin edits the draft instructions, saves (lần sửa +1), test-runs the draft and deletes it', async ({ page }) => {
  await signInAsAdmin(page);
  await page.goto(`/ai/configs?op=${OP}`);
  await page.getByRole('button', { name: t.draft.create, exact: true }).click();
  const draft = page.getByRole('region', { name: /^Nháp · cấu hình \d+ · lần sửa \d+$/ });
  const title = draft.getByRole('heading', { name: /^Nháp · cấu hình \d+ · lần sửa \d+$/ });
  await expect(title).toBeVisible();
  const before = Number(/lần sửa (\d+)$/.exec(await title.innerText())![1]);
  const save = draft.getByRole('button', { name: t.draft.save, exact: true });
  await expect(save).toBeDisabled();

  await page.getByLabel(vi.ai.prompts.instructions, { exact: true }).fill(`Write one short sentence. (e2e ${run})`);
  await save.click();
  await expect(page.getByText(t.draft.saved.replace('{version}', String(before + 1)))).toBeVisible();
  await expect(title).toContainText(`lần sửa ${before + 1}`);
  await expect(save).toBeDisabled();

  await draft.getByRole('button', { name: vi.ai.prompts.test.run }).click();
  const sample = page.getByRole('group', { name: vi.ai.prompts.test.sample.replace('{n}', '1') });
  await expect(sample).toBeVisible();
  await expect(sample).toContainText(vi.ai.prompts.test.statuses.succeeded);

  await draft.getByRole('button', { name: t.draft.delete }).click();
  await page.getByRole('dialog').getByRole('button', { name: t.draft.delete }).click();
  await expect(page.getByText(t.draft.deleted)).toBeVisible();
  await expect(page.getByRole('button', { name: t.draft.create, exact: true })).toBeVisible();
  await expect(draft).toHaveCount(0);
});
