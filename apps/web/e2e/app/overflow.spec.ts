import { expect, test, type Page } from '@playwright/test';
import { LONG } from '../support/fixtures';
import { mockApi, problem, signedInAs } from '../support/mock-api';

// Review Focus 2: long content never makes the page scroll sideways (390 px in the mobile project, 1440 in desktop).
async function noSideScroll(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

const longMe = { given_name: LONG.givenName, family_name: LONG.familyName, email: LONG.email };

for (const locale of ['vi', 'en'] as const) {
  test(`no horizontal scroll on M1 pages with long names (${locale})`, async ({ page }) => {
    await signedInAs(page, 'pro', {}, { ...longMe, native_language: locale });
    for (const path of ['', '/settings', '/settings/account', '/settings/reports']) {
      await page.goto(`/${locale}/app${path}`);
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
      await noSideScroll(page);
    }
  });

  test(`no horizontal scroll on the sign-in pages (${locale})`, async ({ page }, testInfo) => {
    await mockApi(page, { 'POST /v1/auth/refresh': () => problem(401, 'invalid-token') });
    // Plan part 2 Review Focus 5: 1024 px sits between the two Figma sizes (no brand panel, card layout).
    const widths = testInfo.project.name === 'desktop' ? [undefined, 1024] : [undefined];
    for (const width of widths) {
      if (width) await page.setViewportSize({ width, height: 900 });
      for (const path of ['/login', '/register', '/forgot-password', '/reset-password']) {
        await page.goto(`/${locale}/app${path}`);
        await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
        await noSideScroll(page);
      }
    }
  });
}

// Audit 26/10/2026 #1, #11: a 60-character deck name with no space must not widen the page.
const DECK = '55555555-5555-4555-8555-555555555555';
const UNBROKEN = LONG.unbrokenDeckName;

test('no horizontal scroll on the deck page with an unbroken 60-character name (vi)', async ({ page }) => {
  const summary = { id: DECK, name: UNBROKEN, version: 1, total: 2, today: { priority: 0, due: 2, new: 0 }, cells: [0, 1, 2, 3, 4, 5].map((level) => ({ level, total: level === 1 ? 2 : 0, due: level === 1 ? 2 : 0 })), backlog: 0, available: { due: 2, new: 0 } };
  await signedInAs(page, 'pro', {
    'GET /v1/groups': () => ({ json: { items: [summary] } }),
    [`GET /v1/groups/${DECK}`]: () => ({ json: { id: DECK, name: UNBROKEN, version: 1, item_count: 2, removable_items: 0, created_at: '2026-10-01T03:00:00Z', updated_at: '2026-10-01T03:00:00Z' } }),
    [`GET /v1/groups/${DECK}/queue`]: () => ({ json: { cards: [] } }),
    [`GET /v1/groups/${DECK}/items`]: () => ({ json: { items: [], next_page_token: null } }),
  });
  await page.goto(`/vi/app/group?id=${DECK}`);
  await expect(page.getByRole('heading', { level: 1, name: UNBROKEN })).toBeVisible();
  await noSideScroll(page);
});

test('no horizontal scroll on weak words with an unbroken deck name (vi)', async ({ page }) => {
  await signedInAs(page, 'pro', {
    'GET /v1/practice/weak-words/groups': () => ({ json: { total: 3, items: [{ group_id: DECK, name: UNBROKEN, count: 3 }] } }),
    'GET /v1/practice/weak-words': () => ({
      json: {
        items: ['arrive', 'leave', 'book'].map((lemma, i) => ({ sense_id: `00000000-0000-4000-8000-00000000070${i}`, lemma, wrong: 2, counted: 2, level: 0, last_wrong_at: new Date().toISOString(), meaning: lemma })),
        next_page_token: null,
      },
    }),
  });
  await page.goto('/vi/app/practice/weak');
  await page.getByRole('button', { name: /Nhóm/ }).click();
  await page.getByRole('option', { name: `${UNBROKEN} · 3` }).click();
  await expect(page.getByRole('button', { name: `Luyện 3 từ của nhóm ${UNBROKEN}` })).toBeVisible();
  await noSideScroll(page);
});

// Whole-branch review of the fix: the backlog line on Today and the Backlog page print the deck name too.
test('no horizontal scroll on Today and Backlog with an unbroken deck name and overdue words (vi)', async ({ page }) => {
  const summary = { id: DECK, name: UNBROKEN, version: 1, total: 2, today: { priority: 0, due: 0, new: 0 }, cells: [0, 1, 2, 3, 4, 5].map((level) => ({ level, total: level === 1 ? 2 : 0, due: 0 })), backlog: 2 };
  const backlogRow = (n: number, lemma: string) => ({
    item_id: `00000000-0000-4000-8000-00000000080${n}`, sense_id: `00000000-0000-4000-8000-00000000090${n}`, level: 2, due_date: '2026-08-01', days_overdue: 80 + n,
    content: { lemma, pos: 'verb', meaning: { text: lemma, language: 'vi', translation_missing: false }, examples: [] },
  });
  await signedInAs(page, 'pro', {
    'GET /v1/groups': () => ({ json: { items: [summary] } }),
    [`GET /v1/groups/${DECK}`]: () => ({ json: { id: DECK, name: UNBROKEN, version: 1, item_count: 2, removable_items: 0, created_at: '2026-10-01T03:00:00Z', updated_at: '2026-10-01T03:00:00Z' } }),
    [`GET /v1/groups/${DECK}/backlog`]: () => ({ json: { items: [backlogRow(1, 'leave'), backlogRow(2, 'forget')], next_page_token: null } }),
  });
  await page.goto('/vi/app');
  await expect(page.getByText(new RegExp(`${UNBROKEN.slice(0, 20)}`)).first()).toBeVisible();
  await noSideScroll(page);
  await page.goto(`/vi/app/group/backlog?id=${DECK}`);
  await expect(page.getByText('leave').first()).toBeVisible();
  await noSideScroll(page);
});

// Part 3 Review Focus 5: a 60-character unbroken name on a Hôm nay deck card (150 px on phones, 176 px on desktop).
test('no horizontal scroll on Today with an unbroken name on a deck card (vi)', async ({ page }) => {
  const cells = [0, 1, 2, 3, 4, 5].map((level) => ({ level, total: level === 1 ? 6 : 0, due: level === 1 ? 6 : 0 }));
  const deck = (id: string, name: string, due: number) => ({
    id, name, version: 1, total: 6, today: { priority: 0, due, new: 0 }, cells, backlog: 0, available: { due, new: 0 }, next_lemma: UNBROKEN,
  });
  await signedInAs(page, 'pro', {
    'GET /v1/groups': () => ({ json: { items: [deck('00000000-0000-4000-8000-000000000a01', 'Hero', 6), deck(DECK, UNBROKEN, 3)] } }),
  });
  await page.goto('/vi/app');
  await expect(page.getByRole('list', { name: 'Nhóm của bạn' }).getByRole('link', { name: UNBROKEN })).toBeVisible();
  await noSideScroll(page);
});

// Giao diện mới M4.5: a 60-character word with no space, lifted into the Tra từ card, must not widen the page (390 px on phones).
test('no horizontal scroll on Tra từ with an unbroken 60-character word (vi)', async ({ page }) => {
  const word = 'a'.repeat(60);
  const sense = {
    sense_id: '00000000-0000-4000-8000-000000000801', entry_id: '00000000-0000-4000-8000-000000000802', scope: 'catalog', lemma: word, pos: 'noun', level: 'B1',
    context_label: null, meaning: { text: 'nghĩa rất dài', language: 'vi', translation_missing: false }, definition_en: null, examples: [`The ${word} is here.`],
    topics: [], form_of: null, ai_suggested: false, sentence_count: 0,
  };
  await signedInAs(page, 'pro', {
    'GET /v1/words': () => ({ json: { items: [{ lemma: word, pos_list: ['noun'], level: 'B1', meaning_preview: 'nghĩa rất dài', has_private: false, ipa: 'eɪ', example: `The ${word} is here.` }], next_page_token: null, total: 1 } }),
    [`GET /v1/words/${word}`]: () => ({ json: { lemma: word, inflections: [], sections: [{ pos: 'noun', senses: [sense] }] } }),
    'GET /v1/items': () => ({ json: { items: [] } }),
    'GET /v1/groups': () => ({ json: { items: [] } }),
    'GET /v1/topics': () => ({ json: { items: [] } }),
  });
  await page.goto('/vi/app/lookup?level=B1');
  await expect(page.getByRole('region', { name: 'Thẻ của từ đang chọn' }).getByRole('heading', { name: word })).toBeVisible();
  await noSideScroll(page);
});
