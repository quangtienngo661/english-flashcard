import { expect, test, type Page } from '@playwright/test';
import { copy } from '../copy';
import { seriousViolations } from '../support/axe';
import { entitlementsBody } from '../support/fixtures';
import { requests, signedInAs, type MockHandler, type Plan } from '../support/mock-api';

const vi = copy.vi.App.practice;
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const SESSION = uuid(410);
const PRIVATE = uuid(620);
/** M/78d: the longest AI sentence (300 characters). */
const LONG_SENTENCE = `We use Docker to ___ ${'the newest internationalization-ready microservices '.repeat(6)}`.slice(0, 299) + '.';
const base = { round: 1, prompt_style: 'sentence', hint_level: 0, state: 'unanswered', tries: 0, reportable: true, private_word: false };
const cloze = (sentence = 'We use Docker to ___ the app to the production server.') => ({
  ...base, item_id: uuid(511), position: 1, type: 'cloze', hints_available: { level1: true, level2: true, level3: true },
  prompt: { kind: 'cloze', sentence },
});
const sentenceMcq = (privateWord = false) => ({
  ...base, item_id: uuid(512), position: 2, type: 'mcq_sentence', private_word: privateWord, hints_available: { level1: true, level2: false, level3: false },
  prompt: { kind: 'mcq_sentence', sentence: 'We ___ the app to the server yesterday.', options: ['deployed', 'delivered', 'defended', 'delayed'] },
});
const result = (lemma = 'deploy') => ({
  result: 'correct', skipped: false, tries: 1, hint_level: 1, correct: { lemma, text: lemma, choice_index: 0, is_true: null },
  meaning: 'triển khai (phần mềm)', definition_en: 'to move software to a server so that people can use it', show_known: false,
  highlight_needs_review: false, translation: 'Chúng tôi dùng Docker để triển khai ứng dụng lên máy chủ chính thức.',
});

type Next = Record<string, unknown>;
/** A Pro learner's AI session: `nexts` are the answers of `next` in order (the last one repeats). */
function aiApi({ nexts, plan = 'pro' }: { nexts: Next[]; plan?: Plan }): Record<string, MockHandler> {
  let asked = 0;
  let open = false;
  let n = 0;
  const view = () => ({
    id: SESSION, source: 'all', group_id: null, group_filter: null, sort: 'least_practiced', types: ['mcq_definition', 'cloze', 'mcq_sentence'],
    prompt_style: 'mixed', target_count: 10, status: 'active', round: 1, asked, words: 10, ai_planned: 7, cloze_source: 'ai',
  });
  return {
    'GET /v1/me/entitlements': () => ({ json: entitlementsBody(plan) }),
    'GET /v1/practice/sessions/current': () => (open
      ? { json: { session: view(), item: null, preparing: true } }
      : { status: 404, json: { type: 'http://localhost:3000/problems/not-found', status: 404, title: 'n' } }),
    'POST /v1/practice/sessions': () => {
      open = true;
      return { status: 201, json: { session: view() } };
    },
    [`POST /v1/practice/sessions/${SESSION}/next`]: () => {
      const answer = nexts[Math.min(n++, nexts.length - 1)];
      if (answer.state === 'question') asked += 1;
      return { json: { session: view(), ...answer } };
    },
    [`POST /v1/practice/sessions/${SESSION}/prepare`]: () => ({ json: { prepared: 1, already_ready: 0 } }),
    [`POST /v1/practice/items/${uuid(511)}/hint`]: () => ({ json: { level: 1, hint: { kind: 'first_letter', text: 'd…' } } }),
    [`POST /v1/practice/items/${uuid(511)}/answer`]: () => ({ json: result() }),
    [`POST /v1/practice/items/${uuid(512)}/answer`]: () => ({ json: result('rizz') }),
    [`POST /v1/practice/items/${uuid(512)}/report`]: () => ({ status: 201, json: { id: uuid(711) } }),
    'GET /v1/practice/report-reasons': () => ({ json: { items: [
      { code: 'meaning_wrong', label: 'Nghĩa sai', detail_hint: null, note_required: false },
      { code: 'ai_sentence_unnatural', label: 'Câu sai ngữ pháp hoặc không tự nhiên', detail_hint: null, note_required: false },
      { code: 'other', label: 'Khác', detail_hint: null, note_required: true },
    ] } }),
    [`GET /v1/senses/${PRIVATE}`]: () => ({ json: { lemma: 'rizz' } }),
    'GET /v1/practice/weak-words/groups': () => ({ json: { total: 0, items: [] } }),
    'GET /v1/practice/weak-words': () => ({ json: { items: [], next_page_token: null } }),
    'GET /v1/practice/history': () => ({ json: { items: [], next_page_token: null } }),
  };
}

