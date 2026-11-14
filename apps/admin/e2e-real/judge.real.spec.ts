import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import vi from '../messages/vi.json' with { type: 'json' };
import type { RealState } from './global-setup';
import { STATE_FILE } from './global-setup';
import { apiCall, loginToken } from './support/api';
import { ensureFrozenSet } from './support/ai-config';
import { chooseClozeModel } from './support/ai-report';
import { signIn } from './support/sign-in';

/**
 * M3 on the real stack (nhóm B design §5.4): the admin judges a finished run of generate_cloze with the seeded judge "Chỉ một đáp án" (saved on the
 * fake model, the only one allowed while `AI_FAKE_ENABLED=true`), the pass reaches "Đã xong", the admin labels one output on the label screen with
 * key 1, and the judge's agreement shows one label more. The API runs with the fake provider only: nothing leaves the machine.
 */
const OP = 'generate_cloze';
const JUDGE = 'Chỉ một đáp án';
const RUN_TIMEOUT_MS = 90_000;
const state = (): RealState => JSON.parse(readFileSync(STATE_FILE, 'utf8'));
let runId = '';

type JudgeRow = {
  id: string; name: string; operations: string[];
  latest: { revision: number; criteria: unknown[]; instructions: string; examples: unknown[]; model: { id: string } | null };
};

async function seededJudge(token: string): Promise<JudgeRow> {
  const { items } = await apiCall<{ items: JudgeRow[] }>('GET', '/v1/admin/ai/judges', token);
  const judge = items.find((row) => row.name === JUDGE);
  if (!judge) throw new Error(`The seeded judge "${JUDGE}" is not in the list of judges`);
  return judge;
}

/** How many outputs carry both the owner's label and a score of the newest revision of the judge, on its one criterion. */
async function labeled(token: string, judge: JudgeRow): Promise<number> {
  const agreement = await apiCall<{ items: Array<{ revision: number; criterion: string; labeled: number }> }>('GET', `/v1/admin/ai/judges/${judge.id}/agreement`, token);
  return agreement.items.find((item) => item.revision === judge.latest.revision && item.criterion === 'single_answer')?.labeled ?? 0;
}

test.beforeAll(async () => {
  const { admin } = state();
  const token = await loginToken(admin.email, admin.password);
  await chooseClozeModel(token, 'fake:ok');
  const set = await ensureFrozenSet(token, OP);
  const created = await apiCall<{ run_id: string }>('POST', '/v1/admin/ai/eval/runs', token, { operation: OP, config: 'live', set_id: set.id }, { idempotencyKey: randomUUID() });
  runId = created.run_id;
  const deadline = Date.now() + RUN_TIMEOUT_MS;
  for (;;) {
    const run = await apiCall<{ status: string; error: string | null }>('GET', `/v1/admin/ai/eval/runs/${runId}`, token);
    if (run.status === 'finished') break;
    if (run.status === 'failed') throw new Error(`The run ${runId} failed: ${run.error ?? 'no reason'}`);
    if (Date.now() > deadline) throw new Error(`The run ${runId} did not finish within ${RUN_TIMEOUT_MS / 1000}s`);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  // The seeded judge names no model: save it on `fake:ok` (skipped when it already is, as on a second run on the same database).
  const judge = await seededJudge(token);
  const models = await apiCall<{ items: Array<{ id: string; model_id: string }> }>('GET', '/v1/admin/ai/models', token);
  const fake = models.items.find((model) => model.model_id === 'fake:ok');
  if (!fake) throw new Error('The model fake:ok is not in the list of models');
  if (judge.latest.model?.id !== fake.id) {
    await apiCall('PUT', `/v1/admin/ai/judges/${judge.id}`, token, {
      name: judge.name, operations: judge.operations, active: true, criteria: judge.latest.criteria, instructions: judge.latest.instructions,
      examples: judge.latest.examples, model_ref: fake.id, effort: null, thinking: null, max_output_tokens: null, expected_revision: judge.latest.revision,
    });
  }
});

test('the admin judges a finished run with the seeded judge and labels one output', async ({ page }) => {
  const { admin } = state();
  const token = await loginToken(admin.email, admin.password);
  const judge = await seededJudge(token);
  const before = await labeled(token, judge);

  await signIn(page, admin.email, admin.password);
  await page.goto(`/ai/eval/runs/${runId}?op=${OP}`);
  const panel = page.getByTestId('detail-panel');
  await expect(panel.getByRole('heading', { name: vi.ai.eval.detail.results })).toBeVisible();
  await panel.getByRole('button', { name: vi.ai.eval.detail.judge.start, exact: true }).click();
  // "{judge} bản {revision} · Đã xong · {n}/{n} · {cost}": every output the pass took was judged.
  await expect(panel.getByText(new RegExp(`^${JUDGE} bản ${judge.latest.revision} · Đã xong · (\\d+)/\\1 · `))).toBeVisible({ timeout: 45_000 });
  await expect(panel.getByText(new RegExp(`^Judge ${JUDGE} bản ${judge.latest.revision} · single_answer: dev đạt `))).toBeVisible();
  await page.screenshot({ path: 'test-results/judge-run.png' });

  await panel.getByRole('link', { name: vi.ai.eval.detail.judge.labelQueue }).click();
  await expect(page.getByRole('heading', { level: 2, name: `Gắn nhãn · ${JUDGE}` })).toBeVisible();
  const put = page.waitForResponse((res) => res.url().endsWith('/v1/admin/ai/labels') && res.request().method() === 'PUT');
  await page.keyboard.press('1');
  expect((await put).status()).toBe(200);
  await page.screenshot({ path: 'test-results/judge-label.png' });

  await page.goto('/ai/judges');
  await expect(page.getByRole('heading', { level: 1, name: vi.nav.aiJudges })).toBeVisible();
  await page.getByRole('button', { name: vi.ai.judges.agreementFor.replace('{name}', JUDGE) }).click();
  const agreement = page.getByRole('region', { name: vi.ai.judges.agreementPanel.title.replace('{name}', JUDGE) });
  await expect(agreement.getByText(new RegExp(`^Bản ${judge.latest.revision} · single_answer: ${before + 1} nhãn · `))).toBeVisible();
});
