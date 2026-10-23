import { expect, test, type Page } from '@playwright/test';
import { copy } from '../copy';
import { seriousViolations } from '../support/axe';
import { LONG } from '../support/fixtures';
import { problem, requests, signedInAs, type MockHandler } from '../support/mock-api';

const vi = copy.vi.App;
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const DECK = uuid(201);
const NEW = uuid(202);
const LONG_MEANING = 'về phía bên trái, nhìn từ người đang nói hoặc người đang đứng quay mặt về phía trước theo hướng đi của con đường';

const summary = (id: string, name: string) => ({ id, name, version: 1, total: 12, today: { priority: 0, due: 0, new: 0 }, cells: [0, 1, 2, 3, 4, 5].map((level) => ({ level, total: 2, due: 0 })), backlog: 0 });
const sense = (n: number, pos: string, meaning: string, over: Record<string, unknown> = {}) => ({
  sense_id: uuid(n), entry_id: `e-${pos}`, scope: 'catalog', lemma: 'left', pos, level: 'A1', context_label: null,
  meaning: { text: meaning, language: 'vi', translation_missing: false }, definition_en: 'on or belonging to the side opposite your right',
  examples: ['Raise your left hand.'], topics: [{ code: 'direction', name: 'Hướng' }], form_of: null, ai_suggested: false, sentence_count: 0, ...over,
});
const LEFT = (long = false) => ({
  lemma: 'left',
  inflections: [],
  sections: [
    { pos: 'adjective', senses: [sense(1, 'adjective', long ? LONG_MEANING : 'bên trái')] },
    { pos: 'adverb', senses: [sense(2, 'adverb', 'về phía bên trái', { sentence_count: 1 })] },
  ],
});
const goSense = { ...sense(3, 'verb', 'đi', { lemma: 'go' }), sentence_count: undefined };
const row = (lemma: string, meaning = `nghĩa của ${lemma}`) => ({ lemma, pos_list: ['adjective'], level: 'A2', meaning_preview: meaning, has_private: false });

/** The Content + Learning API of M3 for a learner with one deck; the second sentence of a meaning hits the limit. */
function m3Api(long = false): Record<string, MockHandler> {
  let sentences = 0;
  return {
    'GET /v1/groups': () => ({ json: { items: [summary(DECK, long ? LONG.deckName : 'Du lịch')] } }),
    'POST /v1/groups': (req) => ({ status: 201, json: { id: NEW, name: (req.body as { name: string }).name, version: 1, item_count: 0, removable_items: 0 } }),
    'GET /v1/topics': () => ({ json: { items: [{ code: 'food', name: 'Ẩm thực' }, { code: 'direction', name: 'Hướng' }] } }),
    'GET /v1/words': (req) =>
      ['rizz', 'zzzz'].includes(req.query.get('q') ?? '')
        ? { json: { items: [], next_page_token: null } }
        : req.query.get('topic') === 'direction'
        ? { json: { items: [row('right'), row('straight')], next_page_token: null } }
        : { json: { items: [row('left', long ? LONG_MEANING : 'bên trái'), row('delicious', 'ngon'), row('dessert', 'món tráng miệng')], next_page_token: null } },
    'GET /v1/words/left': () => ({ json: LEFT(long) }),
    'GET /v1/words/delicious': () => ({ json: { lemma: 'delicious', inflections: [], sections: [{ pos: 'adjective', senses: [{ ...sense(4, 'adjective', 'ngon'), lemma: 'delicious' }] }] } }),
    'GET /v1/items': () => ({ json: { items: [{ sense_id: uuid(2), item_id: uuid(90), level: 2, due_date: '2026-10-25', priority: false, group_ids: [DECK] }] } }),
    [`GET /v1/senses/${uuid(2)}/sentences`]: () => ({ json: { items: [{ id: uuid(51), text: long ? LONG.sentence.replace('deploy', 'left') : 'Turn left after the bridge.', created_at: '2026-10-20T03:00:00Z' }] } }),
    [`POST /v1/senses/${uuid(2)}/sentences`]: () => {
      sentences += 1;
      return sentences === 1 ? { status: 201, json: { id: uuid(52), created_at: '2026-10-23T03:00:00Z' } } : problem(409, 'sentence-limit-reached');
    },
    [`POST /v1/groups/${DECK}/items`]: () => ({ json: { item_id: uuid(91), level: 0, due_date: '2026-10-23', created: true } }),
    'GET /v1/lookup': (req) =>
      req.query.get('q') === 'went'
        ? { json: { senses: [], via_inflection: [{ kind: 'past', base: { entry_id: uuid(13), lemma: 'go', pos: 'verb' }, senses: [goSense] }] } }
        : { json: { senses: [], via_inflection: [] } },
    'POST /v1/quick-add': () => ({ status: 201, json: { item_id: uuid(92), sense_id: uuid(3), created_item: true, created_word: false, sentence_id: null } }),
    [`POST /v1/groups/${NEW}/items/bulk`]: () => ({ json: { added: 38, already_in_group: 2, skipped_function_words: 3, skipped_group_full: 0, skipped_not_found: 0 } }),
    'GET /v1/topics/suggestions': () => ({ json: { items: [] } }),
  };
}

