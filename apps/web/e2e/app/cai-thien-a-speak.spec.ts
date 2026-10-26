import { expect, test, type Page } from '@playwright/test';
import { copy } from '../copy';
import { seriousViolations } from '../support/axe';
import { signedInAs, type MockHandler } from '../support/mock-api';

// Đợt cải thiện A, C1 (design §7): UK · US by a word, one button by a sentence, with the browser's own voices.
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const G = uuid(201);
const SESSION = uuid(410);
const ITEM = uuid(501);

const sense = (n: number, pos: string, meaning: string, over: Record<string, unknown> = {}) => ({
  sense_id: uuid(n), entry_id: `e-${pos}`, scope: 'catalog', lemma: 'deploy', pos, level: 'B2', context_label: null,
  meaning: { text: meaning, language: 'vi', translation_missing: false }, definition_en: 'to put software into use',
  examples: ['The team will deploy the new version on Friday evening.'], topics: [], form_of: null, ai_suggested: false, sentence_count: 0, ...over,
});
const card = {
  item_id: uuid(1), sense_id: uuid(101), level: 1, due_date: '2026-10-20', priority: false, section: 'due',
  content: {
    sense_id: uuid(101), scope: 'catalog', lemma: 'deploy', pos: 'verb', level: 'B2', context_label: null,
    meaning: { text: 'triển khai', language: 'vi', translation_missing: false }, definition_en: null,
    examples: ['The team will deploy the new version on Friday evening.'], form_of: null, sentences: ['We deploy the app every Friday.'],
  },
};
const view = { id: SESSION, source: 'group', group_id: G, group_filter: 'all', sort: 'queue', types: ['mcq_definition'], prompt_style: 'mixed',
  target_count: 10, status: 'active', round: 1, asked: 1, words: 10, ai_planned: 0, cloze_source: null };
const mcq = {
  item_id: ITEM, round: 1, position: 1, type: 'mcq_definition', prompt_style: 'meaning', hint_level: 0, state: 'unanswered', tries: 0, reportable: true,
  hints_available: { level1: false, level2: false, level3: false },
  prompt: { kind: 'mcq', meaning: 'triển khai', meaning_language: 'vi', context_label: null, options: ['deploy', 'delay', 'deliver', 'defend'] },
};

const api: Record<string, MockHandler> = {
  'GET /v1/groups': () => ({ json: { items: [{ id: G, name: 'IT', version: 1, total: 1, today: { priority: 0, due: 1, new: 0 }, cells: [], backlog: 0 }] } }),
  'GET /v1/words/deploy': () => ({ json: { lemma: 'deploy', inflections: [], sections: [{ pos: 'verb', senses: [sense(101, 'verb', 'triển khai', { sentence_count: 1 })] }] } }),
  'GET /v1/items': () => ({ json: { items: [{ sense_id: uuid(101), item_id: uuid(1), level: 1, due_date: '2026-10-25', priority: false, group_ids: [G] }] } }),
  [`GET /v1/senses/${uuid(101)}/sentences`]: () => ({ json: { items: [{ id: uuid(51), text: 'We deploy the app every Friday.', created_at: '2026-10-20T03:00:00Z' }] } }),
  'GET /v1/words': () => ({ json: { items: [], next_page_token: null } }),
  [`GET /v1/groups/${G}`]: () => ({ json: { id: G, name: 'IT', version: 1, item_count: 1, removable_items: 0, created_at: '', updated_at: '' } }),
  [`GET /v1/groups/${G}/queue`]: () => ({ json: { cards: [card] } }),
  'GET /v1/practice/sessions/current': () => ({ json: { session: view, item: mcq, preparing: false } }),
  [`POST /v1/practice/items/${ITEM}/answer`]: () => ({ json: {
    result: 'correct', skipped: false, tries: 1, hint_level: 0, correct: { lemma: 'deploy', text: 'deploy', choice_index: 0, is_true: null },
    meaning: 'triển khai', definition_en: null, show_known: true, highlight_needs_review: false, translation: null,
  } }),
};

/** A local en-GB and a local en-US voice; every utterance is recorded on window.__spoken. */
async function fakeSpeech(page: Page) {
  await page.addInitScript(() => {
    const voices = [
      { lang: 'en-GB', localService: true, name: 'UK', voiceURI: 'uk', default: false },
      { lang: 'en-US', localService: true, name: 'US', voiceURI: 'us', default: false },
    ];
    const spoken: Array<{ text: string; lang: string }> = [];
    Object.assign(window, { __spoken: spoken });
    class Utterance { voice: { lang: string } | null = null; lang = ''; constructor(public text: string) {} }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: Utterance, configurable: true });
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        getVoices: () => voices, cancel: () => {}, addEventListener: () => {}, removeEventListener: () => {},
        speak: (u: Utterance) => spoken.push({ text: u.text, lang: u.voice?.lang ?? '' }),
      },
    });
  });
}
const spoken = (page: Page) => page.evaluate(() => (window as unknown as { __spoken: Array<{ text: string; lang: string }> }).__spoken);

