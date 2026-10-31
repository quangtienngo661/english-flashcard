import { expect, test, type Page } from '@playwright/test';
import vi from '../messages/vi.json' with { type: 'json' };
import { EVAL_AT as at, EVAL_LAN as LAN, EVAL_RUN_ID, clozeInput, devExample, evalSet, heldOutExample, noRunItems, noSets, runItem, runStats } from './support/ai-eval';
import { cfgCheck, cfgDraft, cfgView, configReads } from './support/ai-configs';
import { seriousViolations } from './support/axe';
import { problem, requests, signedInAs, type MockHandler } from './support/mock-api';
import { settingsMocks } from './support/settings';

const t = vi.ai.eval;
const FIELDS = ['word', 'part_of_speech', 'level', 'meaning_vi', 'context_label'];
const run = (over: Record<string, unknown> = {}) => ({
  id: EVAL_RUN_ID, operation: 'generate_cloze', provider: 'openai', model: 'gpt-x', effort: null, thinking: null, max_output_tokens: null, prompt_revision: 3,
  config_id: null, config_version: null, config_number: null,
  status: 'finished', total: 2, done: 2, valid_count: 2, set_id: null, set_version: null, legacy: false, complete: true, avg_latency_ms: 700, cost_usd: '0.01000000',
  cost_unknown_count: 0, error: null, started_by: 'u9', started_by_user: LAN, created_at: at, started_at: at, finished_at: at, draft: null, heartbeat_at: null, items: [], ...over,
});

function evalMocks(over: Record<string, MockHandler> = {}): Record<string, MockHandler> {
  return {
    ...settingsMocks,
    'GET /v1/admin/ai/status': () => ({ json: { operations: [], today: { calls: 0, cap: null, failed_calls: 0, failed_cost_usd: '0', cost_usd: '0', cost_vnd: 0, admin_cost_usd: '0', admin_usd_cap: null }, ai_enabled: true, providers: { openai: true, anthropic: false, fake: true } } }),
    'GET /v1/admin/ai/operations': () => ({ json: { items: [{ operation: 'generate_cloze', model: null, effort: null, thinking: null, max_output_tokens: null, version: 1, input_fields: FIELDS, estimate: null }] } }),
    'GET /v1/admin/ai/test-quota': () => ({ json: { limit: 20, remaining: 17, resets_at: at } }),
    'GET /v1/admin/ai/eval/examples': () => ({ json: { items: [devExample('e1', 'go')] } }),
    'GET /v1/admin/ai/eval/sets': noSets,
    'GET /v1/admin/ai/eval/runs': () => ({ json: { items: [], next_page_token: null } }),
    [`GET /v1/admin/ai/eval/runs/${EVAL_RUN_ID}/items`]: noRunItems,
    ...over,
  };
}

async function openNavIfCollapsed(page: Page) {
  if ((page.viewportSize()?.width ?? 0) < 1024) await page.getByRole('button', { name: vi.shell.openMenu }).click();
}

