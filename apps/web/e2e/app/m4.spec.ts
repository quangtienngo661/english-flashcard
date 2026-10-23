import { expect, test, type Page } from '@playwright/test';
import { copy } from '../copy';
import { seriousViolations } from '../support/axe';
import { APP_CONFIG, entitlementsBody, LONG, nextHcmMidnight } from '../support/fixtures';
import { problem, requests, signedInAs, type MockHandler } from '../support/mock-api';

const vi = copy.vi.App.practice;
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const DECK = uuid(301);
const SESSION = uuid(400);
const LONG_MEANING = 'triển khai phần mềm lên máy chủ thật để mọi người dùng có thể sử dụng phiên bản mới nhất của ứng dụng ngay lập tức';
const LONG_OPTION = 'internationalization-ready-microservices';

const deck = (name = 'Công nghệ') => ({
  id: DECK, name, version: 1, total: 18, today: { priority: 2, due: 6, new: 3 },
  cells: [0, 1, 2, 3, 4, 5].map((level) => ({ level, total: 3, due: 1 })), backlog: 0,
});
const hints = { level1: true, level2: true, level3: false };
const mcq = (long: boolean) => ({
  item_id: uuid(501), round: 1, position: 1, type: 'mcq_definition', prompt_style: 'meaning', hint_level: 0, state: 'unanswered', tries: 0, reportable: true,
  hints_available: hints,
  prompt: { kind: 'mcq', meaning: long ? LONG_MEANING : 'triển khai', meaning_language: 'vi', context_label: 'phần mềm', options: ['deploy', long ? LONG_OPTION : 'delay', 'deliver', 'defend'] },
});
const trueFalse = {
  item_id: uuid(502), round: 1, position: 2, type: 'true_false_definition', prompt_style: 'meaning', hint_level: 0, state: 'unanswered', tries: 0, reportable: true,
  hints_available: { level1: false, level2: false, level3: false },
  prompt: { kind: 'true_false', lemma: 'server', meaning: 'máy chủ', meaning_language: 'vi', context_label: null },
};
const typed = (n: number) => ({
  item_id: uuid(500 + n), round: n > 3 ? 2 : 1, position: n, type: 'type_word', prompt_style: 'meaning', hint_level: 0, state: 'unanswered', tries: 0, reportable: true,
  hints_available: hints,
  prompt: { kind: 'type_meaning', meaning: 'bộ nhớ đệm', meaning_language: 'vi', context_label: 'máy tính' },
});
const result = (right: boolean, lemma: string, meaning: string, over: Record<string, unknown> = {}) => ({
  result: right ? 'correct' : 'wrong', skipped: false, tries: 1, hint_level: 0,
  correct: { lemma, text: lemma, choice_index: lemma === 'deploy' ? 0 : null, is_true: lemma === 'server' ? true : null },
  meaning, definition_en: null, show_known: right, highlight_needs_review: !right, translation: null, ...over,
});

/**
 * A practice API for one learner: a 4-question session over 3 words (so it asks to continue after round 1), MCQ, true/false,
 * typing with one retry; the summary lists the wrong word. `long` gives the long meaning and option (Review Focus 2).
 */