test.describe('M3 flows (mocked API)', () => {
  test('lookup → word page → add a meaning to a deck', async ({ page }) => {
    await signedInAs(page, 'free', m3Api());
    await page.goto('/vi/app/lookup?q=left');
    await page.getByRole('link', { name: 'left', exact: true }).first().click();
    await expect(page).toHaveURL(/\/vi\/app\/word\?w=left$/);
    const adjective = page.getByRole('article').first();
    await adjective.getByRole('button', { name: vi.word.addToGroup }).click();
    const dialog = page.getByRole('dialog', { name: vi.addWord.pickerTitle });
    // The phone sheet slides up first; wait until it has settled before choosing the deck.
    await expect(dialog.getByRole('radio', { name: /Du lịch/ }).first()).toBeInViewport();
    await dialog.getByText('Du lịch', { exact: true }).first().click();
    await dialog.getByRole('button', { name: 'Lưu vào Du lịch' }).click();
    await expect(page.getByText('Đã thêm “left” vào nhóm “Du lịch”.')).toBeVisible();
    expect(requests(page, 'POST', `/v1/groups/${DECK}/items`)[0].body).toEqual({ sense_id: uuid(1) });
  });

  test('N opens Thêm từ; "went" is saved as go to the last-used deck', async ({ page }) => {
    await signedInAs(page, 'free', m3Api());
    await page.goto('/vi/app');
    await page.evaluate((id) => window.localStorage.setItem('wordmet-web.last-group', id), DECK);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await page.keyboard.press('n');
    const sheet = page.getByRole('dialog', { name: vi.addWord.title });
    await sheet.getByRole('textbox', { name: vi.addWord.word }).fill('went');
    await expect(sheet.getByText('went là quá khứ của go')).toBeVisible();
    await sheet.getByRole('textbox', { name: vi.addWord.sentence }).fill('I went to the bank yesterday.');
    await sheet.getByRole('button', { name: 'Lưu went' }).click();
    await expect(page.getByText('Đã lưu từ “went” vào nhóm “Du lịch”.')).toBeVisible();
    expect(requests(page, 'POST', '/v1/quick-add')[0].body).toEqual({ group_id: DECK, sense_id: uuid(3), sentence: 'I went to the bank yesterday.' });
  });

  test('a word Wordmet does not have: manual meaning', async ({ page }) => {
    await signedInAs(page, 'free', m3Api());
    await page.goto('/vi/app/lookup?q=rizz&mine=true');
    await page.evaluate((id) => window.localStorage.setItem('wordmet-web.last-group', id), DECK);
    await page.getByRole('button', { name: vi.lookup.addThis }).click();
    const sheet = page.getByRole('dialog', { name: vi.addWord.title });
    await sheet.getByRole('button', { name: vi.addWord.manualButton }).click();
    const manual = page.getByRole('dialog', { name: vi.addWord.manualTitle });
    await manual.getByRole('textbox', { name: vi.addWord.meaning }).fill('sức hút');
    await manual.getByRole('button', { name: vi.addWord.saveManual }).click();
    await expect(page.getByText('Đã lưu từ “rizz” vào nhóm “Du lịch”.')).toBeVisible();
    expect(requests(page, 'POST', '/v1/quick-add')[0].body).toEqual({ group_id: DECK, new_word: { lemma: 'rizz', meaning: 'sức hút' } });
  });

  test('saved sentences: one more, then the limit says so with a way to the list', async ({ page }) => {
    await signedInAs(page, 'free', m3Api());
    await page.goto('/vi/app/word?w=left');
    const block = page.getByRole('region', { name: vi.word.learningTitle });
    for (const text of ['I turned left at the station.', 'Turn left again.']) {
      await block.getByRole('button', { name: vi.word.addSentence }).click();
      const sheet = page.getByRole('dialog', { name: vi.addWord.sentenceTitle });
      await sheet.getByRole('textbox', { name: vi.addWord.sentenceField }).fill(text);
      await sheet.getByRole('button', { name: vi.addWord.sentenceSave }).click();
      if (text.startsWith('I')) await expect(page.getByText(vi.addWord.sentenceSaved)).toBeVisible();
    }
    await expect(page.getByText(vi.addWord.sentenceLimit)).toBeVisible();
    await page.getByRole('button', { name: vi.addWord.seeSentences }).click();
    await expect(page.getByRole('dialog', { name: 'Câu đã gặp · left' })).toBeVisible();
  });

  test('bulk add from a lookup filter into a new deck reports every count', async ({ page }) => {
    await signedInAs(page, 'free', m3Api());
    await page.goto('/vi/app/lookup?level=A2&topic=food');
    await page.getByRole('button', { name: vi.addWord.bulkButton }).click();
    const sheet = page.getByRole('dialog', { name: vi.addWord.bulkTitle });
    await sheet.getByRole('button', { name: vi.addWord.bulkSubmit }).click();
    await expect(page.getByText(/Đã thêm 38 từ vào nhóm “Ẩm thực · A2”\. 2 từ đã có trong nhóm, 3 từ chức năng bỏ qua/)).toBeVisible();
    expect(requests(page, 'POST', '/v1/groups')[0].body).toEqual({ name: 'Ẩm thực · A2' });
    expect(requests(page, 'POST', `/v1/groups/${NEW}/items/bulk`)[0].body).toEqual({ level: 'A2', topic: 'food' });
  });

  test('"/" focuses the search strip; submitting goes to Tra từ', async ({ page }) => {
    await signedInAs(page, 'free', m3Api());
    await page.goto('/vi/app/groups');
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await page.keyboard.press('/');
    await page.keyboard.type('left');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/vi\/app\/lookup\?q=left$/);
  });
});

