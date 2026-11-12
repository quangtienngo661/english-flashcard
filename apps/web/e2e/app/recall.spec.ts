import { expect, test, type Page } from '@playwright/test';
import { copy } from '../copy';
import { seriousViolations } from '../support/axe';
import { requests, signedInAs, type MockHandler } from '../support/mock-api';

// M5.9: Ôn (/app/recall) on the mocked API — the first Playwright test of this page. One MCQ by meaning and one typed word, the wrong
// typed word set against the answer after "Xem đáp án", then the summary; axe clean and no sideways scroll at 1440 and 390 px.
// Sessions speak English on every route (QM9-9, SessionIntl).
const en = copy.en.App;
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const DECK = uuid(801);
const SESSION = uuid(802);

const mcq = {
  item_id: uuid(811), round: 1, position: 1, type: 'mcq_definition', prompt_style: 'meaning', hint_level: 0, state: 'unanswered', tries: 0,
  reportable: false, ai: false, hints_available: { level1: true, level2: false, level3: false },
  prompt: { kind: 'mcq', meaning: 'hành lý', meaning_language: 'vi', context_label: null, options: ['luggage', 'ticket', 'delay', 'gate'] },
};
const typed = {
  item_id: uuid(812), round: 1, position: 2, type: 'type_word', prompt_style: 'meaning', hint_level: 0, state: 'unanswered', tries: 0,
  reportable: false, ai: false, hints_available: { level1: true, level2: false, level3: false },
  prompt: { kind: 'type_meaning', meaning: 'xấu đi', meaning_language: 'vi', context_label: null },
};
const result = (over: Record<string, unknown>) => ({
  result: 'correct', skipped: false, tries: 1, hint_level: 0, definition_en: null, show_known: false, highlight_needs_review: false,
  translation: null, alternative: null, streak: null, level: null, ...over,
});

function recallApi(): Record<string, MockHandler> {
  let asked = 0;
  let status = 'active';
  const view = () => ({
    id: SESSION, kind: 'recall', source: 'group', group_id: DECK, group_filter: null, sort: 'queue', types: ['mcq_definition', 'type_word'],
    prompt_style: 'meaning', target_count: 2, status, round: 1, asked, words: 2, ai_planned: 0, cloze_source: null, correct: 0, wrong: 0,
  });
  return {
    'GET /v1/groups': () => ({ json: { items: [{ id: DECK, name: 'Du lịch', version: 1, total: 12, today: { priority: 0, due: 0, new: 3 }, cells: [], backlog: 0, available: { due: 0, new: 3 } }] } }),
    [`GET /v1/groups/${DECK}`]: () => ({ json: { id: DECK, name: 'Du lịch', version: 1, item_count: 12, removable_items: 0, created_at: '', updated_at: '' } }),
    'POST /v1/practice/sessions': () => ({ status: 201, json: { session: view() } }),
    [`POST /v1/practice/sessions/${SESSION}/next`]: () => {
      if (asked >= 2) {
        status = 'finished';
        return { json: { state: 'finished', session: view() } };
      }
      asked += 1;
      return { json: { state: 'question', session: view(), item: asked === 1 ? mcq : typed } };
    },
    [`POST /v1/practice/items/${uuid(811)}/answer`]: () => ({
      json: result({ correct: { lemma: 'luggage', text: 'luggage', choice_index: 0, is_true: null }, meaning: 'hành lý', schedule: { level: 3, due_date: '2026-11-18', outcome: 'leveled_up' } }),
    }),
    [`POST /v1/practice/items/${uuid(812)}/answer`]: () => ({ json: { result: 'try_again', tries: 1 } }),
    [`POST /v1/practice/items/${uuid(812)}/skip`]: () => ({
      json: result({ result: 'wrong', skipped: true, highlight_needs_review: true, correct: { lemma: 'deteriorate', text: 'deteriorate', choice_index: null, is_true: null }, meaning: 'xấu đi', schedule: null }),
    }),
    [`POST /v1/practice/items/${uuid(812)}/review`]: () => ({ json: { action: 'needs_review', item_id: uuid(812), level: 1 } }),
    [`POST /v1/practice/sessions/${SESSION}/finish`]: () => {
      status = 'finished';
      return { json: { session: view() } };
    },
    [`GET /v1/practice/sessions/${SESSION}/summary`]: () => ({
      json: {
        session: view(), asked: 2, correct: 1, wrong: 1, recall: { leveled_up: 1, correct_kept: 0 },
        words: [{ sense_id: uuid(821), lemma: 'deteriorate', meaning: 'xấu đi', item_id: uuid(812), action: 'needs_review' }],
      },
    }),
  };
}

async function noSideScroll(page: Page, where: string) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), where).toBe(false);
}

for (const scheme of ['light', 'dark'] as const) {
  test(`Ôn: a multiple choice, a typed word with its compare line, the summary; axe and overflow (${scheme})`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.emulateMedia({ colorScheme: scheme });
    await signedInAs(page, 'free', recallApi());
    await page.goto(`/vi/app/recall?group=${DECK}`);

    await expect(page.getByText('hành lý', { exact: true })).toBeVisible();
    await noSideScroll(page, `${scheme} mcq`);
    expect(await seriousViolations(page), `${scheme} mcq`).toEqual([]);
    await page.getByRole('button', { name: /luggage/ }).click();
    await expect(page.getByText(en.practice.session.right, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: new RegExp(en.practice.session.next) }).click();

    const field = page.getByRole('textbox', { name: en.practice.session.answerLabel });
    await field.fill('deteriorated');
    await field.press('Enter');
    await expect(page.getByText(en.practice.session.tryAgainBody)).toBeVisible();
    expect(requests(page, 'POST', `/v1/practice/items/${uuid(812)}/answer`).map((r) => r.body)).toEqual([{ text: 'deteriorated' }]);
    await page.getByRole('button', { name: en.practice.session.reveal }).click();
    const compare = page.getByRole('group', { name: 'Letters: you typed deteriorated, the answer is deteriorate' });
    await expect(compare).toBeVisible();
    await expect(compare.locator('[data-mark="extra"]')).toHaveText('d');
    // Ôn never shows the AI label or Báo lỗi.
    await expect(page.getByRole('button', { name: en.practice.session.report.button })).toHaveCount(0);
    await noSideScroll(page, `${scheme} compare`);
    expect(await seriousViolations(page), `${scheme} compare`).toEqual([]);

    await page.getByRole('button', { name: /Next/ }).click();
    await expect(page.getByRole('heading', { name: '2 words done.' })).toBeVisible();
    await expect(page.getByRole('img', { name: '1/2 right' })).toBeVisible();
    await noSideScroll(page, `${scheme} summary`);
    expect(await seriousViolations(page), `${scheme} summary`).toEqual([]);
  });
}