function practiceApi({ long = false, open = false, used = 1 } = {}): Record<string, MockHandler> {
  let asked = open ? 1 : 0;
  let status = open ? 'active' : 'none';
  const questions = [mcq(long), trueFalse, typed(3), typed(4)];
  const view = () => ({
    id: SESSION, source: 'today', group_id: null, group_filter: null, sort: 'queue', types: ['mcq_definition', 'true_false_definition', 'type_word'],
    prompt_style: 'mixed', target_count: 4, status, round: asked > 3 ? 2 : 1, asked, words: 3, ai_planned: 0, cloze_source: null,
  });
  let continued = false;
  const ask = () => {
    if (asked === 3 && status === 'active' && !continued) {
      status = 'waiting_continue';
      return { json: { state: 'waiting_continue', session: view() } };
    }
    if (asked >= 4) {
      status = 'finished';
      return { json: { state: 'finished', session: view() } };
    }
    asked += 1;
    return { json: { state: 'question', session: view(), item: questions[asked - 1] } };
  };
  let typedTries = 0;
  return {
    'GET /v1/groups': () => ({ json: { items: [deck(long ? LONG.deckName : 'Công nghệ')] } }),
    'GET /v1/me/entitlements': () => {
      const body = entitlementsBody('free');
      body.pools.practice_sessions = { limit: 3, used, remaining: 3 - used, resets_at: nextHcmMidnight() };
      return { json: body };
    },
    'GET /v1/practice/sessions/current': () =>
      status === 'active' || status === 'waiting_continue'
        ? { json: { session: view(), item: status === 'active' ? questions[asked - 1] : null, preparing: false } }
        : problem(404, 'not-found'),
    'POST /v1/practice/sessions': () => {
      if (used >= 3) return problem(403, 'quota-exhausted', { resets_at: nextHcmMidnight() });
      asked = 0;
      status = 'active';
      used += 1;
      return { status: 201, json: { session: view() } };
    },
    [`POST /v1/practice/sessions/${SESSION}/next`]: ask,
    [`POST /v1/practice/sessions/${SESSION}/continue`]: (req) => {
      continued = true;
      status = (req.body as { continue: boolean }).continue ? 'active' : 'finished';
      return { json: { session: view() } };
    },
    [`POST /v1/practice/sessions/${SESSION}/finish`]: () => {
      status = 'finished';
      return { json: { session: view() } };
    },
    [`GET /v1/practice/sessions/${SESSION}/summary`]: () => ({
      json: { session: view(), asked, correct: Math.max(0, asked - 1), wrong: 1, words: [{ sense_id: uuid(601), lemma: 'deploy', meaning: 'triển khai', item_id: uuid(501), action: null }] },
    }),
    [`POST /v1/practice/items/${uuid(501)}/answer`]: (req) => ({ json: result((req.body as { choice: number }).choice === 0, 'deploy', 'triển khai') }),
    [`POST /v1/practice/items/${uuid(501)}/hint`]: () => ({ json: { level: 1, hint: { kind: 'definition', text: 'to start using a new system' } } }),
    [`POST /v1/practice/items/${uuid(501)}/review`]: () => ({ json: { action: 'needs_review', item_id: uuid(501), level: 1, due_date: '2026-10-23', priority: true } }),
    [`POST /v1/practice/items/${uuid(501)}/report`]: () => ({ status: 201, json: { id: uuid(701) } }),
    [`POST /v1/practice/items/${uuid(502)}/answer`]: () => ({ json: result(true, 'server', 'máy chủ') }),
    [`POST /v1/practice/items/${uuid(503)}/answer`]: (req) => {
      typedTries += 1;
      if (typedTries === 1) return { json: { result: 'try_again', tries: 1 } };
      return { json: result((req.body as { text: string }).text === 'cache', 'cache', 'bộ nhớ đệm', { tries: 2, show_known: false }) };
    },
    [`POST /v1/practice/items/${uuid(504)}/answer`]: () => ({ json: result(true, 'cache', 'bộ nhớ đệm') }),
    'GET /v1/practice/report-reasons': () => ({
      json: { items: [
        { code: 'meaning_wrong', label: 'Nghĩa sai', detail_hint: null, note_required: false },
        { code: 'graded_wrong', label: 'Đáp án đúng mà bị chấm sai', detail_hint: null, note_required: false },
        { code: 'hint_wrong', label: 'Gợi ý sai', detail_hint: null, note_required: false },
        { code: 'other', label: 'Khác', detail_hint: null, note_required: true },
      ] },
    }),
    'GET /v1/practice/weak-words/groups': () => ({ json: { total: 4, items: [{ group_id: DECK, name: long ? LONG.deckName : 'Công nghệ', count: 2 }] } }),
    'GET /v1/practice/weak-words': (req) => ({
      json: {
        items: [
          { sense_id: uuid(601), lemma: 'deploy', wrong: 3, counted: 5, level: 1, last_wrong_at: new Date().toISOString(), meaning: long ? LONG_MEANING : 'triển khai' },
          ...(req.query.get('group_id') ? [] : [{ sense_id: uuid(602), lemma: 'cache', wrong: 2, counted: 4, level: 2, last_wrong_at: '2026-10-20T14:00:00Z', meaning: 'bộ nhớ đệm' }]),
        ],
        next_page_token: null,
      },
    }),
    'GET /v1/practice/history': () => ({
      json: {
        items: [
          { item_id: uuid(501), session_id: SESSION, sense_id: uuid(601), lemma: 'deploy', type: 'mcq_definition', prompt_style: 'meaning',
            prompt: { kind: 'mcq', meaning: long ? LONG_MEANING : 'triển khai', options: ['deploy', 'delay', 'deliver', 'defend'] }, answer: '1',
            correct: { lemma: 'deploy', text: 'deploy', choice_index: 0, is_true: null }, result: 'wrong', skipped: false, tries: 1, hint_level: 0,
            review_action: 'needs_review', answered_at: new Date().toISOString(), local_date: '2026-10-23', translation: null },
        ],
        next_page_token: null,
      },
    }),
    'GET /v1/practice/reports': () => ({
      json: { items: [{ id: uuid(701), item_id: uuid(501), sense_id: uuid(601), reason_label: long ? 'Câu sai ngữ pháp hoặc không tự nhiên' : 'Khác', status: 'confirmed', refunded: true, created_at: '2026-10-22T03:00:00Z', resolved_at: '2026-10-22T05:00:00Z' }], next_page_token: null },
    }),
    [`GET /v1/senses/${uuid(601)}`]: () => ({ json: { sense_id: uuid(601), lemma: 'deploy' } }),
  };
}

