import { expect, test, type Page } from '@playwright/test';
import { copy } from '../copy';
import { seriousViolations } from '../support/axe';
import { LONG } from '../support/fixtures';
import { requests, signedInAs, type MockHandler } from '../support/mock-api';

const vi = copy.vi.App;
const G = '22222222-2222-4222-8222-222222222222';
const G2 = '44444444-4444-4444-8444-444444444444';
const NEW = '33333333-3333-4333-8333-333333333333';
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

type Summary = { id: string; name: string; version: number; total: number; today: { priority: number; due: number; new: number }; cells: unknown[]; backlog: number };
const cells = (due: number[]) => [3, 4, 2, 1, 0, 0].map((total, level) => ({ level, total, due: due[level] }));
const summary = (id: string, name: string, over: Partial<Summary> = {}): Summary => ({
  id, name, version: 1, total: 10, today: { priority: 1, due: 2, new: 1 }, cells: cells([1, 1, 1, 0, 0, 0]), backlog: 3, ...over,
});
const done = (id: string, name: string) => summary(id, name, { today: { priority: 0, due: 0, new: 0 }, cells: cells([0, 0, 0, 0, 0, 0]), backlog: 0 });
const detail = (g: Summary) => ({ id: g.id, name: g.name, version: g.version, item_count: g.total, removable_items: 0, created_at: '2026-10-01T03:00:00Z', updated_at: '2026-10-01T03:00:00Z' });

const content = (n: number, lemma: string, sentences: string[] = []) => ({
  sense_id: uuid(100 + n), scope: 'catalog', lemma, pos: 'verb', level: 'B1', context_label: null,
  meaning: { text: n === 1 ? 'triển khai' : `nghĩa của ${lemma}`, language: 'vi', translation_missing: false }, definition_en: null,
  examples: [`They ${lemma} updates every week.`], form_of: null, sentences,
});
const queueCard = (n: number, lemma: string, section = 'due', sentences: string[] = []) => ({
  item_id: uuid(n), sense_id: uuid(100 + n), level: 1, due_date: '2026-10-20', priority: section === 'priority', section, content: content(n, lemma, sentences),
});
const itemRow = (n: number) => ({ item_id: uuid(n), sense_id: uuid(100 + n), level: 1, due_date: '2026-10-20', priority: n === 1, group_count: 1, sense_changed: false, added_at: '2026-10-01T03:00:00Z' });
const backlogRow = (n: number, lemma: string) => ({
  item_id: uuid(n), sense_id: uuid(100 + n), level: 2, due_date: '2026-08-01', days_overdue: 80 + n,
  content: { lemma, pos: 'verb', meaning: { text: `nghĩa của ${lemma}`, language: 'vi', translation_missing: false }, examples: [] },
});

