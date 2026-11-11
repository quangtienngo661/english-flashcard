import { expect, test, type Page } from '@playwright/test';
import { seriousViolations } from '../support/axe';
import { signedInAs, type MockHandler } from '../support/mock-api';

// M6 journey (design §13, plan Part 6 Review Focus 2): Hôm nay → the calendar button → Lịch → 05/11 → Ngày; Back → Lịch; Back → no
// dialog on the same path; L opens and Esc closes; a link to ?ngay= then Back shows Lịch; axe on both dialogs; no sideways scroll.
const NOW = new Date('2026-11-08T03:00:00Z');
const words = (kind: 'learned' | 'reviewed', lemmas: string[], result: 'known' | 'again' = 'known') =>
  lemmas.map((lemma, i) => ({ kind, item_id: `${kind}-${result}-${i}`, lemma, group_id: null, result, times: 1 }));
const DAY = {
  date: '2026-11-05',
  counts: { learned: 3, reviewed: 3, reviewed_known: 2, reviewed_again: 1, learned_groups: 1, practice_questions: 3 },
  items: [...words('learned', ['inevitable', 'scrutiny', 'deadline']), ...words('reviewed', ['deploy', 'contract']), ...words('reviewed', ['feasible'], 'again')],
  practice_sessions: [
    { session_id: 's1', first_position: 1, last_position: 2, questions: 2, correct: 1 },
    { session_id: 's2', first_position: 1, last_position: 1, questions: 1, correct: 1 },
  ],
  next_page_token: null,
};
const answer = (session: string, i: number, lemma: string, wrong = false) => ({
  item_id: `${session}-${i}`, session_id: session, sense_id: `sense-${i}`, lemma, type: 'type_word', prompt_style: 'meaning', prompt: { kind: 'type_meaning' },
  answer: wrong ? 'deterorate' : lemma, correct: { lemma, text: lemma, choice_index: null, is_true: null }, result: wrong ? 'wrong' : 'correct',
  skipped: false, tries: 1, hint_level: 0, review_action: null, alternative: false, answered_at: `2026-11-05T13:3${i}:00.000Z`, local_date: '2026-11-05', translation: null,
});

function calendarApi(): Record<string, MockHandler> {
  return {
    'GET /v1/me/streak': () => ({ json: { days: 6, studied_today: true } }),
    'GET /v1/me/calendar': (req) => ({
      json: req.query.get('month') === '2026-11'
        ? {
          month: '2026-11',
          days: ['03', '04', '05', '06', '07', '08'].map((d) => ({ date: `2026-11-${d}`, learned: 3, reviewed: 3, practice_sessions: d === '05' ? 2 : 0 })),
          totals: { study_days: 6, learned: 18, reviewed: 18, practice_sessions: 2 },
        }
        : { month: req.query.get('month'), days: [], totals: { study_days: 0, learned: 0, reviewed: 0, practice_sessions: 0 } },
    }),
    'GET /v1/me/calendar/days/2026-11-05': () => ({ json: DAY }),
    'GET /v1/practice/history': () => ({
      json: { items: [answer('s2', 3, 'candidate'), answer('s1', 2, 'deteriorate', true), answer('s1', 1, 'negotiate')], next_page_token: null },
    }),
  };
}

async function noSideScroll(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(NOW);
});

