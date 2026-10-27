import { expect, test, type Page } from '@playwright/test';
import { copy, fill } from '../copy';
import { seriousViolations } from '../support/axe';
import { requests, signedInAs, type MockHandler } from '../support/mock-api';

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const DECK = uuid(201);
const NAME = 'Công nghệ';
const TOPIC = { code: 'business', name: 'Kinh doanh' };
const vi = copy.vi.App;
const sense = (n: number, meaning: string) => ({
  sense_id: uuid(n), entry_id: uuid(11), scope: 'catalog', lemma: 'deploy', pos: 'verb', level: 'B1', context_label: null,
  meaning: { text: meaning, language: 'vi', translation_missing: false }, definition_en: null,
  examples: ['We deploy it.'], topics: [TOPIC], form_of: null, ai_suggested: false,
});
const FIRST = sense(1, 'triển khai');
const SECOND = sense(2, 'bố trí');
const card = {
  item_id: uuid(80), sense_id: FIRST.sense_id, level: 0, due_date: '2030-11-15', priority: false, section: 'new',
  content: { ...FIRST, sentences: [] },
};

function groupApi(alreadyIn = false): Record<string, MockHandler> {
  return {
    'GET /v1/groups': () => ({ json: { items: [{ id: DECK, name: NAME, version: 1, total: 1, today: { priority: 0, due: 0, new: 1 }, cells: [], backlog: 0, available: { due: 0, new: 1 } }] } }),
    [`GET /v1/groups/${DECK}`]: () => ({ json: { id: DECK, name: NAME, version: 1, item_count: 1, removable_items: 1, created_at: '2026-10-02T03:00:00Z', updated_at: '2026-10-02T03:00:00Z' } }),
    [`GET /v1/groups/${DECK}/queue`]: () => ({ json: { cards: alreadyIn ? [card] : [] } }),
    [`GET /v1/groups/${DECK}/items`]: () => ({ json: { items: alreadyIn ? [{ ...card, group_count: 1, sense_changed: false, added_at: '2026-10-02T03:00:00Z' }] : [], next_page_token: null } }),
    'GET /v1/topics': () => ({ json: { items: [TOPIC] } }),
    'GET /v1/lookup': (req) => ({ json: { senses: req.query.get('q') === 'deploy' ? [FIRST, SECOND] : [], via_inflection: [] } }),
    'POST /v1/quick-add': () => ({ status: 201, json: { item_id: uuid(90), sense_id: FIRST.sense_id, created_item: true, created_word: false, sentence_id: null } }),
    'GET /v1/senses': (req) => {
      expect(req.query.get('topic')).toBe(TOPIC.code);
      expect(req.query.get('level')).toBe('B1');
      return { json: { items: [FIRST, SECOND], next_page_token: null } };
    },
    'GET /v1/items': () => ({ json: { items: [] } }),
    [`POST /v1/groups/${DECK}/items/bulk`]: () => ({ json: { added: 2, already_in_group: 0, skipped_function_words: 0, skipped_group_full: 0, skipped_not_found: 0 } }),
  };
}

async function openSheet(page: Page, locale: 'vi' | 'en' = 'vi') {
  await page.goto(`/${locale}/app/group?id=${DECK}`);
  await expect(page.getByRole('heading', { name: NAME, exact: true })).toBeVisible();
  await page.getByRole('main').getByRole('button', { name: copy[locale].App.group.addWord, exact: true }).click();
  const sheet = page.getByRole('dialog', { name: copy[locale].App.addWord.title });
  await expect(sheet.getByText(fill(copy[locale].App.addWord.lockedDeck, { name: NAME }))).toBeInViewport();
  return sheet;
}