test.describe('Bộ ví dụ (A/83)', () => {
  test.use({ locale: 'vi-VN' });

  test('menu → Bộ ví dụ; [Thêm ví dụ] posts a box per input field and the expected forms; [Chạy bộ ví dụ] runs the newest version and opens the run, which reads itself until Xong', async ({ page }) => {
    let examples = [devExample('e1', 'go')];
    let reads = 0;
    let remaining = 17;
    const onVersion = { set_id: 'S1', set_version: 1 };
    await signedInAs(page, 'admin', evalMocks({
      'GET /v1/admin/ai/eval/examples': () => ({ json: { items: examples } }),
      'GET /v1/admin/ai/eval/sets': () => ({ json: { items: [evalSet()] } }),
      'POST /v1/admin/ai/eval/examples': (req) => {
        const added = devExample('e2', 'run', req.body as Record<string, unknown>);
        examples = [...examples, added];
        return { status: 201, json: added };
      },
      'GET /v1/admin/ai/test-quota': () => ({ json: { limit: 20, remaining, resets_at: at } }),
      'POST /v1/admin/ai/eval/runs': () => {
        remaining -= 1;
        return { status: 202, json: { run_id: EVAL_RUN_ID, status: 'queued' } };
      },
      [`GET /v1/admin/ai/eval/runs/${EVAL_RUN_ID}`]: () => {
        reads += 1;
        return { json: reads === 1 ? run({ status: 'running', done: 1, valid_count: 1, ...onVersion }) : run(onVersion) };
      },
      [`GET /v1/admin/ai/eval/runs/${EVAL_RUN_ID}/items`]: () => ({
        json: { items: [runItem()], stats: runStats({ total: 1, shape_pass: 1, rule_pass: 1, expected_pass: 1 }), passes: [], judge_stats: [] },
      }),
    }));
    await page.goto('/ai/status');
    await openNavIfCollapsed(page);
    await page.getByRole('navigation', { name: vi.shell.mainNav }).getByRole('link', { name: vi.nav.aiEval }).click();
    await expect(page.getByRole('heading', { level: 1, name: vi.nav.aiEval })).toBeVisible();
    await expect(page.getByRole('heading', { level: 2, name: t.examples.replace('{count}', '1') })).toBeVisible();

    await page.getByRole('button', { name: t.add }).first().click();
    const dialog = page.getByRole('dialog', { name: t.form.addTitle });
    await dialog.getByLabel('word', { exact: true }).fill('run');
    await dialog.getByLabel(t.form.expected.forms.label).fill('run, ran');
    await dialog.getByLabel(t.form.note).fill('motion');
    expect(await seriousViolations(page)).toEqual([]);
    await dialog.getByRole('button', { name: t.form.submitAdd }).click();
    await expect(page.getByText(t.toast.added)).toBeVisible();
    expect(requests(page, 'POST', '/v1/admin/ai/eval/examples')[0].body).toEqual({
      operation: 'generate_cloze', input: { word: 'run', part_of_speech: null, level: null, meaning_vi: null, context_label: null }, note: 'motion',
      expected: { forms: ['run', 'ran'] },
    });
    await expect(page.getByRole('heading', { level: 2, name: t.examples.replace('{count}', '2') })).toBeVisible();

    await expect(page.getByRole('button', { name: new RegExp(`${t.set.label}$`) })).toContainText(t.set.version.replace('{version}', '1'));
    await page.getByRole('button', { name: t.run.start }).click();
    await expect(page).toHaveURL(/\/ai\/eval\/runs\/aaaaaaaa-0000-4000-8000-000000000001$/);
    const panel = page.getByTestId('detail-panel');
    await expect(panel.getByText(t.status.running, { exact: true })).toBeVisible();
    await expect(panel.getByText(t.status.finished, { exact: true })).toBeVisible({ timeout: 5000 });
    await expect(panel).toContainText('261');
    await expect(panel).toContainText('theo tỷ giá hôm nay');
    await expect(panel.getByText('Dev: khuôn 1/1 · luật 1/1 (0 bỏ qua) · mong đợi 1/1')).toBeVisible();
    await expect(page.getByText(t.run.quota.replace('{remaining}', '16').replace('{limit}', '20'))).toBeVisible();
    const sent = requests(page, 'POST', '/v1/admin/ai/eval/runs');
    expect(sent.map((r) => r.body)).toEqual([{ operation: 'generate_cloze', prompt: 'current', set_id: 'S1' }]);
    expect(sent[0].headers['idempotency-key']).toBeTruthy();
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('held-out rows stay hidden; [Mở ví dụ held-out] asks first and moves the example to dev; [Chốt phiên bản] names the next version; a version shows its items; axe clean', async ({ page }) => {
    let examples: unknown[] = [devExample('e1', 'go'), devExample('e2', 'run'), devExample('e3', 'come'), heldOutExample('e4'), heldOutExample('e5')];
    let sets = [evalSet({ revealed_count: 1 })];
    await signedInAs(page, 'admin', evalMocks({
      'GET /v1/admin/ai/eval/examples': () => ({ json: { items: examples } }),
      'POST /v1/admin/ai/eval/examples/e4/reveal': () => {
        examples = [examples[0], examples[1], examples[2], devExample('e4', 'rise'), examples[4]];
        return { json: { id: 'e4', operation: 'generate_cloze', split: 'dev', input: clozeInput('rise'), expected: { forms: ['rise'] }, note: null, revealed_at: at, deleted: false } };
      },
      'GET /v1/admin/ai/eval/sets': () => ({ json: { items: sets } }),
      'POST /v1/admin/ai/eval/sets': () => {
        sets = [evalSet({ id: 'S2', version: 2, dev_count: 4, held_out_count: 1 }), ...sets];
        return { status: 201, json: sets[0] };
      },
      'GET /v1/admin/ai/eval/sets/S1': () => ({
        json: {
          ...evalSet({ revealed_count: 1 }),
          items: [
            { example_id: 'e1', position: 0, split: 'dev', revealed_at: null, in_working_set: true, input: clozeInput('go'), expected: { forms: ['go'] } },
            { example_id: 'e9', position: 1, split: 'held_out', revealed_at: null, in_working_set: false, input: null, expected: null },
            { example_id: 'e8', position: 2, split: 'held_out', revealed_at: at, in_working_set: true, input: clozeInput('fall'), expected: { forms: ['fall'] } },
          ],
        },
      }),
    }));
    await page.goto('/ai/eval');
    await expect(page.getByText('3 dev · 2 held-out')).toBeVisible();
    await expect(page.getByText(t.heldOutHidden).filter({ visible: true })).toHaveCount(2);
    await expect(page.getByText(t.sets.revealed.replace('{count}', '1')).filter({ visible: true })).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);

    await page.getByRole('button', { name: t.reveal.button }).filter({ visible: true }).first().click();
    const reveal = page.getByRole('dialog', { name: t.reveal.title });
    await expect(reveal).toContainText(t.reveal.body);
    expect(await seriousViolations(page)).toEqual([]);
    await reveal.getByRole('button', { name: t.reveal.confirm }).click();
    await expect(page.getByText(t.toast.revealed)).toBeVisible();
    await expect(page.getByText('4 dev · 1 held-out')).toBeVisible();
    expect(requests(page, 'POST', '/v1/admin/ai/eval/examples/e4/reveal')).toHaveLength(1);

    await page.getByRole('button', { name: t.freeze.button }).click();
    const freeze = page.getByRole('dialog', { name: t.freeze.title.replace('{version}', '2') });
    await expect(freeze).toContainText(t.freeze.body.replace('{dev}', '4').replace('{heldOut}', '1').replace('{version}', '2'));
    expect(await seriousViolations(page)).toEqual([]);
    await freeze.getByRole('button', { name: t.freeze.confirm }).click();
    await expect(page.getByText(t.toast.frozen.replace('{version}', '2'))).toBeVisible();
    expect(requests(page, 'POST', '/v1/admin/ai/eval/sets')[0].body).toEqual({ operation: 'generate_cloze' });
    await expect(page.getByRole('button', { name: t.sets.version.replace('{version}', '2'), exact: true }).filter({ visible: true })).toBeVisible();

    await page.getByRole('button', { name: t.sets.version.replace('{version}', '1'), exact: true }).filter({ visible: true }).click();
    const version = page.getByRole('dialog', { name: t.sets.version.replace('{version}', '1') });
    await expect(version.getByText(t.sets.deleted)).toBeVisible();
    await expect(version.getByText(t.sets.seen)).toBeVisible();
    await expect(version.getByRole('button', { name: t.reveal.button })).toHaveCount(1);
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('"Chốt phiên bản" refused: the banner says how many examples lack an expected answer and that no held-out exists; axe clean', async ({ page }) => {
    await signedInAs(page, 'admin', evalMocks({
      'GET /v1/admin/ai/eval/examples': () => ({ json: { items: [devExample('e1', 'go', { expected: null })] } }),
      'POST /v1/admin/ai/eval/sets': () => problem(422, 'eval-set-incomplete', { missing_expected: ['e1'], no_held_out: true }),
    }));
    await page.goto('/ai/eval');
    await page.getByRole('button', { name: t.freeze.button }).click();
    await page.getByRole('dialog', { name: t.freeze.title.replace('{version}', '1') }).getByRole('button', { name: t.freeze.confirm }).click();
    const alert = page.getByRole('alert');
    await expect(alert).toContainText(t.freeze.incomplete);
    await expect(alert).toContainText(t.freeze.missingExpected.replace('{count}', '1'));
    await expect(alert).toContainText(t.freeze.noHeldOut);
    await expect(page.getByText(t.freeze.rowMissing, { exact: true }).filter({ visible: true })).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('a run on a version is compared with an earlier run of the same version: pass rates, dev regressions, held-out as a count; axe clean', async ({ page }) => {
    const BEFORE = 'aaaaaaaa-0000-4000-8000-000000000002';
    const onVersion = { set_id: 'S1', set_version: 1 };
    await signedInAs(page, 'admin', evalMocks({
      'GET /v1/admin/ai/eval/sets': () => ({ json: { items: [evalSet()] } }),
      'GET /v1/admin/ai/eval/runs': (req) => ({
        json: { items: req.query.get('set_id') ? [run(onVersion), run({ id: BEFORE, model: 'gpt-before', ...onVersion })] : [run(onVersion)], next_page_token: null },
      }),
      [`GET /v1/admin/ai/eval/runs/${EVAL_RUN_ID}`]: () => ({ json: run(onVersion) }),
      [`GET /v1/admin/ai/eval/runs/${EVAL_RUN_ID}/items`]: () => ({
        json: {
          items: [runItem({ rule: { status: 'fail', problems: ['unknown-form:deployment'], reason: null }, expected_result: 'fail' })],
          stats: runStats({ total: 1, shape_pass: 1, rule_fail: 1, expected_fail: 1, failing: 1 }, { total: 2, shape_pass: 2, rule_pass: 1, rule_skipped: 1 }),
          passes: [], judge_stats: [],
        },
      }),
      'GET /v1/admin/ai/eval/runs/compare': () => ({
        json: {
          a: run({ id: BEFORE, ...onVersion }),
          b: run(onVersion),
          stats: {
            a: runStats({ total: 1, shape_pass: 1, rule_pass: 1, expected_pass: 1 }, { total: 2, shape_pass: 2, rule_pass: 2 }),
            b: runStats({ total: 1, shape_pass: 1, rule_fail: 1, expected_fail: 1 }, { total: 2, shape_pass: 2, rule_pass: 1, rule_fail: 1 }),
          },
          regressions: { dev: [{ example_id: 'e1', input: clozeInput('go'), failed: ['rule', 'expected'] }], held_out: 1 },
          judge: [], judge_unmatched: [],
        },
      }),
    }));
    await page.goto(`/ai/eval/runs/${EVAL_RUN_ID}`);
    const panel = page.getByTestId('detail-panel');
    await expect(panel.getByText('Không đạt: unknown-form:deployment').filter({ visible: true })).toBeVisible();
    await expect(panel.getByText('Held-out (chỉ số tổng): khuôn 2/2 · luật 1/1 (1 bỏ qua) · mong đợi 0/0')).toBeVisible();
    await expect(panel.getByText(t.detail.stats.heldOutHidden)).toBeVisible();
    await panel.getByRole('button', { name: t.compare.select }).click();
    await expect(page.getByRole('option')).toHaveCount(1);
    await page.getByRole('option', { name: /gpt-before/ }).click();
    const table = panel.getByRole('table').filter({ hasText: t.compare.cols.devBefore });
    await expect(table.getByRole('row', { name: new RegExp(`^${t.compare.rows.rule}`) })).toContainText('100%');
    await expect(table.getByRole('row', { name: new RegExp(`^${t.compare.rows.rule}`) })).toContainText('50%');
    await expect(panel.getByRole('heading', { level: 4, name: t.compare.devRegressions.replace('{count}', '1') })).toBeVisible();
    await expect(panel.getByText(`${t.compare.criteria.rule}, ${t.compare.criteria.expected}`)).toBeVisible();
    await expect(panel.getByText(t.compare.heldOutRegressions.replace('{count}', '1'))).toBeVisible();
    const asked = requests(page, 'GET', '/v1/admin/ai/eval/runs/compare')[0].query;
    expect([asked.get('a'), asked.get('b')]).toEqual([BEFORE, EVAL_RUN_ID]);
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('a running run is stopped after a question, then deleted: the panel shows "Đã dừng", then closes and the list is read again', async ({ page }) => {
    const id = EVAL_RUN_ID;
    let state: 'running' | 'stopped' | 'gone' = 'running';
    const current = () => (state === 'running'
      ? run({ status: 'running', done: 1, valid_count: 1 })
      : run({ status: 'failed', error: 'cancelled', done: 1, valid_count: 1 }));
    await signedInAs(page, 'admin', evalMocks({
      'GET /v1/admin/ai/eval/runs': () => ({ json: { items: state === 'gone' ? [] : [current()], next_page_token: null } }),
      [`GET /v1/admin/ai/eval/runs/${id}`]: () => ({ json: current() }),
      [`POST /v1/admin/ai/eval/runs/${id}/cancel`]: () => {
        state = 'stopped';
        return { json: current() };
      },
      [`DELETE /v1/admin/ai/eval/runs/${id}`]: () => {
        state = 'gone';
        return { status: 204 };
      },
    }));
    await page.goto(`/ai/eval/runs/${id}`);
    const panel = page.getByTestId('detail-panel');
    await panel.getByRole('button', { name: t.stop.button }).click();
    const stopDialog = page.getByRole('dialog', { name: t.stop.title });
    await expect(stopDialog).toContainText(t.stop.body);
    expect(await seriousViolations(page)).toEqual([]);
    await stopDialog.getByRole('button', { name: t.stop.confirm }).click();
    await expect(page.getByText(t.toast.stopped)).toBeVisible();
    await expect(panel.getByText(t.detail.cancelled)).toBeVisible();
    await expect(panel.getByText(t.status.cancelled, { exact: true })).toBeVisible();

    await panel.getByRole('button', { name: t.removeRun.button }).click();
    const deleteDialog = page.getByRole('dialog', { name: t.removeRun.title });
    await expect(deleteDialog).toContainText(t.removeRun.body);
    expect(await seriousViolations(page)).toEqual([]);
    await deleteDialog.getByRole('button', { name: t.removeRun.confirm }).click();
    await expect(page.getByText(t.toast.runDeleted)).toBeVisible();
    await expect(page).toHaveURL(/\/ai\/eval$/);
    await expect(page.getByTestId('detail-panel')).toHaveCount(0);
    expect(requests(page, 'POST', `/v1/admin/ai/eval/runs/${id}/cancel`)).toHaveLength(1);
    expect(requests(page, 'DELETE', `/v1/admin/ai/eval/runs/${id}`)).toHaveLength(1);
    await expect(page.getByText(t.runs.empty)).toBeVisible();
  });

  test('§6.5: a network error on [Chạy bộ ví dụ], then [Thử lại], sends the same Idempotency-Key', async ({ page }) => {
    let n = 0;
    await signedInAs(page, 'admin', evalMocks({
      'POST /v1/admin/ai/eval/runs': () => {
        n += 1;
        return n === 1 ? { abort: true } : { status: 202, json: { run_id: EVAL_RUN_ID, status: 'queued' } };
      },
      [`GET /v1/admin/ai/eval/runs/${EVAL_RUN_ID}`]: () => ({ json: run() }),
    }));
    await page.goto('/ai/eval');
    await page.getByRole('button', { name: t.run.start }).click();
    await expect(page.getByText(vi.offline.message)).toBeVisible();
    await page.getByRole('button', { name: vi.common.retry }).click();
    await expect(page).toHaveURL(/\/ai\/eval\/runs\/aaaaaaaa-0000-4000-8000-000000000001$/);
    const keys = requests(page, 'POST', '/v1/admin/ai/eval/runs').map((r) => r.headers['idempotency-key']);
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBe(keys[1]);
  });

  test('§6.5: the 1001st example is refused with "Mỗi thao tác tối đa 1.000 ví dụ."; model-not-set links to Thao tác', async ({ page }) => {
    await signedInAs(page, 'admin', evalMocks({
      'POST /v1/admin/ai/eval/examples': () => problem(400, 'validation-failed', { violations: ['operation: at most 1000 examples'] }),
      'POST /v1/admin/ai/eval/runs': () => problem(409, 'model-not-set'),
    }));
    await page.goto('/ai/eval/new');
    const dialog = page.getByRole('dialog', { name: t.form.addTitle });
    await dialog.getByLabel('word', { exact: true }).fill('go');
    await dialog.getByRole('button', { name: t.form.submitAdd }).click();
    await expect(dialog.getByText(t.form.tooMany)).toBeVisible();
    await dialog.getByRole('button', { name: vi.common.cancel }).click();
    await page.getByRole('alertdialog').or(page.getByRole('dialog')).getByRole('button', { name: vi.leave.discard }).click();
    await expect(page).toHaveURL(/\/ai\/eval$/);

    await page.getByRole('button', { name: t.run.start }).click();
    await expect(page.getByText(vi.errors['model-not-set'])).toBeVisible();
    await expect(page.getByRole('link', { name: vi.ai.prompts.test.openConfigs })).toHaveAttribute('href', '/ai/configs?op=generate_cloze');
  });

  test('Cấu hình: [Chạy bộ ví dụ với nháp] on a saved draft runs it as a config on the newest version and opens the run without asking "Rời trang?"', async ({ page }) => {
    await signedInAs(page, 'admin', evalMocks({
      ...configReads(),
      'GET /v1/admin/ai/eval/sets': () => ({ json: { items: [evalSet()] } }),
      'GET /v1/admin/ai/configs/generate_cloze': () => ({ json: cfgView({ draft: cfgDraft(4) }) }),
      'GET /v1/admin/ai/configs/generate_cloze/publish-check': () => ({ json: cfgCheck({ set: { id: 'S1', version: 1 }, candidate_run_id: null, blockers: ['eval-required'] }) }),
      'POST /v1/admin/ai/eval/runs': () => ({ status: 202, json: { run_id: EVAL_RUN_ID, status: 'queued' } }),
      [`GET /v1/admin/ai/eval/runs/${EVAL_RUN_ID}`]: () => ({ json: run({ prompt_revision: null, config_id: 'C4', config_version: 0, config_number: 4, set_id: 'S1', set_version: 1 }) }),
    }));
    await page.goto('/ai/configs');
    await page.getByRole('button', { name: vi.ai.configs.draft.runSet }).click();
    await expect(page).toHaveURL(/\/ai\/eval\/runs\/aaaaaaaa-0000-4000-8000-000000000001\?op=generate_cloze$/);
    await expect(page.getByText(vi.leave.title)).toHaveCount(0);
    await expect(page.getByTestId('detail-panel')).toContainText(t.detail.config.replace('{number}', '4'));
    expect(requests(page, 'POST', '/v1/admin/ai/eval/runs')[0].body).toEqual({ operation: 'generate_cloze', set_id: 'S1', config: 'draft' });
  });
});
