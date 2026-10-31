import { expect, test, type Page } from '@playwright/test';
import vi from '../messages/vi.json' with { type: 'json' };
import { FAKE_REF, GPT_REF, cfgCheck, cfgConfig, cfgDraft, cfgExample, cfgView, configReads } from './support/ai-configs';
import { EVAL_LAN } from './support/ai-eval';
import { seriousViolations } from './support/axe';
import { requestCount, requests, signedInAs } from './support/mock-api';
import { expectNoHorizontalScroll } from './support/overflow';

const t = vi.ai.configs;
const CONFIGS = 'GET /v1/admin/ai/configs/generate_cloze';
const nav = (page: Page) => page.getByRole('navigation', { name: vi.shell.mainNav });
const instructions = (page: Page) => page.getByLabel(vi.ai.prompts.instructions, { exact: true });

async function openNavIfCollapsed(page: Page) {
  if ((page.viewportSize()?.width ?? 0) < 1024) await page.getByRole('button', { name: vi.shell.openMenu }).click();
}

test.describe('Cấu hình (nhóm B M2)', () => {
  test.use({ locale: 'vi-VN' });

  test('menu → Cấu hình; a draft with another model is saved, its check warns once, and publishing needs the acknowledgement', async ({ page }) => {
    let live: Record<string, unknown> = cfgConfig(3, { model: GPT_REF });
    let draft: Record<string, unknown> | null = null;
    let previous: Record<string, unknown> | null = null;
    let liveVersion = 5;
    await signedInAs(page, 'admin', configReads({
      [CONFIGS]: () => ({ json: cfgView({ live, draft, previous, live_version: liveVersion }) }),
      'POST /v1/admin/ai/configs/generate_cloze/draft': () => {
        draft = cfgDraft(4, { model: GPT_REF });
        return { status: 201, json: draft };
      },
      'PUT /v1/admin/ai/configs/generate_cloze/draft': (req) => {
        const body = req.body as { instructions: string; examples: unknown[]; model_ref: string | null };
        draft = { ...draft, instructions: body.instructions, examples: body.examples, model: body.model_ref === FAKE_REF.id ? FAKE_REF : GPT_REF, version: Number(draft?.version) + 1 };
        return { json: draft };
      },
      'GET /v1/admin/ai/configs/generate_cloze/publish-check': () => ({
        json: cfgCheck({
          draft: { id: 'C4', number: 4, version: Number(draft?.version ?? 0) },
          warnings: [{ code: 'rate-drop', criterion: 'shape', before: { passed: 20, counted: 20 }, after: { passed: 18, counted: 20 } }],
        }),
      }),
      'POST /v1/admin/ai/configs/generate_cloze/publish': () => {
        previous = live;
        live = { ...draft, status: 'published', published_by_user: { id: 'admin-1', email: 'admin@wordmet.com', system: false }, published_at: '2026-10-15T03:00:00.000Z' };
        draft = null;
        liveVersion += 1;
        return { json: cfgView({ live, draft, previous, live_version: liveVersion }) };
      },
    }));
    await page.goto('/ai/models');
    await openNavIfCollapsed(page);
    await nav(page).getByRole('link', { name: vi.nav.aiConfigs }).click();
    await expect(page.getByRole('heading', { level: 1, name: vi.nav.aiConfigs })).toBeVisible();
    await expect(page.getByRole('heading', { name: t.live.title.replace('{number}', '3') })).toBeVisible();

    await page.getByRole('button', { name: t.draft.create, exact: true }).click();
    await expect(page.getByRole('heading', { name: t.draft.title.replace('{number}', '4').replace('{version}', '0') })).toBeVisible();
    await page.getByRole('button', { name: /Model$/ }).click();
    await page.getByRole('option', { name: 'Fake · fake:ok' }).click();
    await page.getByRole('button', { name: t.draft.save }).click();
    await expect(page.getByText(t.draft.saved.replace('{version}', '1'))).toBeVisible();
    const saved = requests(page, 'PUT', '/v1/admin/ai/configs/generate_cloze/draft')[0]!.body;
    expect(saved).toEqual({
      expected_version: 0, instructions: 'Write one short sentence.', examples: [cfgExample], model_ref: 'm1', effort: null, thinking: null, max_output_tokens: null, note: null,
    });

    // The check is read again for the saved version and lists its one warning.
    await expect(page.getByText(t.publish.rateDrop.replace('{criterion}', t.publish.criteria.shape).replace('{before}', '100').replace('{after}', '90'))).toBeVisible();
    await expect(page.getByRole('button', { name: t.publish.submit })).toBeDisabled();
    expect(await seriousViolations(page)).toEqual([]);

    // A React Aria checkbox hides its input: the visible label is what is clicked.
    await page.getByText(t.publish.acknowledge).click();
    await expect(page.getByRole('checkbox', { name: t.publish.acknowledge })).toBeChecked();
    await page.getByRole('button', { name: t.publish.submit }).click();
    await expect(page.getByText(t.publish.done.replace('{number}', '4'))).toBeVisible();
    expect(requests(page, 'POST', '/v1/admin/ai/configs/generate_cloze/publish').map((r) => r.body)).toEqual([
      { expected_version: 1, candidate_run_id: 'RC', baseline_run_id: 'RB', acknowledge_warnings: true },
    ]);
    await expect(page.getByRole('heading', { name: t.live.title.replace('{number}', '4') })).toBeVisible();
    await expect(page.getByRole('button', { name: t.rollback.button.replace('{number}', '3') })).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('an unsaved draft and a menu link ask "Rời trang?"; [Ở lại] keeps the text, [Rời trang] goes', async ({ page }) => {
    await signedInAs(page, 'admin', configReads({
      [CONFIGS]: () => ({ json: cfgView({ draft: cfgDraft(4) }) }),
      'GET /v1/admin/ai/configs/generate_cloze/publish-check': () => ({ json: cfgCheck() }),
      'GET /v1/admin/ai/status': () => ({ json: { operations: [], today: { calls: 0, cap: null, failed_calls: 0, failed_cost_usd: '0', cost_usd: '0', cost_vnd: 0, admin_cost_usd: '0', admin_usd_cap: null }, ai_enabled: true, providers: { openai: true, anthropic: false, fake: true } } }),
    }));
    await page.goto('/ai/configs');
    await instructions(page).fill('Unsaved change.');
    await openNavIfCollapsed(page);
    await nav(page).getByRole('link', { name: vi.nav.aiStatus }).click();
    const dialog = page.getByRole('alertdialog').or(page.getByRole('dialog'));
    await expect(dialog.getByText(vi.leave.title)).toBeVisible();
    await dialog.getByRole('button', { name: vi.leave.stay }).click();
    await expect(page).toHaveURL(/\/ai\/configs$/);
    await expect(instructions(page)).toHaveValue('Unsaved change.');
    await openNavIfCollapsed(page);
    await nav(page).getByRole('link', { name: vi.nav.aiStatus }).click();
    await dialog.getByRole('button', { name: vi.leave.leave }).click();
    await expect(page).toHaveURL(/\/ai\/status$/);
  });

  test('the old addresses /ai/operations and /ai/prompts open the configs page with the same operation', async ({ page }) => {
    await signedInAs(page, 'admin', configReads({
      'GET /v1/admin/ai/configs/lookup_word': () => ({ json: cfgView({ operation: 'lookup_word', live: cfgConfig(2, { operation: 'lookup_word' }) }) }),
      'GET /v1/admin/ai/configs/lookup_word/history': () => ({ json: { items: [], next_page_token: null } }),
      'GET /v1/admin/ai/prompts/lookup_word/revisions': () => ({ json: { items: [], next_page_token: null } }),
      'GET /v1/admin/ai/eval/sets': () => ({ json: { items: [] } }),
    }));
    await page.goto('/ai/prompts?op=lookup_word');
    await expect(page).toHaveURL(/\/ai\/configs\?op=lookup_word$/);
    await expect(page.getByRole('heading', { name: t.live.title.replace('{number}', '2') })).toBeVisible();
    await page.goto('/ai/operations?op=lookup_word');
    await expect(page).toHaveURL(/\/ai\/configs\?op=lookup_word$/);
    await expect(page.getByRole('heading', { name: t.live.title.replace('{number}', '2') })).toBeVisible();
  });

  test('an editor sees no menu entry and the page does not call the API', async ({ page }) => {
    await signedInAs(page, 'editor', { 'GET /v1/admin/content/uploads': () => ({ json: { items: [], next_page_token: null } }) });
    await page.goto('/ai/configs');
    await expect(page.getByText(vi.noAccess.title)).toBeVisible();
    await openNavIfCollapsed(page);
    await expect(nav(page).getByRole('link', { name: vi.nav.aiConfigs })).toHaveCount(0);
    expect(requestCount(page, 'GET', '/v1/admin/ai/configs/generate_cloze')).toBe(0);
  });

  test('at 375 px a long model id, 8.000-character instructions, a long note, long inputs and several warnings fit the window', async ({ page }) => {
    test.skip(test.info().project.name !== 'desktop', 'sets its own viewport');
    await page.setViewportSize({ width: 375, height: 812 });
    const long = 'm'.repeat(100);
    const longModel = { id: 'm3', provider: 'anthropic', model_id: long };
    const email = `${'a'.repeat(120)}@example.com`;
    await signedInAs(page, 'admin', configReads({
      'GET /v1/admin/ai/models': () => ({ json: { items: [{ ...GPT_REF, shutdown_at: null, lifecycle: 'active', effort_choices: [], thinking_off_available: false, structured_outputs: true, max_output_tokens: null, price: null, note: null, info_checked_at: '2026-10-15T02:12:00.000Z', used_by: [], estimate: null, hidden: false }, { ...longModel, shutdown_at: null, lifecycle: 'active', effort_choices: ['low', 'high'], thinking_off_available: true, structured_outputs: true, max_output_tokens: 200000, price: null, note: null, info_checked_at: '2026-10-15T02:12:00.000Z', used_by: [], estimate: null, hidden: false }] } }),
      [CONFIGS]: () => ({
        json: cfgView({
          live: cfgConfig(3, { model: longModel, published_by_user: { id: 'u1', email, system: false } }),
          previous: cfgConfig(2, { model: GPT_REF }),
          draft: cfgDraft(4, {
            model: longModel, instructions: 'm'.repeat(8000), note: 'n'.repeat(500), created_by_user: { ...EVAL_LAN, email },
            examples: [{ input: { ...cfgExample.input, word: 'w'.repeat(200) }, output: { sentence: 's'.repeat(400) } }],
          }),
        }),
      }),
      'GET /v1/admin/ai/configs/generate_cloze/publish-check': () => ({
        json: cfgCheck({
          warnings: [
            { code: 'rate-drop', criterion: 'expected', before: { passed: 6, counted: 7 }, after: { passed: 1, counted: 3 } },
            { code: 'dev-regressed', example_ids: ['e1', 'e2', 'e3'] },
            { code: 'held-out-failures-up', before: 12, after: 345 },
          ],
        }),
      }),
      'GET /v1/admin/ai/configs/generate_cloze/history': () => ({
        json: {
          items: [{ id: 'ev1', kind: 'publish', at: '2026-10-15T02:12:00.000Z', actor_user: { id: 'u1', email, system: false }, config: { id: 'C3', number: 3, model_id: long }, from_config: { id: 'C2', number: 2, model_id: 'gpt-x' }, candidate_run_id: 'RC', baseline_run_id: 'RB', warnings: [] }],
          next_page_token: null,
        },
      }),
    }));
    await page.goto('/ai/configs');
    await expect(instructions(page)).toHaveValue('m'.repeat(8000));
    await expect(page.getByText('8.000/8.000')).toBeVisible();
    await expect(page.getByText(t.publish.heldOutUp.replace('{before}', '12').replace('{after}', '345'))).toBeVisible();
    await expect(page.getByRole('heading', { name: t.history.title })).toBeVisible();
    await expectNoHorizontalScroll(page);
  });
});