test.describe('A14: adding words from a deck (mocked API)', () => {
  test('A14-1: Add word → deploy → save posts the deck group_id and shows a toast', async ({ page }) => {
    await signedInAs(page, 'free', groupApi());
    const sheet = await openSheet(page);
    await sheet.getByRole('textbox', { name: vi.addWord.word, exact: true }).fill('deploy');
    await sheet.getByRole('button', { name: fill(vi.addWord.save, { word: 'deploy' }), exact: true }).click();
    await expect(page.getByText(fill(vi.addWord.saved, { word: 'deploy', group: NAME }))).toBeVisible();
    expect(requests(page, 'POST', '/v1/quick-add')[0].body).toEqual({ group_id: DECK, sense_id: FIRST.sense_id });
    await expect(sheet).toBeHidden();
  });

  test('A14-2: the saved sense is labelled and only the other sense is pickable', async ({ page }) => {
    await signedInAs(page, 'free', groupApi(true));
    const sheet = await openSheet(page);
    await sheet.getByRole('textbox', { name: vi.addWord.word, exact: true }).fill('deploy');
    const senses = sheet.getByRole('radiogroup', { name: vi.addWord.pickSense });
    await expect(senses.getByText(vi.addWord.alreadyIn)).toBeVisible();
    await expect(senses.getByRole('radio')).toHaveCount(1);
    await expect(senses.getByRole('radio', { name: /bố trí/ })).toBeChecked();
    await senses.getByText(FIRST.meaning.text, { exact: true }).click();
    await expect(senses.getByRole('radio', { name: /bố trí/ })).toBeChecked();
    await sheet.getByRole('button', { name: fill(vi.addWord.save, { word: 'deploy' }), exact: true }).click();
    await expect(sheet).toBeHidden();
    expect(requests(page, 'POST', '/v1/quick-add')[0].body).toEqual({ group_id: DECK, sense_id: SECOND.sense_id });
  });

  test('A14-7: topic navigation preselects the deck and Add all posts to it without creating a deck', async ({ page }) => {
    await signedInAs(page, 'free', groupApi());
    const sheet = await openSheet(page);
    await sheet.getByRole('button', { name: vi.addWord.byTopic }).click();
    await expect(sheet.getByRole('link', { name: vi.addWord.seeWords })).toHaveCount(0);
    await sheet.getByRole('button', { name: new RegExp(vi.lookup.topicLabel) }).click();
    await page.getByRole('option', { name: TOPIC.name, exact: true }).click();
    // A press while the list is still closing lands on its underlay, not on the control below.
    await expect(page.getByRole('listbox')).toBeHidden();
    await sheet.getByRole('button', { name: new RegExp(vi.addWord.edit.level) }).click();
    await page.getByRole('option', { name: 'B1', exact: true }).click();
    await expect(page.getByRole('listbox')).toBeHidden();
    await sheet.getByRole('link', { name: vi.addWord.seeWords }).click();
    await expect(page).toHaveURL(`/vi/app/topic?code=${TOPIC.code}&level=B1&group=${DECK}`);
    await expect(sheet).toBeHidden();
    await expect(page.getByRole('button', { name: new RegExp(vi.topic.addTo) })).toHaveText(NAME);
    await page.getByRole('button', { name: fill(vi.topic.addAll, { count: 2 }), exact: true }).click();
    await expect(page.getByText(fill(vi.topic.result, { added: 2, name: NAME }))).toBeVisible();
    expect(requests(page, 'POST', `/v1/groups/${DECK}/items/bulk`)[0].body).toEqual({ sense_ids: [FIRST.sense_id, SECOND.sense_id] });
    expect(requests(page, 'POST', '/v1/groups')).toHaveLength(0);
  });
});

// The desktop (1440) and mobile (390) projects each run this locale/theme matrix.
for (const scheme of ['light', 'dark'] as const) {
  for (const locale of ['vi', 'en'] as const) {
    test(`axe and overflow: deck and expanded locked sheet (${locale}, ${scheme})`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.emulateMedia({ colorScheme: scheme });
      await signedInAs(page, 'free', groupApi(true), { native_language: locale });
      const t = copy[locale].App;
      await page.goto(`/${locale}/app/group?id=${DECK}`);
      await expect(page.getByRole('heading', { name: NAME, exact: true })).toBeVisible();
      await expect(page.getByRole('listitem', { name: 'deploy', exact: true })).toBeVisible();
      const add = page.getByRole('main').getByRole('button', { name: t.group.addWord, exact: true });
      await expect(add).toBeVisible();
      expect(await add.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      expect((await add.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(await seriousViolations(page), 'deck').toEqual([]);
      await add.click();
      const sheet = page.getByRole('dialog', { name: t.addWord.title });
      await sheet.getByRole('button', { name: t.addWord.byTopic }).click();
      await expect(sheet.getByRole('button', { name: new RegExp(t.lookup.topicLabel) })).toBeVisible();
      await expect(sheet.getByRole('button', { name: new RegExp(t.addWord.edit.level) })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(await seriousViolations(page), 'expanded locked sheet').toEqual([]);
    });
  }
}
