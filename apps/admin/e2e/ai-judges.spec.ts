import { expect, test, type Page } from '@playwright/test';
import vi from '../messages/vi.json' with { type: 'json' };
import { EVAL_AT as at, EVAL_LAN as LAN, EVAL_RUN_ID, devExample, evalSet, runItem } from './support/ai-eval';
import { judgeOnFake, judgePass, judgeReads, judgeRevision, judgeRow, label, scoredRunItems } from './support/ai-judges';
import { seriousViolations } from './support/axe';
import { problem, requests, signedInAs, type MockHandler } from './support/mock-api';
import { expectNoHorizontalScroll } from './support/overflow';
import { settingsMocks } from './support/settings';

const t = vi.ai.judges;
const nav = (page: Page) => page.getByRole('navigation', { name: vi.shell.mainNav });
const LABEL_PATH = `/ai/judges/label?run=${EVAL_RUN_ID}&judge=J1`;

async function openNavIfCollapsed(page: Page) {
  if ((page.viewportSize()?.width ?? 0) < 1024) await page.getByRole('button', { name: vi.shell.openMenu }).click();
}

const run = (over: Record<string, unknown> = {}) => ({
  id: EVAL_RUN_ID, operation: 'generate_cloze', provider: 'openai', model: 'gpt-x', effort: null, thinking: null, max_output_tokens: null, prompt_revision: null,
  config_id: 'C3', config_version: 0, config_number: 3, status: 'finished', total: 2, done: 2, valid_count: 2, set_id: 'S1', set_version: 1, legacy: false, complete: true,
  avg_latency_ms: 700, cost_usd: '0.01000000', cost_unknown_count: 0, error: null, started_by: 'u9', started_by_user: LAN, created_at: at, started_at: at, finished_at: at,
  draft: null, heartbeat_at: null, items: [], ...over,
});

/** What the Bộ ví dụ page and its run panel read, with a judge that scores generate_cloze and a run on version 1. */
function runReads(over: Record<string, MockHandler> = {}): Record<string, MockHandler> {
  return {
    ...settingsMocks,
    ...judgeReads({ 'GET /v1/admin/ai/judges': () => ({ json: { items: [judgeOnFake()] } }) }),
    'GET /v1/admin/ai/operations': () => ({ json: { items: [{ operation: 'generate_cloze', model: null, effort: null, thinking: null, max_output_tokens: null, version: 1, input_fields: ['word'], estimate: null }] } }),
    'GET /v1/admin/ai/test-quota': () => ({ json: { limit: 20, remaining: 17, resets_at: at } }),
    'GET /v1/admin/ai/eval/examples': () => ({ json: { items: [devExample('e1', 'go')] } }),
    'GET /v1/admin/ai/eval/sets': () => ({ json: { items: [evalSet()] } }),
    'GET /v1/admin/ai/eval/runs': () => ({ json: { items: [run()], next_page_token: null } }),
    [`GET /v1/admin/ai/eval/runs/${EVAL_RUN_ID}`]: () => ({ json: run() }),
    [`GET /v1/admin/ai/eval/runs/${EVAL_RUN_ID}/items`]: scoredRunItems(),
    ...over,
  };
}