async function openCustomize(page: Page) {
  await page.goto('/vi/app/practice');
  await page.getByRole('button', { name: /^Tùy chỉnh: Luyện tất cả/ }).click();
  return page.getByRole('dialog', { name: /Tùy chỉnh phiên/ });
}

test.describe('M5a flows (mocked API)', () => {
  test('Pro: AI switch on → start → "Đang tạo câu…" → cloze → hint → answer → translation', async ({ page }) => {
    await signedInAs(page, 'pro', aiApi({ nexts: [
      { state: 'preparing', retry_after_seconds: 1 },
      { state: 'question', item: cloze() },
    ] }));
    const dialog = await openCustomize(page);
    await dialog.getByText(new RegExp(`^${vi.customize.aiToggle}`)).first().click();
    await expect(dialog.getByText(/Phiên này dùng tối đa \d+ lượt câu AI · còn 287/)).toBeVisible();
    await dialog.getByRole('button', { name: /^Bắt đầu/ }).click();
    await expect(page).toHaveURL(/practice\/session$/);
    expect(requests(page, 'POST', '/v1/practice/sessions')[0].body).toMatchObject({ types: ['mcq_definition', 'true_false_definition', 'type_word', 'cloze', 'meaning_in_sentence', 'mcq_sentence'] });
    await expect(page.getByText('Đang tạo câu…')).toBeVisible();
    await expect(page.getByText('We use Docker to ___ the app to the production server.')).toBeVisible();
    await expect(page.getByText('Câu AI')).toBeVisible();
    await page.getByRole('button', { name: /^Gợi ý/ }).click();
    await expect(page.getByText('d…')).toBeVisible();
    await page.getByRole('textbox').fill('deploy');
    await page.getByRole('button', { name: /Kiểm tra/ }).click();
    await expect(page.getByText('AI dịch')).toBeVisible();
    await expect(page.getByText('Chúng tôi dùng Docker để triển khai ứng dụng lên máy chủ chính thức.')).toBeVisible();
    expect(requests(page, 'POST', `/v1/practice/sessions/${SESSION}/prepare`).length).toBeGreaterThan(0);
  });

  test('AI failure: "Hệ thống đang gặp lỗi." → [Thử lại] sends retry_ai → the question', async ({ page }) => {
    await signedInAs(page, 'pro', aiApi({ nexts: [{ state: 'ai_unavailable', reason: 'ai-failed' }, { state: 'question', item: cloze() }] }));
    await page.addInitScript(() => localStorage.setItem('wordmet-web.ai-types', 'on'));
    const dialog = await openCustomize(page);
    await dialog.getByRole('button', { name: /^Bắt đầu/ }).click();
    await expect(page.getByText(vi.session.ai.errorTitle)).toBeVisible();
    await page.getByRole('button', { name: vi.session.ai.retry }).click();
    await expect(page.getByText('We use Docker to ___ the app to the production server.')).toBeVisible();
    const nexts = requests(page, 'POST', `/v1/practice/sessions/${SESSION}/next`);
    expect(nexts.at(-1)?.body).toEqual({ retry_ai: true });
  });

  test('mixed session: the ai-fallback band once over the question', async ({ page }) => {
    await signedInAs(page, 'pro', aiApi({ nexts: [{ state: 'question', item: cloze(), notice: 'ai-fallback', ai_reason: 'ai-failed' }] }));
    await page.addInitScript(() => localStorage.setItem('wordmet-web.ai-types', 'on'));
    const dialog = await openCustomize(page);
    await dialog.getByRole('button', { name: /^Bắt đầu/ }).click();
    await expect(page.getByText(vi.session.ai.fallback)).toBeVisible();
    await page.getByRole('button', { name: vi.session.ai.dismiss }).click();
    await expect(page.getByText(vi.session.ai.fallback)).toHaveCount(0);
  });

  test('Free: the switch is locked and says why', async ({ page }) => {
    await signedInAs(page, 'free', aiApi({ nexts: [], plan: 'free' }));
    const dialog = await openCustomize(page);
    // aria-disabled (D6: pressable, says why) counts as disabled for Playwright's click; a learner presses it, here with the keyboard.
    await dialog.getByRole('switch', { name: /Kiểu câu có AI/ }).focus();
    await page.keyboard.press('Enter');
    await expect(dialog.getByText(copy.vi.App.ui.lockedLine)).toBeVisible();
    await expect(dialog.getByRole('checkbox', { name: 'Điền từ vào câu' })).toHaveCount(0);
  });

  test('K/71: not enough AI credits, then [Bỏ kiểu câu có AI]', async ({ page }) => {
    await signedInAs(page, 'pro', {
      ...aiApi({ nexts: [] }),
      'POST /v1/practice/sessions': () => ({ status: 403, json: { type: 'http://localhost:3000/problems/ai-quota-insufficient', status: 403, title: 'x', remaining: 2, needed: 5, resets_at: '2026-11-14T17:00:00.000Z' } }),
    });
    await page.addInitScript(() => localStorage.setItem('wordmet-web.ai-types', 'on'));
    const dialog = await openCustomize(page);
    await dialog.getByRole('button', { name: /^Bắt đầu/ }).click();
    await expect(dialog.getByText(vi.customize.quotaTitle)).toBeVisible();
    await expect(dialog.getByText(/Phiên này cần 5 lượt câu AI, bạn còn 2\./)).toBeVisible();
    await dialog.getByRole('button', { name: vi.customize.dropAi }).click();
    await expect(dialog.getByRole('switch', { name: /Kiểu câu có AI/ })).not.toBeChecked();
  });

  test('K/81: an AI question about the learner\'s own word is reported without a consent box', async ({ page }) => {
    await signedInAs(page, 'pro', aiApi({ nexts: [{ state: 'question', item: sentenceMcq(true) }] }));
    await page.addInitScript(() => localStorage.setItem('wordmet-web.ai-types', 'on'));
    const dialog = await openCustomize(page);
    await dialog.getByRole('button', { name: /^Bắt đầu/ }).click();
    await page.getByRole('button', { name: /^1 deployed/ }).click();
    await page.getByRole('button', { name: vi.session.report.button }).click();
    const report = page.getByRole('dialog', { name: vi.session.report.title });
    await expect(report.getByText('Đội Wordmet sẽ thấy từ “rizz” bạn tự thêm để kiểm tra.')).toBeVisible();
    await expect(report.getByRole('checkbox')).toHaveCount(0);
    await report.getByText('Nghĩa sai', { exact: true }).click();
    await report.getByRole('button', { name: vi.session.report.send }).click();
    await expect(report).toBeHidden();
    expect(requests(page, 'POST', `/v1/practice/items/${uuid(512)}/report`)[0].body).toEqual({ reason: 'meaning_wrong' });
  });
});