async function setup(page: Page, locale: 'vi' | 'en' = 'vi') {
  await fakeSpeech(page);
  await signedInAs(page, 'free', api, { native_language: locale });
}

test.describe('Pronunciation buttons (C1, mocked API)', () => {
  test('word page: UK and US read the word; the example and the saved sentence have a button', async ({ page }) => {
    await setup(page);
    await page.goto('/vi/app/word?w=deploy');
    await expect(page.getByRole('heading', { level: 1, name: 'deploy' })).toBeVisible();
    await page.getByRole('button', { name: 'UK, nghe giọng Anh' }).click();
    await page.getByRole('button', { name: 'US, nghe giọng Mỹ' }).click();
    await expect(page.getByText('We deploy the app every Friday.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Nghe câu' })).toHaveCount(2);
    expect(await spoken(page)).toEqual([{ text: 'deploy', lang: 'en-GB' }, { text: 'deploy', lang: 'en-US' }]);
  });

  test('review card: the front button reads without flipping; the back reads the word and its sentences', async ({ page }) => {
    await setup(page);
    await page.goto(`/vi/app/review?group=${G}`);
    const front = page.getByRole('group', { name: /Thẻ 1/ });
    await front.getByRole('button', { name: 'US, nghe giọng Mỹ' }).click();
    expect(await spoken(page)).toEqual([{ text: 'deploy', lang: 'en-US' }]);
    await expect(page.getByText('triển khai')).toHaveCount(0);
    // Focus is on the speak button now, where Space reads again (A1-6); flip with the button instead.
    await page.keyboard.press('Space');
    expect(await spoken(page)).toHaveLength(2);
    await expect(page.getByText('triển khai')).toHaveCount(0);
    await page.getByRole('button', { name: copy.vi.App.review.flip }).click();
    await expect(page.getByText('triển khai')).toBeVisible();
    await page.getByRole('group', { name: /Thẻ 1/ }).getByRole('button', { name: 'UK, nghe giọng Anh' }).click();
    expect((await spoken(page)).at(-1)).toEqual({ text: 'deploy', lang: 'en-GB' });
    await expect(page.getByRole('button', { name: 'Nghe câu' })).toHaveCount(2);
  });

  test('practice: no button on the question; after grading UK reads the word', async ({ page }) => {
    await setup(page);
    await page.goto('/vi/app/practice/session');
    await expect(page.getByText('triển khai')).toBeVisible();
    await expect(page.getByRole('button', { name: /nghe giọng/i })).toHaveCount(0);
    await page.keyboard.press('1');
    await page.getByRole('button', { name: 'UK, nghe giọng Anh' }).click();
    expect(await spoken(page)).toEqual([{ text: 'deploy', lang: 'en-GB' }]);
  });
});

async function noSideScroll(page: Page, where: string) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), where).toBe(false);
}

for (const scheme of ['light', 'dark'] as const) {
  for (const locale of ['vi', 'en'] as const) {
    for (const width of [1440, 390]) {
      test(`axe and overflow: word page, card front and back, practice result (${locale}, ${scheme}, ${width}px)`, async ({ page }) => {
        test.setTimeout(120_000);
        await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
        await page.emulateMedia({ colorScheme: scheme });
        await setup(page, locale);
        const t = copy[locale].App.speak;
        const where = `${locale} ${scheme} ${width}px`;

        await page.goto(`/${locale}/app/word?w=deploy`);
        await expect(page.getByRole('button', { name: t.uk })).toBeVisible();
        await noSideScroll(page, `${where} word`);
        expect(await seriousViolations(page), `${where} word`).toEqual([]);

        await page.goto(`/${locale}/app/review?group=${G}`);
        await expect(page.getByRole('group').first().getByRole('button', { name: t.uk })).toBeVisible();
        await noSideScroll(page, `${where} card front`);
        expect(await seriousViolations(page), `${where} card front`).toEqual([]);
        await page.keyboard.press('Space');
        await expect(page.getByRole('button', { name: t.sentence }).first()).toBeVisible();
        await noSideScroll(page, `${where} card back`);
        expect(await seriousViolations(page), `${where} card back`).toEqual([]);

        await page.goto(`/${locale}/app/practice/session`);
        await expect(page.getByText('triển khai')).toBeVisible();
        await page.keyboard.press('1');
        await expect(page.getByRole('button', { name: t.uk })).toBeVisible();
        await noSideScroll(page, `${where} practice result`);
        expect(await seriousViolations(page), `${where} practice result`).toEqual([]);
      });
    }
  }
}