/** The Learning API of a learner with `initial` decks; decks change as the page writes. */
function decksApi(initial: Summary[], cards = [queueCard(1, 'deploy', 'priority', [LONG.sentence]), queueCard(2, 'cache')]) {
  const state = { groups: [...initial] };
  const byId = (id: string) => state.groups.find((g) => g.id === id);
  const handlers: Record<string, MockHandler> = {
    'GET /v1/groups': () => ({ json: { items: state.groups } }),
    'POST /v1/groups': (req) => {
      const g = done(NEW, (req.body as { name: string }).name);
      g.total = 0;
      state.groups.push(g);
      return { status: 201, json: detail(g) };
    },
    'GET /v1/words/deploy': () => ({ json: { lemma: 'deploy', inflections: [{ kind: 'third_person', form: 'deploys', has_page: false }, { kind: 'past', form: 'deployed', has_page: false }], sections: [] } }),
    'GET /v1/words/cache': () => ({ json: { lemma: 'cache', inflections: [], sections: [] } }),
    'POST /v1/reviews': () => ({ json: { item_id: uuid(1), level: 2, due_date: '2026-10-23', priority: false } }),
    'POST /v1/items/relearn': (req) => ({ json: { relearned: (req.body as { item_ids: string[] }).item_ids.length } }),
  };
  for (const id of [G, G2, NEW]) {
    handlers[`GET /v1/groups/${id}`] = () => (byId(id) ? { json: detail(byId(id)!) } : { status: 404, json: { type: 'about:blank', status: 404, title: 'Not found' } });
    handlers[`PATCH /v1/groups/${id}`] = (req) => {
      const g = byId(id)!;
      Object.assign(g, { name: (req.body as { name: string }).name, version: g.version + 1 });
      return { json: detail(g) };
    };
    handlers[`DELETE /v1/groups/${id}`] = () => {
      state.groups = state.groups.filter((g) => g.id !== id);
      return { status: 204 };
    };
    handlers[`GET /v1/groups/${id}/queue`] = () => ({ json: { cards: id === G ? cards : [] } });
    handlers[`GET /v1/groups/${id}/items`] = () => ({ json: { items: id === G ? cards.map((_, i) => itemRow(i + 1)) : [], next_page_token: null } });
    handlers[`GET /v1/groups/${id}/backlog`] = () => ({ json: { items: id === G ? [backlogRow(7, 'leave'), backlogRow(8, 'forget'), backlogRow(9, 'remember')] : [], next_page_token: null } });
  }
  return { state, handlers };
}

const sense = (n: number, lemma: string) => ({
  sense_id: uuid(200 + n), entry_id: `e${n}`, lemma, pos: 'noun', level: 'B1', is_function_word: false, context_label: null,
  meaning: { text: `nghĩa của ${lemma}`, language: 'vi', translation_missing: false }, definition_en: null, examples: [],
  topics: [{ code: 'business', name: 'Kinh doanh' }],
});
const SENSES = ['budget', 'invoice', 'profit', 'meeting', 'contract'].map((lemma, i) => sense(i + 1, lemma));
const topicApi: Record<string, MockHandler> = {
  'GET /v1/senses': () => ({ json: { items: SENSES, next_page_token: null } }),
  // "budget" is already in a deck.
  'GET /v1/items': () => ({ json: { items: [{ sense_id: SENSES[0].sense_id, item_id: uuid(300), level: 1, due_date: '2026-10-20', priority: false, group_ids: [G] }] } }),
  [`POST /v1/groups/${NEW}/items/bulk`]: (req) => ({
    json: { added: ((req.body as { sense_ids?: string[] }).sense_ids ?? []).length, already_in_group: 0, skipped_function_words: 0, skipped_group_full: 0, skipped_not_found: 0 },
  }),
};

