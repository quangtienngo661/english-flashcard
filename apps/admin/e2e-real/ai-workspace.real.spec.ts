import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import vi from '../messages/vi.json' with { type: 'json' };
import { STATE_FILE, type RealState } from './global-setup';
import { apiCall, loginToken } from './support/api';
import { ensureFrozenSet } from './support/ai-config';
import { signIn } from './support/sign-in';
import type { ConfigContent, ConfigView, EvalRun, PublishCheck } from '../src/features/ai/ai-api';

const op = 'generate_cloze';
const base = `/v1/admin/ai/configs/${op}`;
const contentOf = (draft: ConfigView): ConfigContent => ({ instructions: draft.instructions, examples: draft.examples, model_ref: draft.model?.id ?? null, effort: draft.effort, thinking: draft.thinking, max_output_tokens: draft.max_output_tokens });

test('workspace: independent drafts, temporary eval, matching save, publish, history and batch costs', async ({ page }) => {
  test.setTimeout(180_000);
  const state = JSON.parse(readFileSync(STATE_FILE, 'utf8')) as RealState;
  const token = await loginToken(state.admin.email, state.admin.password);
  const call = <T,>(method: string, path: string, body?: unknown) => apiCall<T>(method, path, token, body, { idempotencyKey: randomUUID() });
  const models = await call<{ items: Array<{id: string; model_id: string}> }>('GET', '/v1/admin/ai/models?provider=fake');
  const model = models.items.find(m => m.model_id === 'fake:ok') ?? await call<{id: string}>('POST', '/v1/admin/ai/models', { provider: 'fake', model_id: 'fake:ok' });
  const set = await ensureFrozenSet(token, op);
  const a = await call<ConfigView>('POST', `${base}/drafts`, { name: 'Workspace A' });
  const b = await call<ConfigView>('POST', `${base}/drafts`, { name: 'Workspace B' });
  const snapshot = { ...contentOf(a), instructions: `${a.instructions}\nUse natural everyday language.`, model_ref: model.id };
  const different = { ...snapshot, instructions: `${snapshot.instructions}\nUse a different context.` };
  const create = (draft: ConfigView, content: ConfigContent) => call<{run_id:string; batch_id:string}>('POST', '/v1/admin/ai/eval/runs', { operation: op, set_id: set.id, target: { kind: 'temporary', draft_id: draft.id, content } });
  const [ra, rb] = await Promise.all([create(a, snapshot), create(b, different)]);
  expect(ra.run_id).not.toBe(rb.run_id);
  expect(ra.batch_id).not.toBe(rb.batch_id);
  // Temporary evaluation must leave the saved draft untouched.
  expect((await call<ConfigView>('GET', `${base}/drafts/${a.id}`)).instructions).toBe(a.instructions);
  const waitForRun = async (id: string) => {
    let result: EvalRun | undefined;
    await expect.poll(async () => { result = await call<EvalRun>('GET', `/v1/admin/ai/eval/runs/${id}`); return result.status; }, { timeout: 90_000 }).toBe('finished');
    return result!;
  };
  const [runA, runB] = await Promise.all([waitForRun(ra.run_id), waitForRun(rb.run_id)]);
  expect(runA.fingerprint).not.toBe(runB.fingerprint);
  expect(runA.snapshot).toMatchObject(snapshot);
  const saved = await call<ConfigView>('PUT', `${base}/drafts/${a.id}`, { ...snapshot, expected_version: a.version, note: null, name: 'Workspace A saved' });
  let check = await call<PublishCheck>('GET', `${base}/drafts/${a.id}/publish-check`);
  expect(check.candidate_run_id).toBe(ra.run_id);
  if (check.blockers.includes('baseline-required')) {
    const baseline = await call<{run_id:string}>('POST', '/v1/admin/ai/eval/runs', { operation: op, set_id: set.id, target: { kind: 'live' } });
    await waitForRun(baseline.run_id);
    check = await call<PublishCheck>('GET', `${base}/drafts/${a.id}/publish-check`);
  }
  expect(check.blockers).toEqual([]);
  await call('POST', `${base}/drafts/${a.id}/publish`, { expected_version: saved.version, candidate_run_id: check.candidate_run_id, baseline_run_id: check.baseline.run_id, acknowledge_warnings: true });
  expect((await call<ConfigView>('GET', `${base}/drafts/${b.id}`)).id).toBe(b.id);
  const batch = await call<{status:string;calls:number;cost_usd:string|null;items:unknown[]}>('GET', `/v1/admin/ai/batches/${ra.batch_id}`);
  expect(batch.status).toBe('finished'); expect(batch.calls).toBeGreaterThan(0); expect(batch.cost_usd).not.toBeNull(); expect(batch.items).toEqual([]);
  await signIn(page, state.admin.email, state.admin.password);
  await page.goto(`/ai/configs?op=${op}`);
  await expect(page.getByRole('link', { name: 'Workspace B', exact: true })).toBeVisible();
  const live = page.getByRole('complementary', { name: vi.ai.workspace.live });
  await expect(live.getByText('fake:ok', { exact: true })).toBeVisible();
  await expect(live.getByRole('button', { name: vi.ai.configs.draft.create })).toHaveCount(0);
  await page.getByRole('link', { name: vi.ai.workspace.history, exact: true }).click();
  await expect(live).toBeVisible();
  await page.goto(`/ai/costs?batch=${ra.batch_id}`);
  await expect(page.getByText(ra.batch_id, { exact: true }).first()).toBeVisible();
  await page.screenshot({ path: 'test-results/ai-workspace-real-costs.png' });
});