test.describe('Judge (nhóm B M3)', () => {
  test.use({ locale: 'vi-VN' });

  test('menu → Judge; the seeded judge gets the fake model, is saved as revision 2 and lists its revisions', async ({ page }) => {
    let saved = false;
    await signedInAs(page, 'admin', judgeReads({
      'GET /v1/admin/ai/judges': () => ({ json: { items: [saved ? judgeOnFake() : judgeRow()] } }),
      'GET /v1/admin/ai/judges/J1/revisions': () => ({ json: { items: saved ? [judgeOnFake().latest, judgeRevision()] : [judgeRevision()] } }),
      'PUT /v1/admin/ai/judges/J1': () => {
        saved = true;
        return { json: judgeOnFake() };
      },
    }));
    await page.goto('/ai/models');
    await openNavIfCollapsed(page);
    await nav(page).getByRole('link', { name: vi.nav.aiJudges }).click();
    await expect(page.getByRole('heading', { level: 1, name: vi.nav.aiJudges })).toBeVisible();
    await expect(page.getByText('Chỉ một đáp án · bản 1').filter({ visible: true })).toBeVisible();
    await expect(page.getByText(t.noModel).filter({ visible: true })).toBeVisible();

    await page.getByRole('button', { name: /^Sửa/ }).click();
    await expect(page.getByRole('heading', { name: 'Judge Chỉ một đáp án' })).toBeVisible();
    await page.getByRole('button', { name: /Model$/ }).click();
    await page.getByRole('option', { name: 'Fake · fake:ok' }).click();
    await page.getByRole('button', { name: t.editor.save, exact: true }).click();
    await expect(page.getByText('Đã lưu bản 2.')).toBeVisible();
    expect(requests(page, 'PUT', '/v1/admin/ai/judges/J1')[0]!.body).toMatchObject({ expected_revision: 1, model_ref: 'm1', name: 'Chỉ một đáp án' });
    await expect(page.getByRole('region', { name: t.editor.history }).getByText(/^Bản 2 · .* · lan@wordmet\.com · Fake · fake:ok$/)).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('"Độ khớp" shows the labels of the judge and what calibration still needs', async ({ page }) => {
    await signedInAs(page, 'admin', judgeReads());
    await page.goto('/ai/judges');
    await page.getByRole('button', { name: t.agreementFor.replace('{name}', 'Chỉ một đáp án') }).click();
    const panel = page.getByRole('region', { name: t.agreementPanel.title.replace('{name}', 'Chỉ một đáp án') });
    await expect(panel.getByText('Bản 1 · single_answer: 29 nhãn · khớp đạt/không đạt 100% · khớp cả mức 96,6%')).toBeVisible();
    await expect(panel.getByText('Cần ít nhất 30 nhãn và khớp từ 85%.')).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('"Gắn nhãn": key 1 sends the label and moves on; the judge\'s verdict is never on the screen', async ({ page }) => {
    await signedInAs(page, 'admin', {
      ...judgeReads({ 'GET /v1/admin/ai/judges': () => ({ json: { items: [judgeOnFake()] } }) }),
      [`GET /v1/admin/ai/eval/runs/${EVAL_RUN_ID}`]: () => ({ json: run() }),
      [`GET /v1/admin/ai/eval/runs/${EVAL_RUN_ID}/items`]: scoredRunItems({
        items: [runItem({ item_id: 'i1', scores: [{ judge_id: 'J1', judge_name: 'Chỉ một đáp án', judge_revision_id: 'JR2', revision: 2, criterion: 'single_answer', verdict: 'fail_major', problem: null, reason: 'beat fits too' }], labels: [] }),
          runItem({ item_id: 'i2', example_id: 'e2', position: 1, labels: [] })],
      }),
      'PUT /v1/admin/ai/labels': (req) => ({ json: label({ ...(req.body as object) }) }),
    });
    await page.goto(LABEL_PATH);
    await expect(page.getByRole('heading', { level: 2, name: 'Gắn nhãn · Chỉ một đáp án' })).toBeVisible();
    await expect(page.getByText('1/2', { exact: true })).toBeVisible();
    await expect(page.getByText('beat fits too')).toHaveCount(0);
    await expect(page.getByText(t.label.hint)).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);
    await page.keyboard.press('1');
    await expect(page.getByText('2/2', { exact: true })).toBeVisible();
    expect(requests(page, 'PUT', '/v1/admin/ai/labels')[0]!.body).toEqual({ subject_kind: 'eval_item', subject_id: 'i1', criterion: 'single_answer', verdict: 'pass' });
    await page.keyboard.press('2');
    await expect(page.getByText(t.label.end.replace('{total}', '2'))).toBeVisible();
    expect(requests(page, 'PUT', '/v1/admin/ai/labels')[1]!.body).toMatchObject({ subject_id: 'i2', verdict: 'fail_major' });
    await expect(page.getByRole('link', { name: t.label.backToRun })).toHaveAttribute('href', `/ai/eval/runs/${EVAL_RUN_ID}?op=generate_cloze`);
  });

  test('the run panel: what the judge said, its stats line, a label chosen in the table and a new pass', async ({ page }) => {
    await signedInAs(page, 'admin', runReads({
      'PUT /v1/admin/ai/labels': (req) => ({ json: label({ ...(req.body as object) }) }),
      [`POST /v1/admin/ai/eval/runs/${EVAL_RUN_ID}/judge-passes`]: () => ({ status: 202, json: judgePass({ id: 'P2', status: 'queued', judged: 0 }) }),
    }));
    await page.goto(`/ai/eval/runs/${EVAL_RUN_ID}`);
    const panel = page.getByTestId('detail-panel');
    await expect(panel.getByText('Judge Chỉ một đáp án bản 2 · single_answer: dev đạt 1/2 (nặng 1, nhẹ 0) · held-out đạt 1/1 · 0 không chấm được')).toBeVisible();
    await expect(panel.getByText(vi.ai.eval.detail.judge.uncalibrated)).toBeVisible();
    await expect(panel.getByText('single_answer: Không đạt nặng').filter({ visible: true })).toBeVisible();
    await expect(panel.getByText('beat fits too').filter({ visible: true })).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);

    await panel.getByRole('button', { name: /Chưa gắn.*Nhãn/ }).first().click();
    await page.getByRole('option', { name: 'Đạt', exact: true }).click();
    await expect.poll(() => requests(page, 'PUT', '/v1/admin/ai/labels').length).toBe(1);
    expect(requests(page, 'PUT', '/v1/admin/ai/labels')[0]!.body).toEqual({ subject_kind: 'eval_item', subject_id: 'i1', criterion: 'single_answer', verdict: 'pass' });

    await panel.getByRole('button', { name: vi.ai.eval.detail.judge.start, exact: true }).click();
    await expect.poll(() => requests(page, 'POST', `/v1/admin/ai/eval/runs/${EVAL_RUN_ID}/judge-passes`).length).toBe(1);
    expect(requests(page, 'POST', `/v1/admin/ai/eval/runs/${EVAL_RUN_ID}/judge-passes`)[0]!.body).toEqual({ judge_id: 'J1' });
    await expect(panel.getByRole('link', { name: vi.ai.eval.detail.judge.labelQueue })).toHaveAttribute('href', `/ai/judges/label?run=${EVAL_RUN_ID}&judge=J1`);
  });

  test('Bộ ví dụ: ticking "Chấm bằng judge" posts the run with the judge; a refused run shows its sentence', async ({ page }) => {
    let refuse = true;
    await signedInAs(page, 'admin', runReads({
      'GET /v1/admin/ai/eval/runs': () => ({ json: { items: [], next_page_token: null } }),
      'POST /v1/admin/ai/eval/runs': () => (refuse ? problem(409, 'admin-usd-cap') : { status: 202, json: { run_id: EVAL_RUN_ID, status: 'queued', judge_pass_id: 'P1' } }),
    }));
    await page.goto('/ai/eval');
    // A React Aria checkbox hides its input: the visible label is what is clicked.
    await page.locator('label', { hasText: vi.ai.eval.run.judge }).click();
    await expect(page.getByRole('checkbox', { name: vi.ai.eval.run.judge })).toBeChecked();
    await page.getByRole('button', { name: vi.ai.eval.run.start, exact: true }).click();
    await expect(page.getByText(vi.errors['admin-usd-cap'])).toBeVisible();
    expect(requests(page, 'POST', '/v1/admin/ai/eval/runs')[0]!.body).toEqual({ operation: 'generate_cloze', prompt: 'current', set_id: 'S1', judge_id: 'J1' });
    refuse = false;
  });

  test('the Judge page, its editor and the label screen fit a 375 px window with long names and texts', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'sets its own viewport');
    await page.setViewportSize({ width: 375, height: 812 });
    const long = 'j'.repeat(90);
    await signedInAs(page, 'admin', {
      ...judgeReads({
        'GET /v1/admin/ai/judges': () => ({ json: { items: [judgeOnFake({ name: long, latest: judgeRevision({ id: 'JR2', revision: 2, model: { id: 'm1', provider: 'fake', model_id: 'm'.repeat(80) }, instructions: 'x'.repeat(3000) }) })] } }),
        'GET /v1/admin/ai/judges/J1/revisions': () => ({ json: { items: [judgeOnFake().latest] } }),
      }),
      [`GET /v1/admin/ai/eval/runs/${EVAL_RUN_ID}`]: () => ({ json: run() }),
      [`GET /v1/admin/ai/eval/runs/${EVAL_RUN_ID}/items`]: scoredRunItems({
        items: [runItem({ item_id: 'i1', output: { sentence: 's'.repeat(400), accepted_answers: ['a'.repeat(120)], translation_vi: 't'.repeat(300) }, labels: [] })],
      }),
    });
    await page.goto('/ai/judges');
    await expect(page.getByText(`${long} · bản 2`).filter({ visible: true })).toBeVisible();
    await expectNoHorizontalScroll(page);
    await page.getByRole('button', { name: /^Sửa/ }).click();
    await expect(page.getByRole('heading', { name: `Judge ${long}` })).toBeVisible();
    await expectNoHorizontalScroll(page);
    expect(await seriousViolations(page)).toEqual([]);
    await page.goto(LABEL_PATH);
    await expect(page.getByText('s'.repeat(400))).toBeVisible();
    await expectNoHorizontalScroll(page);
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('an editor does not see the Judge entry and /ai/judges shows no access', async ({ page }) => {
    await signedInAs(page, 'editor', { 'GET /v1/admin/content/uploads': () => ({ json: { items: [], next_page_token: null } }) });
    await page.goto('/ai/judges');
    await expect(page.getByText(vi.noAccess.title)).toBeVisible();
    expect(requests(page, 'GET', '/v1/admin/ai/judges')).toHaveLength(0);
  });
});
