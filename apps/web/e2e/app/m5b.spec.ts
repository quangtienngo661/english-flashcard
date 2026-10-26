import { expect, test, type Page } from '@playwright/test';
import { copy } from '../copy';
import { seriousViolations } from '../support/axe';
import { LONG } from '../support/fixtures';
import { problem, requests, signedInAs, type MockHandler, type Plan } from '../support/mock-api';

const vi = copy.vi.App;
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const DECK = uuid(201);
const SENSE = uuid(301);
const ENTRY = uuid(311);
const LONG_MEANING = 'sức hút, khả năng tán tỉnh, sự cuốn hút tự nhiên khiến người khác muốn nói chuyện và ở gần mình lâu hơn trong các buổi gặp gỡ đông người';

const summary = { id: DECK, name: 'Du lịch', version: 1, total: 12, today: { priority: 0, due: 0, new: 0 }, cells: [], backlog: 0 };
const suggestion = (long: boolean) => ({
  part_of_speech: 'noun', lemma: 'rizz', meaning: { text: long ? LONG_MEANING : 'sức hút, khả năng tán tỉnh', language: 'vi' },
  definition_en: 'charm or the ability to attract someone', examples: [long ? LONG.sentence.replace('deploy', 'rizz') : "He's got serious rizz."],
});
const mySense = (over: Record<string, unknown> = {}) => ({
  sense_id: SENSE, entry_id: ENTRY, scope: 'private', lemma: 'rizz', pos: 'noun', level: 'B2', context_label: null,
  meaning: { text: 'sức hút, khả năng tán tỉnh', language: 'vi', translation_missing: false }, definition_en: null,
  examples: ["He's got serious rizz."], topics: [], form_of: null, ai_suggested: true, sentence_count: 1, ...over,
});

/** M5b API: lookup finds nothing for "rizz", AI suggests it; the word page serves `pages` in order (the last one repeats). */
function m5bApi({ long = false, ai, pages = [mySense()] }: { long?: boolean; ai?: MockHandler; pages?: Array<ReturnType<typeof mySense>> } = {}): Record<string, MockHandler> {
  let reads = 0;
  return {
    'GET /v1/groups': () => ({ json: { items: [summary] } }),
    'GET /v1/topics': () => ({ json: { items: [{ code: 'daily-life', name: 'Đời sống' }] } }),
    'GET /v1/words': () => ({ json: { items: [], next_page_token: null } }),
    'GET /v1/lookup': () => ({ json: { senses: [], via_inflection: [] } }),
    'POST /v1/lookup/ai': ai ?? (() => ({ json: { suggestion: suggestion(long), catalog_senses: [] } })),
    'POST /v1/quick-add': () => ({ status: 201, json: { item_id: uuid(92), sense_id: SENSE, created_item: true, created_word: true, sentence_id: null } }),
    'GET /v1/words/rizz': () => {
      const sense = pages[Math.min(reads++, pages.length - 1)];
      return { json: { lemma: 'rizz', inflections: [], sections: [{ pos: 'noun', senses: [sense] }] } };
    },
    'GET /v1/items': () => ({ json: { items: [{ sense_id: SENSE, item_id: uuid(92), level: 0, due_date: '2026-10-25', priority: false, group_ids: [DECK] }] } }),
    [`GET /v1/senses/${SENSE}/sentences`]: () => ({ json: { items: [{ id: uuid(51), text: 'That guy has so much rizz.', created_at: '2026-10-20T03:00:00Z' }] } }),
    [`PATCH /v1/my-words/${ENTRY}`]: () => ({ status: 204 }),
    [`DELETE /v1/my-words/${ENTRY}`]: () => ({ status: 204 }),
  };
}

/** Opens Thêm từ on "rizz" from the lookup page (works on phone and desktop), with "Du lịch" as the last-used deck. */
async function openSheet(page: Page, locale: 'vi' | 'en' = 'vi') {
  await page.goto(`/${locale}/app/lookup?q=rizz&mine=true`);
  await page.evaluate((id) => window.localStorage.setItem('wordmet-web.last-group', id), DECK);
  await page.getByRole('button', { name: copy[locale].App.lookup.addThis }).click();
  const sheet = page.getByRole('dialog', { name: copy[locale].App.addWord.title });
  await expect(sheet.getByRole('button', { name: copy[locale].App.addWord.ai.manual })).toBeInViewport();
  return sheet;
}

