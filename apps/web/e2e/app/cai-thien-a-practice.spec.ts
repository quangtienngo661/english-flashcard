import { expect, test, type Page } from '@playwright/test';
import { copy } from '../copy';
import { seriousViolations } from '../support/axe';
import { problem, requests, signedInAs, type MockHandler } from '../support/mock-api';

const vi = copy.vi.App.practice;
const SESSION = '00000000-0000-4000-8000-000000000410';
const ITEM = '00000000-0000-4000-8000-000000000511';
const SENTENCE = 'We use Docker to ___ the app to the production server.';
// The M5a cloze fixture, using a saved sentence: no report or AI translation.
const cloze = {
  item_id: ITEM, round: 1, position: 1, type: 'cloze', prompt_style: 'sentence',
  hint_level: 0, state: 'unanswered', tries: 0, reportable: false, private_word: false,
  hints_available: { level1: true, level2: true, level3: true },
  prompt: { kind: 'cloze', sentence: SENTENCE },
};

function ownApi(): Record<string, MockHandler> {
  let open = false;
  let asked = 0;
  const view = () => ({
    id: SESSION, source: 'all', group_id: null, group_filter: null, sort: 'least_practiced',
    types: ['mcq_definition', 'true_false_definition', 'type_word', 'cloze'], prompt_style: 'mixed',
    target_count: 10, status: 'active', round: 1, asked, words: 10, ai_planned: 0, cloze_source: 'own',
  });
  return {
    'GET /v1/practice/sessions/current': () => open
      ? { json: { session: view(), item: null, preparing: false } }
      : problem(404, 'not-found'),
    'POST /v1/practice/sessions': () => {
      open = true;
      return { status: 201, json: { session: view() } };
    },
    [`POST /v1/practice/sessions/${SESSION}/next`]: () => {
      asked += 1;
      return { json: { session: view(), state: 'question', item: cloze } };
    },
    [`POST /v1/practice/items/${ITEM}/answer`]: () => ({ json: {
      result: 'correct', skipped: false, tries: 1, hint_level: 0,
      correct: { lemma: 'deploy', text: 'deploy', choice_index: null, is_true: null },
      meaning: 'triển khai (phần mềm)', definition_en: 'to move software to a server so that people can use it',
      show_known: false, highlight_needs_review: false, translation: null,
    } }),
    'GET /v1/practice/weak-words/groups': () => ({ json: { total: 0, items: [] } }),
    'GET /v1/practice/weak-words': () => ({ json: { items: [], next_page_token: null } }),
    'GET /v1/practice/history': () => ({ json: { items: [], next_page_token: null } }),
  };
}

async function openCustomize(page: Page, locale: 'vi' | 'en' = 'vi') {
  await page.goto(`/${locale}/app/practice`);
  await page.getByRole('button', { name: /^(Tùy chỉnh|Customize): / }).last().click();
  return page.getByRole('dialog', { name: copy[locale].App.practice.customize.title });
}

test.describe('Saved-sentence practice (A3, mocked API)', () => {
  test('Free: own switch enabled → start sends own cloze → saved-sentence question without AI content', async ({ page }) => {
    await signedInAs(page, 'free', ownApi());
    const dialog = await openCustomize(page);
    const own = dialog.getByRole('switch', { name: vi.customize.ownToggle, exact: true });
    await expect(own).toBeEnabled();
    await expect(own).not.toBeChecked();
    await expect(dialog.getByText(vi.customize.ownLine)).toBeVisible();
    // The switch input is visually hidden (React Aria); click its label as m5a.spec.ts does.
    await dialog.getByText(vi.customize.ownToggle, { exact: true }).click();
    await expect(own).toBeChecked();
    await dialog.getByRole('button', { name: /^Bắt đầu/ }).click();
    await expect(page).toHaveURL(/practice\/session$/);
    expect(requests(page, 'POST', '/v1/practice/sessions')[0].body).toMatchObject({
      types: ['mcq_definition', 'true_false_definition', 'type_word', 'cloze'], cloze_source: 'own',
    });
    await expect(page.getByText(SENTENCE)).toBeVisible();
    await expect(page.getByText(vi.session.kind.cloze, { exact: true })).toBeVisible();
    await expect(page.getByText(vi.session.aiChip, { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: vi.session.report.button })).toHaveCount(0);
    expect(requests(page, 'POST', `/v1/practice/sessions/${SESSION}/prepare`)).toHaveLength(0);
    await page.getByRole('textbox').fill('deploy');
    await page.getByRole('textbox').press('Enter');
    await expect(page.getByRole('button', { name: /(Câu tiếp|Next)/ })).toBeVisible();
    await expect(page.getByText(vi.session.translation, { exact: true })).toHaveCount(0);
    await expect(page.getByText(vi.session.translationAi, { exact: true })).toHaveCount(0);
  });

  test('Pro: AI on and own on disables AI cloze and explains the replacement', async ({ page }) => {
    await signedInAs(page, 'pro', ownApi());
    const dialog = await openCustomize(page);
    await dialog.getByText(new RegExp(`^${vi.customize.aiToggle}`)).first().click();
    await dialog.getByText(vi.customize.ownToggle, { exact: true }).click();
    await expect(dialog.getByRole('switch', { name: vi.customize.ownToggle, exact: true })).toBeChecked();
    const aiCloze = dialog.getByRole('checkbox', { name: vi.types.cloze, exact: true });
    await expect(aiCloze).not.toBeChecked();
    await expect(aiCloze).toBeDisabled();
    await expect(dialog.getByText(vi.customize.ownReplacesAi)).toBeVisible();
    for (const name of [vi.types.meaning_in_sentence, vi.types.mcq_sentence]) {
      await expect(dialog.getByRole('checkbox', { name, exact: true })).toBeEnabled();
      await expect(dialog.getByRole('checkbox', { name, exact: true })).toBeChecked();
    }
  });
});

async function noSideScroll(page: Page, where: string) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), where).toBe(false);
}

for (const scheme of ['light', 'dark'] as const) {
  for (const locale of ['vi', 'en'] as const) {
    for (const width of [1440, 390]) {
      test(`axe and overflow: both switches on (${locale}, ${scheme}, ${width}px)`, async ({ page }) => {
        test.setTimeout(120_000);
        await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
        await page.emulateMedia({ colorScheme: scheme });
        await page.addInitScript(() => {
          localStorage.setItem('wordmet-web.ai-types', 'on');
          localStorage.setItem('wordmet-web.own-sentences', 'on');
        });
        await signedInAs(page, 'pro', ownApi(), { native_language: locale });
        const dialog = await openCustomize(page, locale);
        const t = copy[locale].App.practice;
        await expect(dialog.getByRole('switch', { name: new RegExp(t.customize.aiToggle) })).toBeChecked();
        await expect(dialog.getByRole('switch', { name: t.customize.ownToggle, exact: true })).toBeChecked();
        await expect(dialog.getByRole('checkbox', { name: t.types.cloze, exact: true })).toBeDisabled();
        await expect(dialog.getByText(t.customize.ownReplacesAi)).toBeVisible();
        await noSideScroll(page, `${locale} ${scheme} ${width}px setup`);
        expect(await seriousViolations(page), `${locale} ${scheme} ${width}px setup`).toEqual([]);
      });
    }
  }
}