test.describe('M4 flows (mocked API)', () => {
  test('a default session: each question type, a hint, a retry, the round prompt, a report and the summary', async ({ page }) => {
    await signedInAs(page, 'free', practiceApi());
    await page.goto('/vi/app/practice');
    await page.getByRole('region', { name: vi.hero.title }).getByRole('button', { name: 'Bắt đầu 10 câu' }).click();
    await expect(page).toHaveURL(/\/vi\/app\/practice\/session$/);
    expect(requests(page, 'POST', '/v1/practice/sessions')[0].body).toEqual({ source: 'today', types: ['mcq_definition', 'true_false_definition', 'type_word'], count: 10 });

    // MCQ: a hint with H, then a wrong choice with key 2.
    await expect(page.getByText('triển khai', { exact: true })).toBeVisible();
    await page.keyboard.press('h');
    await expect(page.getByText('to start using a new system')).toBeVisible();
    await page.getByRole('button', { name: vi.session.report.button }).click();
    const dialog = page.getByRole('dialog', { name: vi.session.report.title });
    await dialog.getByText('Nghĩa sai', { exact: true }).click();
    await dialog.getByRole('button', { name: vi.session.report.send }).click();
    await expect(page.getByText(vi.session.report.done)).toBeVisible();
    await expect(dialog).toBeHidden();
    await page.keyboard.press('2');
    await expect(page.getByText(vi.session.wrong, { exact: true })).toBeVisible();
    await page.keyboard.press('Enter');

    // True/false, right.
    await expect(page.getByText(vi.session.ask.true_false)).toBeVisible();
    await page.getByRole('button', { name: /1 Đúng/ }).click();
    await expect(page.getByText(vi.session.right, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: /Câu tiếp/ }).click();

    // Typing: a miss, then the right word.
    const answer = page.getByRole('textbox', { name: vi.session.answerLabel });
    await answer.fill('cash');
    await page.getByRole('button', { name: vi.session.check }).click();
    await expect(page.getByText(vi.session.tryAgainBody)).toBeVisible();
    await answer.fill('cache');
    await answer.press('Enter');
    await expect(page.getByText('cache · bộ nhớ đệm')).toBeVisible();
    await page.keyboard.press('Enter');

    // Round prompt, one more question, then the summary.
    await expect(page.getByText('Bạn đã làm hết 3 từ')).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('textbox', { name: vi.session.answerLabel })).toBeVisible();
    await page.getByRole('textbox', { name: vi.session.answerLabel }).fill('cache');
    await page.keyboard.press('Enter');
    await expect(page.getByText(vi.session.right, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: /Câu tiếp/ }).click();
    await expect(page.getByRole('heading', { name: 'Xong 4 câu.' })).toBeVisible();
    await page.getByRole('list', { name: /Cần ôn lại · 1 từ/ }).getByRole('button', { name: vi.session.summary.review }).click();
    await expect.poll(() => requests(page, 'POST', `/v1/practice/items/${uuid(501)}/review`).length).toBe(1);
    expect(requests(page, 'POST', `/v1/practice/items/${uuid(501)}/answer`)[0].headers['idempotency-key']).toBeTruthy();
  });

  test('reload inside a session resumes the open question (Review Focus 4)', async ({ page }) => {
    await signedInAs(page, 'free', practiceApi({ open: true }));
    await page.goto('/vi/app/practice/session');
    await expect(page.getByText('triển khai', { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText('triển khai', { exact: true })).toBeVisible();
    expect(requests(page, 'POST', '/v1/practice/sessions')).toHaveLength(0);
  });

  test('E35: starting while a session is open asks first; [Làm tiếp] goes back to it', async ({ page }) => {
    await signedInAs(page, 'free', practiceApi({ open: true }));
    await page.goto('/vi/app/practice');
    await expect(page.getByRole('region', { name: vi.current.title })).toBeVisible();
    await page.getByRole('region', { name: vi.hero.title }).getByRole('button', { name: 'Bắt đầu 10 câu' }).click();
    const dialog = page.getByRole('dialog', { name: 'Bạn có phiên đang dở 0/4' });
    await dialog.getByRole('button', { name: vi.resumeDialog.resume }).click();
    await expect(page).toHaveURL(/\/vi\/app\/practice\/session$/);
    expect(requests(page, 'POST', '/v1/practice/sessions')).toHaveLength(0);
  });

  test('K/55: a Free learner with no session left sees when they refill and [Ôn thẻ]', async ({ page }) => {
    await signedInAs(page, 'free', practiceApi({ used: 3 }));
    await page.goto('/vi/app/practice');
    const hero = page.getByRole('region', { name: vi.out.title });
    await expect(hero).toContainText('mở lại lúc 0:00');
    await expect(hero.getByRole('link', { name: vi.out.review })).toBeVisible();
    await expect(page.getByText('đã dùng 3/3')).toBeVisible();
  });

  test('weak words by deck: the deck narrows the list and the start sends group_id', async ({ page }) => {
    await signedInAs(page, 'free', practiceApi());
    await page.goto('/vi/app/practice/weak');
    await expect(page.getByRole('heading', { name: '4 từ hay sai' })).toBeVisible();
    // M4 review: from 768 px each weak word is one table row: word, meaning, "sai x/y", stage, last wrong, left to right on one line.
    const row = page.getByRole('listitem').filter({ hasText: 'sai 3/5' });
    if ((page.viewportSize()?.width ?? 0) >= 768) {
      const boxes = await Promise.all(['deploy', 'triển khai', 'sai 3/5', '1 ngày'].map(async (text) => (await row.getByText(text, { exact: true }).boundingBox())!));
      expect(boxes.map((b) => Math.round(b.y / 8))).toEqual(Array(4).fill(Math.round(boxes[0].y / 8)));
      expect(boxes.map((b) => b.x)).toEqual([...boxes.map((b) => b.x)].sort((a, b) => a - b));
      const last = (await row.getByText(/hôm nay$/).boundingBox())!;
      expect(Math.abs(last.y - boxes[0].y)).toBeLessThan(8);
    }
    await page.getByRole('button', { name: /Nhóm/ }).click();
    await page.getByRole('option', { name: 'Công nghệ · 2' }).click();
    await expect(page.getByRole('heading', { name: '2 từ trong nhóm Công nghệ' })).toBeVisible();
    await page.getByRole('button', { name: 'Luyện 2 từ của nhóm Công nghệ' }).click();
    await expect(page).toHaveURL(/\/vi\/app\/practice\/session$/);
    expect(requests(page, 'POST', '/v1/practice/sessions')[0].body).toMatchObject({ source: 'weak', group_id: DECK });
  });

  test('history and my reports', async ({ page }) => {
    await signedInAs(page, 'free', practiceApi());
    await page.goto('/vi/app/practice/history');
    await expect(page.getByText(copy.vi.App.practice.history.actions.needs_review).first()).toBeVisible();
    await page.getByRole('tab', { name: vi.history.tabs.reports }).click();
    await expect(page.getByText(vi.reports.refunded)).toBeVisible();
    await expect(page.getByText('deploy', { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('tab', { name: vi.history.tabs.reports, selected: true })).toBeVisible();
  });

  test('plans: numbers from the config, Pro not on sale', async ({ page }) => {
    await signedInAs(page, 'free');
    await page.goto('/vi/app/plans');
    await expect(page.getByRole('heading', { level: 1, name: copy.vi.App.plans.title })).toBeVisible();
    await expect(page.getByText(`${APP_CONFIG.plans.pro.practice_sessions_per_day} phiên luyện mỗi ngày`)).toBeVisible();
    await expect(page.getByText(copy.vi.App.plans.notOnSale)).toBeVisible();
  });
});

type Shot = { path: string; ready: (p: Page) => Promise<void>; open?: (p: Page) => Promise<void> };
const PAGES: Shot[] = [
  { path: 'practice', ready: (p) => expect(p.getByRole('heading', { level: 2 }).first()).toBeVisible() },
  {
    path: 'practice',
    ready: (p) => expect(p.getByRole('dialog')).toBeVisible(),
    open: async (p) => {
      await p.getByRole('button', { name: /^(Tùy chỉnh|Customize): / }).first().click();
    },
  },
  { path: 'practice/session', ready: (p) => expect(p.getByText(LONG_OPTION)).toBeVisible() },
  { path: 'practice/weak', ready: (p) => expect(p.getByText(LONG_MEANING).first()).toBeVisible() },
  { path: 'practice/history', ready: (p) => expect(p.getByText(LONG_MEANING).first()).toBeVisible() },
  { path: 'practice/history?tab=reports', ready: (p) => expect(p.getByText('Câu sai ngữ pháp hoặc không tự nhiên')).toBeVisible() },
  { path: 'plans', ready: (p) => expect(p.getByRole('heading', { level: 1 })).toBeVisible() },
];

async function noSideScroll(page: Page, where: string) {
  const wide = await page.evaluate(() =>
    document.documentElement.scrollWidth <= window.innerWidth
      ? []
      : [...document.querySelectorAll('body *')]
          .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1)
          .slice(-5)
          .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 80)} → ${Math.round(el.getBoundingClientRect().right)}`),
  );
  expect(wide, where).toEqual([]);
}

for (const scheme of ['light', 'dark'] as const) {
  for (const locale of ['vi', 'en'] as const) {
    test(`axe and overflow: M4 pages with long content (${locale}, ${scheme})`, async ({ page }) => {
      test.setTimeout(240_000);
      await page.emulateMedia({ colorScheme: scheme });
      for (const { path, ready, open } of PAGES) {
        await signedInAs(page, 'free', practiceApi({ long: true, open: path === 'practice/session' }), { native_language: locale });
        await page.goto(`/${locale}/app/${path}`);
        if (open) {
          await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
          await open(page);
        }
        await ready(page);
        const where = `${locale}/app/${path}${open ? ' (dialog)' : ''}`;
        await noSideScroll(page, where);
        expect(await seriousViolations(page), where).toEqual([]);
      }
    });
  }
}

test('long typed answer stays inside the screen (Review Focus 2)', async ({ page }) => {
  await signedInAs(page, 'free', { ...practiceApi({ open: true }) });
  await page.goto('/vi/app/practice/session');
  await expect(page.getByText('triển khai', { exact: true })).toBeVisible();
  await page.keyboard.press('1');
  await expect(page.getByText(vi.session.right, { exact: true })).toBeVisible();
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: /1 Đúng/ }).click();
  await expect(page.getByText(vi.session.right, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Câu tiếp/ }).click();
  await page.getByRole('textbox', { name: vi.session.answerLabel }).fill('x'.repeat(100));
  await noSideScroll(page, 'typed answer');
});
