import { expect, test, type Page } from '@playwright/test';
import vi from '../messages/vi.json' with { type: 'json' };
import { contentMocks, SENSE_ID, tick } from './support/content';
import { problem, requests, signedInAs } from './support/mock-api';

/** M5 (A/87–A/89) on the mocked API: the main flow of each page, for an editor (they hold every permission these pages need). */
test.use({ locale: 'vi-VN' });

async function openNavIfCollapsed(page: Page) {
  if ((page.viewportSize()?.width ?? 0) < 1024) await page.getByRole('button', { name: vi.shell.openMenu }).click();
}

test('Từ: menu → filter in the URL → edit a level through the row menu', async ({ page }) => {
  await signedInAs(page, 'editor', {
    ...contentMocks,
    'GET /v1/admin/content/uploads': () => ({ json: { items: [], next_page_token: null } }),
    'PUT /v1/admin/content/entries/e1/levels/editorial': () => ({ status: 204 }),
  });
  await page.goto('/uploads');
  await openNavIfCollapsed(page);
  await page.getByRole('navigation', { name: vi.shell.mainNav }).getByRole('link', { name: vi.nav.words }).click();
  await expect(page.getByRole('heading', { level: 1, name: vi.nav.words })).toBeVisible();
  await page.getByText(vi.words.filters.conflict).click();
  await expect(page).toHaveURL(/\/words\?conflict=true$/);
  await page.getByRole('button', { name: vi.words.actionsFor.replace('{word}', 'deploy · verb') }).filter({ visible: true }).first().click();
  await page.getByRole('menuitem', { name: vi.words.editLevel }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: new RegExp(vi.words.level) }).click();
  await page.getByRole('option', { name: 'C1' }).click();
  await dialog.getByRole('button', { name: vi.words.save }).click();
  await expect(dialog).toBeHidden();
  expect(requests(page, 'PUT', '/v1/admin/content/entries/e1/levels/editorial')[0].body).toEqual({ level: 'C1' });
});

test('Từ: Xóa từ asks first; a refusal lists why and keeps the word; the next confirm deletes it', async ({ page }) => {
  let refuse = true;
  await signedInAs(page, 'editor', {
    ...contentMocks,
    'GET /v1/admin/content/uploads': () => ({ json: { items: [], next_page_token: null } }),
    'DELETE /v1/admin/content/entries/e1': () => (refuse ? problem(409, 'entry-in-use', { reasons: ['published-sense', 'learner-data'] }) : { status: 204 }),
  });
  await page.goto('/words');
  await page.getByRole('button', { name: vi.words.actionsFor.replace('{word}', 'deploy · verb') }).filter({ visible: true }).first().click();
  await page.getByRole('menuitem', { name: vi.words.deleteWord }).click();
  const dialog = page.getByRole('dialog', { name: vi.words.deleteTitle.replace('{word}', 'deploy') });
  await expect(dialog.getByText(vi.words.deleteBody)).toBeVisible();
  expect(requests(page, 'DELETE', '/v1/admin/content/entries/e1')).toHaveLength(0);
  await dialog.getByRole('button', { name: vi.words.deleteConfirm }).click();
  await expect(dialog.getByRole('alert').getByRole('listitem')).toHaveText([vi.words.deleteBlocked['published-sense'], vi.words.deleteBlocked['learner-data']]);
  refuse = false;
  await dialog.getByRole('button', { name: vi.words.deleteConfirm }).click();
  await expect(dialog).toBeHidden();
  expect(requests(page, 'DELETE', '/v1/admin/content/entries/e1')).toHaveLength(2);
});

test('Nghĩa: pick a row → Publish → result; the row opens its detail', async ({ page }) => {
  await signedInAs(page, 'editor', {
    ...contentMocks,
    'GET /v1/admin/content/uploads': () => ({ json: { items: [], next_page_token: null } }),
    'POST /v1/admin/content/senses/publish': () => ({ json: { results: [{ sense_id: SENSE_ID, outcome: 'refused', reason: 'stale-revision' }] } }),
  });
  await page.goto('/senses');
  await tick(page, vi.senses.bulk.pick.replace('{word}', 'deploy · verb'));
  await page.getByRole('region', { name: vi.senses.bulk.region }).getByRole('button', { name: vi.senses.bulk.actions.publish }).click();
  const result = page.getByRole('dialog', { name: vi.senses.bulk.resultTitle });
  await expect(result.getByText(vi.senses.bulk.reasons['stale-revision'])).toBeVisible();
  expect(requests(page, 'POST', '/v1/admin/content/senses/publish')[0].body).toEqual({ items: [{ sense_id: SENSE_ID, revision: 2 }] });
  await result.getByRole('button', { name: vi.senses.bulk.close }).click();
  await page.getByRole('link', { name: 'deploy' }).filter({ visible: true }).first().click();
  await expect(page).toHaveURL(new RegExp(`/senses/${SENSE_ID}$`));
  await expect(page.getByText(vi.senses.detail.notReviewed)).toBeVisible();
});

test('Chi tiết nghĩa: 422 marks the missing field; leaving with changes asks first', async ({ page }) => {
  await signedInAs(page, 'editor', {
    ...contentMocks,
    'GET /v1/admin/content/uploads': () => ({ json: { items: [], next_page_token: null } }),
    [`POST /v1/admin/content/senses/${SENSE_ID}/quick-publish`]: () => problem(422, 'publish-incomplete', { violations: ['gloss-missing'] }),
  });
  await page.goto(`/senses/${SENSE_ID}`);
  const gloss = page.getByLabel(vi.senses.detail.gloss);
  await gloss.fill('');
  await page.getByRole('button', { name: vi.senses.detail.savePublish }).click();
  await expect(gloss).toBeFocused();
  await expect(gloss).toHaveAttribute('aria-invalid', 'true');
  await openNavIfCollapsed(page);
  await page.getByRole('navigation', { name: vi.shell.mainNav }).getByRole('link', { name: vi.nav.topics }).click();
  await expect(page.getByRole('dialog', { name: vi.leave.title })).toBeVisible();
});

test('Chủ đề: add a topic, then archive one', async ({ page }) => {
  await signedInAs(page, 'editor', {
    ...contentMocks,
    'GET /v1/admin/content/uploads': () => ({ json: { items: [], next_page_token: null } }),
    'POST /v1/admin/taxonomy/topics': () => ({ status: 201, json: { code: 'travel', names: { vi: 'Du lịch' }, archived_at: null } }),
    'PATCH /v1/admin/taxonomy/topics/food': () => ({ json: { code: 'food', names: { vi: 'Ăn uống' }, archived_at: '2026-10-27T00:00:00.000Z' } }),
  });
  await page.goto('/topics');
  await page.getByRole('button', { name: vi.topics.addTitle }).click();
  const dialog = page.getByRole('dialog', { name: vi.topics.addTitle });
  await dialog.getByLabel(vi.topics.code).fill('travel');
  await dialog.getByLabel(vi.topics.nameVi).fill('Du lịch');
  await dialog.getByRole('button', { name: vi.topics.add }).click();
  await expect(dialog).toBeHidden();
  expect(requests(page, 'POST', '/v1/admin/taxonomy/topics')[0].body).toEqual({ code: 'travel', names: { vi: 'Du lịch' } });
  await page.getByRole('button', { name: 'Lưu trữ food' }).filter({ visible: true }).first().click();
  await expect.poll(() => requests(page, 'PATCH', '/v1/admin/taxonomy/topics/food').length).toBe(1);
  expect(requests(page, 'PATCH', '/v1/admin/taxonomy/topics/food')[0].body).toEqual({ archived: true });
});