// Every M3 page × vi/en × light/dark with the longest content; the desktop (1440) and mobile (390) projects run each once.
const PAGES: Array<{ path: string; ready: (page: Page) => Promise<void>; open?: (page: Page, locale: 'vi' | 'en') => Promise<void> }> = [
  { path: 'lookup?q=left', ready: (p) => expect(p.getByRole('listitem', { name: 'left' })).toBeVisible() },
  { path: 'lookup?q=zzzz', ready: (p) => expect(p.getByRole('heading', { level: 2 }).first()).toBeVisible() },
  { path: 'word?w=left', ready: (p) => expect(p.getByRole('article').first()).toBeVisible() },
  {
    path: 'word?w=left',
    ready: (p) => expect(p.getByRole('dialog')).toBeVisible(),
    open: async (p, locale) => {
      await p.getByRole('button', { name: locale === 'vi' ? '1 câu đã gặp' : '1 saved sentence' }).first().click();
    },
  },
  {
    path: '',
    ready: (p) => expect(p.getByRole('dialog')).toBeVisible(),
    open: async (p) => {
      await expect(p.getByRole('heading', { level: 1 }).first()).toBeVisible();
      await p.keyboard.press('n');
    },
  },
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
    test(`axe and overflow: M3 pages with long content (${locale}, ${scheme})`, async ({ page }) => {
      test.setTimeout(240_000);
      await page.emulateMedia({ colorScheme: scheme });
      for (const { path, ready, open } of PAGES) {
        await signedInAs(page, 'free', m3Api(true), { native_language: locale });
        await page.goto(`/${locale}/app${path ? `/${path}` : ''}`);
        if (open) {
          await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
          await open(page, locale);
        }
        await ready(page);
        const where = `${locale}/app/${path}${open ? ' (dialog)' : ''}`;
        await noSideScroll(page, where);
        expect(await seriousViolations(page), where).toEqual([]);
      }
    });
  }
}