test.describe('M2 flows (mocked API)', () => {
  test('Today without decks invites the first deck; with decks it leads to the review', async ({ page }) => {
    await signedInAs(page);
    await page.goto('/vi/app');
    await expect(page.getByRole('heading', { name: vi.today.emptyTitle })).toBeVisible();
    await expect(page.getByRole('button', { name: vi.today.createFirst })).toBeVisible();

    const { handlers } = decksApi([summary(G, 'Công nghệ'), done(G2, 'Du lịch')]);
    await signedInAs(page, 'free', handlers);
    await page.goto('/vi/app');
    await expect(page.getByRole('link', { name: 'Ôn 4 thẻ' }).first()).toHaveAttribute('href', `/vi/app/review?group=${G}`);
  });

  test('create → rename → delete a deck', async ({ page }) => {
    const { handlers } = decksApi([summary(G, 'Công nghệ')]);
    await signedInAs(page, 'free', handlers);
    await page.goto('/vi/app/groups');
    await page.getByRole('button', { name: vi.groups.create, exact: true }).first().click();
    const create = page.getByRole('dialog', { name: vi.groups.createTitle });
    await create.getByRole('textbox', { name: vi.groups.nameLabel }).fill('Du lịch Nhật');
    await create.getByRole('button', { name: vi.groups.createSubmit }).click();
    await expect(page.getByText('Đã tạo nhóm “Du lịch Nhật”.')).toBeVisible();
    expect(requests(page, 'POST', '/v1/groups')).toHaveLength(1);

    await page.goto('/vi/app/groups');
    await page.getByRole('button', { name: 'Tùy chọn nhóm Du lịch Nhật' }).click();
    await page.getByRole('menuitem', { name: vi.groups.rename }).click();
    const rename = page.getByRole('dialog', { name: vi.groups.renameTitle });
    await rename.getByRole('textbox', { name: vi.groups.nameLabel }).fill('Nhật Bản');
    await rename.getByRole('button', { name: vi.groups.renameSubmit }).click();
    await expect(page.getByText(vi.groups.renamed)).toBeVisible();
    expect(requests(page, 'PATCH', `/v1/groups/${NEW}`)[0].body).toEqual({ name: 'Nhật Bản', version: 1 });

    await page.getByRole('button', { name: 'Tùy chọn nhóm Nhật Bản' }).click();
    await page.getByRole('menuitem', { name: vi.groups.delete }).click();
    const remove = page.getByRole('dialog', { name: 'Xóa nhóm “Nhật Bản”?' });
    await remove.getByRole('button', { name: vi.groups.deleteSubmitNone }).click();
    await expect(page.getByText('Đã xóa nhóm “Nhật Bản”.')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Nhật Bản', level: 3 })).toHaveCount(0);
  });

  test('deck filter shows decks with cards waiting or done today', async ({ page }) => {
    const { handlers } = decksApi([summary(G, 'Công nghệ'), done(G2, 'Du lịch')]);
    await signedInAs(page, 'free', handlers);
    await page.goto('/vi/app/groups');
    const decks = page.getByRole('list', { name: vi.groups.title });
    await expect(decks.getByRole('heading', { level: 3 })).toHaveText(['Công nghệ', 'Du lịch']);
    await page.getByRole('button', { name: /Tất cả · 2 nhóm/ }).click();
    await page.getByRole('option', { name: vi.groups.filterDone }).click();
    await expect(decks.getByRole('heading', { level: 3 })).toHaveText(['Du lịch']);
  });

  test('long-overdue words: one button relearns them all', async ({ page }) => {
    const { handlers } = decksApi([summary(G, 'Công nghệ')]);
    await signedInAs(page, 'free', handlers);
    await page.goto(`/vi/app/group/backlog?id=${G}`);
    await page.getByRole('button', { name: 'Học lại cả 3 từ' }).click();
    await expect(page.getByText('Đã đưa 3 từ về ngăn Mới.')).toBeVisible();
    expect(requests(page, 'POST', '/v1/items/relearn')[0].body).toEqual({ item_ids: [uuid(7), uuid(8), uuid(9)] });
  });

  test('topic picker: add the ticked words to a new deck', async ({ page }) => {
    const { handlers } = decksApi([summary(G, 'Công nghệ')]);
    await signedInAs(page, 'free', { ...handlers, ...topicApi });
    await page.goto('/vi/app/topic?code=business&level=B1');
    await expect(page.getByRole('listitem', { name: 'budget' }).getByText('Đang học · Công nghệ')).toBeVisible();
    await page.getByRole('checkbox', { name: 'Chọn invoice' }).check({ force: true });
    await page.getByRole('checkbox', { name: 'Chọn profit' }).check({ force: true });
    await page.getByRole('button', { name: 'Thêm 2 từ đã chọn' }).click();
    await expect(page.getByText('Đã thêm 2 từ vào nhóm “Kinh doanh · B1”.')).toBeVisible();
    expect(requests(page, 'POST', '/v1/groups')[0].body).toEqual({ name: 'Kinh doanh · B1' });
    expect(requests(page, 'POST', `/v1/groups/${NEW}/items/bulk`)[0].body).toEqual({ sense_ids: [SENSES[1].sense_id, SENSES[2].sense_id] });
  });

  test('topic picker: add every unlearned word', async ({ page }) => {
    const { handlers } = decksApi([summary(G, 'Công nghệ')]);
    await signedInAs(page, 'free', { ...handlers, ...topicApi });
    await page.goto('/vi/app/topic?code=business&level=B1');
    await page.getByRole('button', { name: 'Thêm cả 4 từ' }).click();
    await expect(page.getByText('Đã thêm 4 từ vào nhóm “Kinh doanh · B1”.')).toBeVisible();
    expect(requests(page, 'POST', `/v1/groups/${NEW}/items/bulk`)[0].body).toEqual({ sense_ids: SENSES.slice(1).map((s) => s.sense_id) });
  });

  test('review session with the keyboard: Space, 2, Space, 1, then Enter goes home', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'mobile', 'keyboard flow is the web layout');
    const { handlers } = decksApi([summary(G, 'Công nghệ')]);
    await signedInAs(page, 'free', handlers);
    await page.goto(`/vi/app/review?group=${G}`);
    await expect(page.getByRole('group', { name: 'Thẻ 1 trên 2' })).toBeVisible();
    await expect(page.getByText('còn 2 thẻ')).toBeVisible();
    await page.keyboard.press('Space');
    await expect(page.getByText('triển khai')).toBeVisible();
    await expect(page.getByText('deploys')).toBeVisible();
    await page.keyboard.press('2');
    await expect(page.getByRole('group', { name: 'Thẻ 2 trên 2' })).toBeVisible();
    await page.keyboard.press('Space');
    await page.keyboard.press('1');
    await expect(page.getByRole('heading', { name: 'Xong 2 thẻ.' })).toBeVisible();
    const answers = requests(page, 'POST', '/v1/reviews').map((r) => r.body as { answer: string; review_id: string });
    expect(answers.map((a) => a.answer)).toEqual(['known', 'review']);
    expect(answers[0].review_id).not.toBe(answers[1].review_id);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/vi\/app$/);
  });
});