async function noSideScroll(page: Page, where: string) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), where).toBe(false);
}

for (const scheme of ['light', 'dark'] as const) {
  for (const locale of ['vi', 'en'] as const) {
    test(`axe and overflow: AI setup, a 300-character AI sentence, its result and the AI states (${locale}, ${scheme})`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.emulateMedia({ colorScheme: scheme });
      await page.addInitScript(() => localStorage.setItem('wordmet-web.ai-types', 'on'));
      await signedInAs(page, 'pro', aiApi({ nexts: [
        { state: 'question', item: cloze(LONG_SENTENCE), notice: 'word-not-recognized', sense_id: PRIVATE },
        { state: 'ai_unavailable', reason: 'quota-exhausted', resets_at: '2026-11-14T17:00:00.000Z' },
      ] }), { native_language: locale });
      await page.goto(`/${locale}/app/practice`);
      await page.getByRole('button', { name: /^(Tùy chỉnh|Customize): / }).last().click();
      const dialog = page.getByRole('dialog');
      await expect(dialog.getByRole('switch')).toBeChecked();
      await noSideScroll(page, `${locale} setup`);
      expect(await seriousViolations(page), `${locale} setup`).toEqual([]);
      await dialog.getByRole('button', { name: /^(Bắt đầu|Start)/ }).click();
      await expect(page.getByText(LONG_SENTENCE)).toBeVisible();
      await expect(page.getByRole('link', { name: copy[locale].App.practice.session.ai.seeWord })).toBeVisible();
      await noSideScroll(page, `${locale} long sentence`);
      expect(await seriousViolations(page), `${locale} long sentence`).toEqual([]);
      await page.getByRole('textbox').fill('deploy');
      await page.getByRole('textbox').press('Enter');
      await expect(page.getByRole('button', { name: /(Câu tiếp|Next)/ })).toBeVisible();
      await noSideScroll(page, `${locale} result`);
      expect(await seriousViolations(page), `${locale} result`).toEqual([]);
      await page.getByRole('button', { name: /(Câu tiếp|Next)/ }).click();
      await expect(page.getByText(copy[locale].App.practice.session.ai.quotaTitle)).toBeVisible();
      await noSideScroll(page, `${locale} ai stopped`);
      expect(await seriousViolations(page), `${locale} ai stopped`).toEqual([]);
    });
  }
}