test('Hôm nay → Lịch → Ngày; Back → Lịch; Back → closed on the same path', async ({ page }) => {
  await signedInAs(page, 'free', calendarApi());
  await page.goto('/vi/app');
  const button = page.getByRole('button', { name: 'Lịch học' });
  await expect(button).toBeVisible();
  await expect(button).toContainText('T11');
  await button.click();
  const month = page.getByRole('dialog', { name: 'Tháng 11, 2026' });
  await expect(month).toBeVisible();
  await expect(page).toHaveURL(/\/vi\/app\?lich=2026-11$/);
  await expect(month.getByText('6 ngày liên tiếp')).toBeVisible();
  expect(await seriousViolations(page)).toEqual([]);
  await noSideScroll(page);

  await month.getByRole('button', { name: /^Thứ Năm 5\/11/ }).click();
  const day = page.getByRole('dialog', { name: '05/11' });
  await expect(day).toBeVisible();
  await expect(page).toHaveURL(/\/vi\/app\?ngay=2026-11-05$/);
  await expect(day.getByRole('region', { name: 'Luyện tập · 2 phiên' })).toBeVisible();
  await expect(day.getByText('bạn trả lời deterorate · đáp án: deteriorate')).toBeVisible();
  expect(await seriousViolations(page)).toEqual([]);
  await noSideScroll(page);

  await page.goBack();
  await expect(page.getByRole('dialog', { name: 'Tháng 11, 2026' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page).toHaveURL(/\/vi\/app$/);
});

test('L opens Lịch and Esc closes it', async ({ page }) => {
  await signedInAs(page, 'free', calendarApi());
  await page.goto('/vi/app');
  await expect(page.getByRole('button', { name: 'Lịch học' })).toBeVisible();
  await page.keyboard.press('l');
  await expect(page.getByRole('dialog', { name: 'Tháng 11, 2026' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page).toHaveURL(/\/vi\/app$/);
});

test('a link to ?ngay= opens Ngày; Back shows Lịch of that month; closing stays in the app', async ({ page }) => {
  await signedInAs(page, 'free', calendarApi());
  await page.goto('/vi/app/practice?ngay=2026-11-05');
  await expect(page.getByRole('dialog', { name: '05/11' })).toBeVisible();
  await page.goBack();
  const month = page.getByRole('dialog', { name: 'Tháng 11, 2026' });
  await expect(month).toBeVisible();
  await expect(page).toHaveURL(/\/vi\/app\/practice\?lich=2026-11$/);
  await month.getByRole('button', { name: 'Đóng lịch' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page).toHaveURL(/\/vi\/app\/practice$/);
});

test('final review #1: Ngày from a link, closed at once, stays closed (Next must not write the old URL back)', async ({ page }) => {
  await signedInAs(page, 'free', calendarApi());
  await page.goto('/vi/app/practice?ngay=2026-11-05');
  const day = page.getByRole('dialog', { name: '05/11' });
  await expect(day.getByRole('region', { name: 'Luyện tập · 2 phiên' })).toBeVisible();
  await day.getByRole('button', { name: 'Đóng', exact: true }).click();
  await page.waitForTimeout(500);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page).toHaveURL(/\/vi\/app\/practice$/);
});

// M6.9 (Figma 95:344): phones carry the calendar button in the session bar, desktop keeps the floating one of the (focus) layout.
const DECK = '00000000-0000-4000-8000-000000000801';
const SESSION = '00000000-0000-4000-8000-000000000802';
const typed = {
  item_id: '00000000-0000-4000-8000-000000000812', round: 1, position: 1, type: 'type_word', prompt_style: 'meaning', hint_level: 0, state: 'unanswered',
  tries: 0, reportable: false, ai: false, hints_available: { level1: true, level2: false, level3: false },
  prompt: { kind: 'type_meaning', meaning: 'xấu đi', meaning_language: 'vi', context_label: null },
};
const card = {
  item_id: '00000000-0000-4000-8000-000000000001', sense_id: '00000000-0000-4000-8000-000000000101', level: 1, due_date: '2026-11-08', priority: false, section: 'due',
  content: {
    sense_id: '00000000-0000-4000-8000-000000000101', scope: 'catalog', lemma: 'deploy', pos: 'verb', level: 'B1', context_label: null,
    meaning: { text: 'triển khai', language: 'vi', translation_missing: false }, definition_en: null, examples: [], form_of: null, sentences: [],
  },
};
function sessionApi(): Record<string, MockHandler> {
  const view = { id: SESSION, kind: 'recall', source: 'group', group_id: DECK, group_filter: null, sort: 'queue', types: ['type_word'], prompt_style: 'meaning',
    target_count: 1, status: 'active', round: 1, asked: 1, words: 1, ai_planned: 0, cloze_source: null, correct: 0, wrong: 0 };
  return {
    ...calendarApi(),
    'GET /v1/groups': () => ({ json: { items: [{ id: DECK, name: 'Du lịch', version: 1, total: 1, today: { priority: 0, due: 1, new: 0 }, cells: [], backlog: 0 }] } }),
    [`GET /v1/groups/${DECK}`]: () => ({ json: { id: DECK, name: 'Du lịch', version: 1, item_count: 1, removable_items: 0, created_at: '', updated_at: '' } }),
    [`GET /v1/groups/${DECK}/queue`]: () => ({ json: { cards: [card] } }),
    'GET /v1/words/deploy': () => ({ json: { lemma: 'deploy', inflections: [], sections: [] } }),
    'POST /v1/practice/sessions': () => ({ status: 201, json: { session: view } }),
    [`POST /v1/practice/sessions/${SESSION}/next`]: () => ({ json: { state: 'question', session: view, item: typed } }),
  };
}

test('M6.9: Ôn and Học carry the calendar in the bar on phones, the floating one on desktop; L in the answer box types "l"', async ({ page }, info) => {
  const phone = info.project.name === 'mobile';
  await signedInAs(page, 'free', sessionApi());
  await page.goto(`/vi/app/recall?group=${DECK}`);
  const input = page.getByRole('textbox', { name: 'Câu trả lời' });
  await expect(input).toBeVisible();
  await input.pressSequentially('l');
  await expect(input).toHaveValue('l');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const buttons = page.getByRole('button', { name: 'Lịch học' });
  await expect(buttons).toHaveCount(1);
  const box = await buttons.boundingBox();
  // Phone: 32 × 34 in the top bar; desktop: the 62 × 66 floating button near the bottom.
  if (phone) expect(box).toMatchObject({ width: 32, height: 34 });
  else expect(box!.y).toBeGreaterThan(700);
  await buttons.click();
  await expect(page.getByRole('dialog', { name: 'Tháng 11, 2026' })).toBeVisible();
  await noSideScroll(page);

  await page.goto(`/vi/app/review?group=${DECK}`);
  await expect(page.getByRole('group', { name: 'Thẻ 1 trên 1' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Lịch học' })).toHaveCount(1);
  const learn = await page.getByRole('button', { name: 'Lịch học' }).boundingBox();
  if (phone) expect(learn!.y).toBeLessThan(80);
  else expect(learn!.y).toBeGreaterThan(700);
  await noSideScroll(page);
});