test.describe('M5b flows (mocked API)', () => {
  test('Pro: Tra bằng AI → AI gợi ý → Sửa rồi lưu → level → Lưu từ sends the suggestion with ai_suggestion', async ({ page }) => {
    await signedInAs(page, 'pro', m5bApi());
    const sheet = await openSheet(page);
    await expect(sheet.getByText('còn 96 lượt tra AI')).toBeVisible();
    await sheet.getByRole('textbox', { name: vi.addWord.sentence }).fill('That guy has so much rizz.');
    await sheet.getByRole('button', { name: vi.addWord.ai.button }).click();
    await expect(sheet.getByRole('heading', { name: 'Kết quả cho “rizz”' })).toBeVisible();
    await expect(sheet.getByRole('region', { name: vi.addWord.result.aiLabel }).getByText('sức hút, khả năng tán tỉnh')).toBeVisible();
    expect(requests(page, 'POST', '/v1/lookup/ai')[0].body).toEqual({ text: 'rizz' });
    await page.getByRole('button', { name: vi.addWord.result.edit }).click();
    const edit = page.getByRole('dialog', { name: vi.addWord.edit.title });
    await expect(edit.getByRole('textbox', { name: vi.addWord.edit.meaning })).toHaveValue('sức hút, khả năng tán tỉnh');
    await edit.getByRole('button', { name: new RegExp(vi.addWord.edit.level) }).click();
    await page.getByRole('option', { name: 'B2' }).click();
    await edit.getByRole('button', { name: vi.addWord.saveManual }).click();
    await expect(page.getByText('Đã lưu từ “rizz” vào nhóm “Du lịch”.')).toBeVisible();
    expect(requests(page, 'POST', '/v1/quick-add')[0].body).toEqual({
      group_id: DECK,
      new_word: { lemma: 'rizz', meaning: 'sức hút, khả năng tán tỉnh', pos: 'noun', level: 'B2', examples: ["He's got serious rizz."], ai_suggestion: true },
      sentence: 'That guy has so much rizz.',
    });
  });

  test('Trial shows its own count; Free sees the Pro label and the D6 line, and sends nothing', async ({ page }) => {
    for (const plan of ['trial', 'free'] as Plan[]) {
      await signedInAs(page, plan, m5bApi());
      const sheet = await openSheet(page);
      if (plan === 'trial') {
        await expect(sheet.getByText(vi.addWord.ai.trial, { exact: true })).toBeVisible();
        await expect(sheet.getByText('còn 96 lượt tra AI')).toBeVisible();
      } else {
        await sheet.getByRole('button', { name: new RegExp(vi.addWord.ai.button) }).click();
        await expect(sheet.getByText(vi.ui.lockedLine)).toBeVisible();
        expect(requests(page, 'POST', '/v1/lookup/ai')).toHaveLength(0);
      }
      await page.unrouteAll({ behavior: 'ignoreErrors' });
    }
  });

  test('E38: "Đang tra…" while the API answers 409 ai-in-progress; the retry carries the same key', async ({ page }) => {
    let n = 0;
    await signedInAs(page, 'pro', m5bApi({
      ai: () => (n++ === 0
        ? { ...problem(409, 'ai-in-progress'), headers: { 'content-type': 'application/problem+json', 'retry-after': '1' } }
        : { json: { suggestion: suggestion(false), catalog_senses: [] } }),
    }));
    const sheet = await openSheet(page);
    await sheet.getByRole('button', { name: vi.addWord.ai.button }).click();
    await expect(sheet.getByRole('heading', { name: 'Kết quả cho “rizz”' })).toBeVisible();
    const sent = requests(page, 'POST', '/v1/lookup/ai');
    expect(sent).toHaveLength(2);
    expect(sent[1].headers['idempotency-key']).toBe(sent[0].headers['idempotency-key']);
  });

  test('E39, E40: AI failure gives the D11 line with [Thử lại]; no credits left gives "Hết lượt tra AI."', async ({ page }) => {
    let n = 0;
    await signedInAs(page, 'pro', m5bApi({
      ai: () => (n++ === 0 ? problem(503, 'ai-lookup-failed', { retryable: true }) : problem(403, 'quota-exhausted', { resets_at: '2030-11-14T17:00:00.000Z' })),
    }));
    const sheet = await openSheet(page);
    await sheet.getByRole('button', { name: vi.addWord.ai.button }).click();
    await expect(sheet.getByText(vi.addWord.ai.failed)).toBeVisible();
    await sheet.getByRole('button', { name: vi.addWord.ai.retry }).click();
    await expect(sheet.getByText('Hết lượt tra AI. Lượt tra AI mới có vào 15/11.')).toBeVisible();
  });

  test('My word page: labels, edit the meaning (label gone after refetch), then delete', async ({ page }) => {
    await signedInAs(page, 'pro', m5bApi({
      pages: [mySense(), mySense({ ai_suggested: false, meaning: { text: 'sức hấp dẫn', language: 'vi', translation_missing: false } })],
    }));
    await page.goto('/vi/app/word?w=rizz');
    await expect(page.getByText(vi.word.mine.aiSource)).toBeVisible();
    await expect(page.getByText(vi.word.mine.label, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: vi.word.mine.edit, exact: true }).click();
    const edit = page.getByRole('dialog', { name: vi.word.mine.editTitle });
    await edit.getByRole('textbox', { name: vi.addWord.edit.meaning }).fill('sức hấp dẫn');
    await edit.getByRole('button', { name: vi.word.mine.saveChanges }).click();
    await expect(edit).toBeHidden();
    await expect(page.getByText(vi.word.mine.aiSource)).toBeHidden();
    expect(requests(page, 'PATCH', `/v1/my-words/${ENTRY}`)[0].body).toEqual({ senses: [{ sense_id: SENSE, meaning: 'sức hấp dẫn' }] });
    await page.getByRole('button', { name: vi.word.mine.delete, exact: true }).click();
    const confirm = page.getByRole('dialog', { name: 'Xóa từ “rizz”?' });
    await confirm.getByRole('button', { name: vi.word.mine.delete }).click();
    await expect(page).toHaveURL(/\/vi\/app\/lookup$/);
    expect(requests(page, 'DELETE', `/v1/my-words/${ENTRY}`)).toHaveLength(1);
  });
});