// Every M2 page × vi/en × light/dark with the longest content; the desktop (1440) and mobile (390) projects run each once.
const PAGES: Array<{ path: string; ready: (page: Page) => Promise<void>; flip?: boolean }> = [
  { path: '', ready: (p) => expect(p.getByRole('heading', { level: 1 }).first()).toBeVisible() },
  { path: 'groups', ready: (p) => expect(p.getByRole('heading', { level: 1 }).first()).toBeVisible() },
  { path: `group?id=${G}`, ready: (p) => expect(p.getByRole('heading', { level: 1 }).first()).toBeVisible() },
  { path: `group/backlog?id=${G}`, ready: (p) => expect(p.getByRole('row').nth(1)).toBeVisible() },
  { path: 'topic?code=business&level=B1', ready: (p) => expect(p.getByRole('listitem', { name: 'contract' })).toBeVisible() },
  { path: `review?group=${G}`, ready: (p) => expect(p.getByRole('group').first()).toBeVisible() },
  { path: `review?group=${G}`, ready: (p) => expect(p.getByText(LONG.sentence.slice(-20))).toBeVisible(), flip: true },
];

/** Review Focus 2; on failure it names the widest elements that stick out. */
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
    test(`axe and overflow: M2 pages with long content (${locale}, ${scheme})`, async ({ page }) => {
      test.setTimeout(240_000);
      await page.emulateMedia({ colorScheme: scheme });
      for (const { path, ready, flip } of PAGES) {
        const { handlers } = decksApi([summary(G, LONG.deckName), done(G2, 'Du lịch')]);
        await signedInAs(page, 'free', { ...handlers, ...topicApi }, { native_language: locale });
        await page.goto(`/${locale}/app${path ? `/${path}` : ''}`);
        if (flip) {
          await expect(page.getByRole('group').first()).toBeVisible();
          await page.getByRole('button', { name: locale === 'vi' ? vi.review.flip : copy.en.App.review.flip }).click();
        }
        await ready(page);
        await noSideScroll(page, `${locale}/app/${path}${flip ? ' (back)' : ''}`);
        expect(await seriousViolations(page), `${locale}/app/${path}${flip ? ' (back)' : ''}`).toEqual([]);
      }
    });
  }
}
