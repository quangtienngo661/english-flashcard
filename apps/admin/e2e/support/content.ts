import type { Page } from '@playwright/test';
import type { MockHandler } from './mock-api';

const at = '2026-10-18T02:12:00.000Z';
export const SENSE_ID = '5e0a0000-0000-4000-8000-000000000001';
const longGloss = 'triển khai một bản phần mềm lên máy chủ để mọi người dùng được, kể cả khi tên rất dài-không-có-chỗ-ngắt-dòng-nào-cả';

export const entry = {
  id: 'e1', lemma: 'deploy', pos: 'verb', function_word: false, function_word_derived: false, function_word_override: null,
  variants: [{ id: 'v1', text: 'deploi-with-an-unusually-long-alternative-spelling', kind: 'spelling', accepted_as_answer: true }],
  displayed_level: 'B1', conflict: true,
  senses: [{ sense_id: SENSE_ID, context_label: null, state: 'open', live_revision_id: 'r1', replaces_sense_id: null, revision: 2, status: 'draft' }],
};
export const senseRow = {
  sense_id: SENSE_ID, context_label: null, state: 'open', live_revision_id: 'r1', replaces_sense_id: null, revision: 2, status: 'draft',
  entry_id: 'e1', lemma: 'deploy', pos: 'verb', displayed_level: 'B1', conflict: false, function_word: false,
  content: { gloss_vi: longGloss, definition_en: 'to move software to a server', examples_en: ['We deploy on Friday.'], topics: ['food'], accepted_forms: ['deploys'] },
  missing: ['example-missing'],
};
export const senseDetail = {
  ...senseRow, reviewed_by: null, reviewed_at: null, published_by: null,
  state_changed_by: { id: 'u1', email: 'an.admin.with-a-rather-long-address@wordmet.com' }, state_changed_at: at,
};
const topics = [
  { code: 'food', names: { vi: 'Ăn uống', en: 'Food' }, archived_at: null },
  { code: 'sports-old', names: { vi: 'Thể thao (cũ)' }, archived_at: at },
];

export const contentMocks: Record<string, MockHandler> = {
  'GET /v1/admin/taxonomy/topics': () => ({ json: { items: topics } }),
  'GET /v1/admin/content/entries': () => ({ json: { items: [entry], next_page_token: null } }),
  'GET /v1/admin/content/senses': () => ({ json: { items: [senseRow], next_page_token: null } }),
  [`GET /v1/admin/content/senses/${SENSE_ID}`]: () => ({ json: senseDetail }),
};

/** A React Aria checkbox hides its input; click the visible box (table at 1440, card at 390) that the input sits in. */
export async function tick(page: Page, name: string): Promise<void> {
  await page.locator(`label:has(input[aria-label="${name}"])`).filter({ visible: true }).first().click();
}