test('review M4: at 390px the locked [Look up with AI] and [Enter a meaning] neither overlap nor spill their text (Free, English)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await signedInAs(page, 'free', m5bApi(), { native_language: 'en' });
  const sheet = await openSheet(page, 'en');
  const ai = sheet.getByRole('button', { name: new RegExp(copy.en.App.addWord.ai.button) });
  const manual = sheet.getByRole('button', { name: copy.en.App.addWord.ai.manual });
  const a = (await ai.boundingBox())!;
  const b = (await manual.boundingBox())!;
  const overlap = a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
  expect(overlap).toBe(false);
  for (const button of [ai, manual]) expect(await button.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
});

async function noSideScroll(page: Page, where: string) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), where).toBe(false);
}

for (const scheme of ['light', 'dark'] as const) {
  for (const locale of ['vi', 'en'] as const) {
    test(`axe and overflow: AI lookup, its long result, edit before saving and my word page (${locale}, ${scheme})`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.emulateMedia({ colorScheme: scheme });
      await signedInAs(page, 'pro', m5bApi({ long: true }), { native_language: locale });
      const t = copy[locale].App;
      const sheet = await openSheet(page, locale);
      await noSideScroll(page, `${locale} panel`);
      expect(await seriousViolations(page), `${locale} panel`).toEqual([]);
      await sheet.getByRole('button', { name: t.addWord.ai.button }).click();
      await expect(sheet.getByText(LONG_MEANING)).toBeVisible();
      await noSideScroll(page, `${locale} result`);
      expect(await seriousViolations(page), `${locale} result`).toEqual([]);
      await page.getByRole('button', { name: t.addWord.result.edit }).click();
      await expect(page.getByRole('dialog', { name: t.addWord.edit.title })).toBeVisible();
      await noSideScroll(page, `${locale} edit`);
      expect(await seriousViolations(page), `${locale} edit`).toEqual([]);
      await page.goto(`/${locale}/app/word?w=rizz`);
      await expect(page.getByText(t.word.mine.aiSource)).toBeVisible();
      await noSideScroll(page, `${locale} my word`);
      expect(await seriousViolations(page), `${locale} my word`).toEqual([]);
    });
  }
}
