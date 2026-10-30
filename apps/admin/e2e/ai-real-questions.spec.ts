import { expect, test, type Page } from '@playwright/test';
import vi from '../messages/vi.json' with { type: 'json' };
import { REAL_PASS_ID, realEstimate, realItems, realJudge, realPass, realReads } from './support/ai-real';
import { seriousViolations } from './support/axe';
import { problem, requests, signedInAs, type MockHandler } from './support/mock-api';
import { expectNoHorizontalScroll } from './support/overflow';

const t = vi.ai.real;
const nav = (page: Page) => page.getByRole('navigation', { name: vi.shell.mainNav });
const PASS_PATH = '/v1/admin/practice/real-judge';

async function openNavIfCollapsed(page: Page) {
  if ((page.viewportSize()?.width ?? 0) < 1024) await page.getByRole('button', { name: vi.shell.openMenu }).click();
}

test.describe('Câu AI thật (nhóm B M4)', () => {
  test.use({ locale: 'vi-VN' });

  test('menu → the estimate → "Chấm 3 câu" → the pass → "Đưa vào bộ ví dụ" → the toast', async ({ page }) => {
    let started = false;
    await signedInAs(page, 'admin', realReads({
      [`POST ${PASS_PATH}`]: () => {
        started = true;
        return { status: 201, json: { pass_id: REAL_PASS_ID, selected: 3, skipped: { private_word: 1, no_content: 0, already_judged: 0 } } };
      },
      [`GET ${PASS_PATH}/passes`]: () => ({ json: { items: started ? [realPass()] : [], next_page_token: null } }),
      'POST /v1/admin/practice/eval-examples/from-source': () => ({ status: 201, json: { id: 'e9', operation: 'generate_cloze', rebuilt: false } }),
    }));
    await page.goto('/ai/models');
    await openNavIfCollapsed(page);
    await nav(page).getByRole('link', { name: vi.nav.aiRealQuestions }).click();
    await expect(page.getByRole('heading', { level: 1, name: vi.nav.aiRealQuestions })).toBeVisible();
    await expect(page.getByText('Sẽ chấm 3 câu (tối đa 200), mới nhất trước.')).toBeVisible();
    await expect(page.getByText('Bỏ qua 1 câu có từ riêng của người học.')).toBeVisible();
    await expect(page.getByText(t.estimate.costUnknown)).toBeVisible();
    expect(requests(page, 'GET', `${PASS_PATH}/estimate`)[0]!.query.toString()).toBe('judge_id=J1&operation=generate_cloze');
    expect(await seriousViolations(page)).toEqual([]);

    await page.getByRole('button', { name: 'Chấm 3 câu', exact: true }).click();
    await expect.poll(() => requests(page, 'POST', PASS_PATH).length).toBe(1);
    expect(requests(page, 'POST', PASS_PATH)[0]!.body).toEqual({ judge_id: 'J1', operation: 'generate_cloze', config: null, test_accounts_only: false });
    expect(requests(page, 'POST', PASS_PATH)[0]!.headers['idempotency-key']).toBeTruthy();
    await expect(page).toHaveURL(new RegExp(`\\?pass=${REAL_PASS_ID}$`));
    const panel = page.getByTestId('detail-panel');
    await expect(panel.getByRole('heading', { level: 2, name: 'Lượt chấm · 15/10/2026 09:12' })).toBeVisible();
    await expect(panel.getByText('come fits too').filter({ visible: true })).toBeVisible();
    await expect(panel.getByText('single_answer: Không đạt nặng').filter({ visible: true })).toBeVisible();
    expect(await seriousViolations(page)).toEqual([]);

    // Only the failed question has the button.
    await expect(panel.getByRole('button', { name: /^Đưa vào bộ ví dụ/ })).toHaveCount(1);
    await panel.getByRole('button', { name: /^Đưa vào bộ ví dụ/ }).click();
    const dialog = page.getByRole('dialog', { name: t.add.title });
    await expect(dialog.getByText('go · verb')).toBeVisible();
    await expect(dialog.getByRole('textbox', { name: vi.ai.eval.form.expected.forms.label })).toHaveValue('go, goes, going');
    expect(requests(page, 'GET', '/v1/admin/practice/eval-examples/from-source')[0]!.query.toString()).toBe('question_id=q1');
    expect(await seriousViolations(page)).toEqual([]);
    await dialog.getByRole('button', { name: t.add.confirm }).click();
    await expect(page.getByText(t.add.added)).toBeVisible();
    expect(requests(page, 'POST', '/v1/admin/practice/eval-examples/from-source')[0]!.body).toEqual({ question_id: 'q1', expected: { forms: ['go', 'goes', 'going'] }, note: null });
    await expect(dialog).toBeHidden();
  });

  test('ticking "Chỉ tài khoản test" and picking a pair asks the estimate again with both', async ({ page }) => {
    await signedInAs(page, 'admin', realReads());
    await page.goto('/ai/real-questions');
    await expect(page.getByText('Sẽ chấm 3 câu (tối đa 200), mới nhất trước.')).toBeVisible();
    // A React Aria checkbox hides its input: the visible label is what is clicked.
    await page.locator('label', { hasText: t.fields.testOnly }).click();
    await expect.poll(() => requests(page, 'GET', `${PASS_PATH}/estimate`).at(-1)?.query.get('test_accounts_only')).toBe('true');
    await page.getByRole('button', { name: new RegExp(`${t.fields.pair}$`) }).click();
    await page.getByRole('option', { name: 'Cấu hình 4 · fake:ok (6 câu)' }).click();
    await expect.poll(() => requests(page, 'GET', `${PASS_PATH}/estimate`).at(-1)?.query.toString()).toBe('judge_id=J1&operation=generate_cloze&config_number=4&model=fake%3Aok&test_accounts_only=true');
  });

  test('nothing to judge: the reason is said and the button stays off', async ({ page }) => {
    await signedInAs(page, 'admin', realReads({
      'GET /v1/admin/practice/real-judge/estimate': () => ({ json: realEstimate({ selected: 0, reason: 'retention-off', skipped: { private_word: 0, no_content: 0, already_judged: 0 } }) }),
    }));
    await page.goto('/ai/real-questions');
    await expect(page.getByText(t.estimate.retentionOff)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Chấm 0 câu', exact: true })).toBeDisabled();
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('a refused start shows its sentence', async ({ page }) => {
    await signedInAs(page, 'admin', realReads({ [`POST ${PASS_PATH}`]: () => problem(409, 'judge-pass-running') }));
    await page.goto('/ai/real-questions');
    await page.getByRole('button', { name: 'Chấm 3 câu', exact: true }).click();
    await expect(page.getByText(vi.errors['judge-pass-running'])).toBeVisible();
  });

  test('the page and a pass fit a 375 px window with long names, models and texts', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'sets its own viewport');
    await page.setViewportSize({ width: 375, height: 812 });
    const long = 'j'.repeat(90);
    const model = 'm'.repeat(80);
    const handlers: Record<string, MockHandler> = realReads({
      'GET /v1/admin/ai/judges': () => ({ json: { items: [realJudge({ name: long })] } }),
      'GET /v1/admin/practice/real-judge/estimate': () => ({ json: realEstimate({ pairs: [{ config_number: 4, model, questions: 6 }] }) }),
      [`GET ${PASS_PATH}/passes`]: () => ({ json: { items: [realPass({ judge: { id: 'J1', name: long } })], next_page_token: null } }),
      [`GET ${PASS_PATH}/passes/${REAL_PASS_ID}/items`]: () => ({
        json: {
          pass: realPass({ judge: { id: 'J1', name: long }, judge_model: { provider: 'fake', model_id: model } }),
          items: [{ ...realItems()[0]!, output: { sentence: 's'.repeat(400), accepted_answers: ['a'.repeat(120)] }, model, scores: [{ criterion: 'single_answer', verdict: 'fail_major', problem: null, reason: 'r'.repeat(300) }] }],
        },
      }),
    });
    await signedInAs(page, 'admin', handlers);
    await page.goto('/ai/real-questions');
    await expect(page.getByText('Sẽ chấm 3 câu (tối đa 200), mới nhất trước.')).toBeVisible();
    await expectNoHorizontalScroll(page);
    expect(await seriousViolations(page)).toEqual([]);
    await page.goto(`/ai/real-questions?pass=${REAL_PASS_ID}`);
    await expect(page.getByTestId('detail-panel').getByText('r'.repeat(300)).filter({ visible: true })).toBeVisible();
    const { scrollWidth, innerWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
    expect(await seriousViolations(page)).toEqual([]);
  });

  test('an editor does not see the entry and /ai/real-questions shows no access', async ({ page }) => {
    await signedInAs(page, 'editor', { 'GET /v1/admin/content/uploads': () => ({ json: { items: [], next_page_token: null } }) });
    await page.goto('/ai/real-questions');
    await expect(page.getByText(vi.noAccess.title)).toBeVisible();
    expect(requests(page, 'GET', `${PASS_PATH}/estimate`)).toHaveLength(0);
  });
});
