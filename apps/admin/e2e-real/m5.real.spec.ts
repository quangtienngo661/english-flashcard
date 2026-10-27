import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import vi from '../messages/vi.json' with { type: 'json' };
import type { RealState } from './global-setup';
import { STATE_FILE } from './global-setup';
import { apiCall, loginToken } from './support/api';

/** M5 on the real stack (design §7), as Minh (editor): edit a word's level; save a sense draft and publish it from the list; add a topic and archive it. */
const state: RealState = JSON.parse(readFileSync(STATE_FILE, 'utf8'));
// Sorts first in the catalog (lists are ordered by lemma), so the row is on the first page whatever else the database holds.
const lemma = `aaam5x${state.run}`;
const topic = `m5-${state.run}`;
let senseId = '';

async function signIn(page: Page) {
  await page.goto('/login');
  await page.getByLabel(vi.account.login.email).fill(state.editor.email);
  await page.getByLabel(vi.account.login.password, { exact: true }).fill(state.editor.password);
  await page.getByRole('button', { name: vi.account.login.submit }).click();
  await expect(page).toHaveURL(/\/uploads$/);
}

test.beforeAll(async () => {
  const token = await loginToken(state.editor.email, state.editor.password);
  const { items } = await apiCall<{ items: Array<{ status: string; sense_id?: string }> }>('POST', '/v1/admin/content/entries/batch', token, { lines: [`${lemma},noun`] });
  expect(['created', 'exists']).toContain(items[0].status); // 'exists' when this hook re-runs after a failed test
  senseId = items[0].sense_id!;
});

test('Minh edits the level of a new word from its row menu', async ({ page }) => {
  await signIn(page);
  await page.goto(`/words?q=${lemma}`);
  await page.getByRole('button', { name: vi.words.actionsFor.replace('{word}', `${lemma} · noun`) }).first().click();
  await page.getByRole('menuitem', { name: vi.words.editLevel }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: new RegExp(vi.words.level) }).click();
  await page.getByRole('option', { name: 'B2' }).click();
  await dialog.getByRole('button', { name: vi.words.save }).click();
  await expect(dialog).toBeHidden();
  const row = page.locator('tbody tr', { hasText: lemma });
  await expect(row.getByText('B2')).toBeVisible();
});

test('Minh saves a draft of its sense, then publishes it from the list', async ({ page }) => {
  await signIn(page);
  await page.goto(`/senses/${senseId}`);
  await page.getByLabel(vi.senses.detail.gloss).fill('từ thử của M5');
  await page.getByLabel(vi.senses.detail.definition).fill('a word made by the M5 real-stack test');
  await page.getByLabel('Câu ví dụ 1').fill(`This is ${lemma} in a sentence.`);
  await page.getByRole('button', { name: vi.senses.detail.saveDraft }).click();
  await expect(page.getByText(vi.senses.detail.draftSaved)).toBeVisible();

  await page.goto('/senses?status=open_draft&level=B2');
  await page.locator(`label:has(input[aria-label="${vi.senses.bulk.pick.replace('{word}', `${lemma} · noun`)}"])`).filter({ visible: true }).first().click();
  await page.getByRole('region', { name: vi.senses.bulk.region }).getByRole('button', { name: vi.senses.bulk.actions.publish }).click();
  const result = page.getByRole('dialog', { name: vi.senses.bulk.resultTitle });
  await expect(result.getByText('1 nghĩa thành công · 0 nghĩa không làm được')).toBeVisible();
  await result.getByRole('button', { name: vi.senses.bulk.close }).click();

  await page.goto(`/senses/${senseId}`);
  await expect(page.getByText(`Publish: ${state.editor.email}`)).toBeVisible();
});

test('Minh adds a topic and archives it', async ({ page }) => {
  await signIn(page);
  await page.goto('/topics');
  await page.getByRole('button', { name: vi.topics.addTitle }).click();
  const dialog = page.getByRole('dialog', { name: vi.topics.addTitle });
  await dialog.getByLabel(vi.topics.code).fill(topic);
  await dialog.getByLabel(vi.topics.nameVi).fill('Chủ đề thử M5');
  await dialog.getByRole('button', { name: vi.topics.add }).click();
  await expect(dialog).toBeHidden();
  const row = page.locator('tbody tr', { hasText: topic });
  await expect(row.getByText(vi.topics.active)).toBeVisible();
  await row.getByRole('button', { name: `Lưu trữ ${topic}` }).click();
  await expect(row.getByText(vi.topics.archived)).toBeVisible();
});
