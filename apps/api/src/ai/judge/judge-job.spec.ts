import { describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import type { AppLogger } from '../../common/logging/app-logger.js';
import type { AiResult } from '../ai.types.js';
import type { ExecuteInput, RunReport } from '../runner/runner.service.js';
import { JudgeJob } from './judge-job.js';
import type { PassItemRow, PassToRun, RevisionToRun } from './judge-passes.repository.js';
import { scoresFromOutput } from './judge-output.js';

const NOW = new Date('2026-10-30T03:00:00Z');
const PASS = '11111111-1111-4111-8111-111111111111';
const ADMIN = '22222222-2222-4222-8222-222222222222';
const R2 = '33333333-3333-4333-8333-333333333333';
const RUN = '44444444-4444-4444-8444-444444444444';
const CONFIG = '55555555-5555-4555-8555-555555555555';
const SECRET_MODEL = 'fake:ok';
const [I1, I2, I3, I4, I5] = ['a', 'b', 'c', 'd', 'e'].map((c) => `${c.repeat(8)}-${c.repeat(4)}-4${c.repeat(3)}-8${c.repeat(3)}-${c.repeat(12)}`);
const CRITERIA = [{ code: 'single_answer', question: 'Q1' }, { code: 'natural', question: 'Q2' }];
const IN = { word: 'deploy', part_of_speech: 'verb', level: 'B1', meaning_vi: 'triển khai', context_label: null };
const OUT = { sentence: 'We ___ it.', accepted_answers: ['deploy'], translation_vi: 'x' };
const MODEL = { id: 'm1', provider: 'fake', modelId: SECRET_MODEL, thinkingOff: null, maxOutputTokens: 4096, priceInput: 1, priceCachedInput: null, priceOutput: 2 };

const itemRow = (id: string, position: number, over: Partial<PassItemRow> = {}): PassItemRow => ({
  id, position, subjectKind: 'eval_item', subjectId: `subject-${id}`, input: IN, output: OUT, context: null, ...over,
});

function setup(init: { items?: PassItemRow[]; revision?: Partial<RevisionToRun>; pass?: PassToRun | null } = {}) {
  const pass: PassToRun | null = init.pass === undefined
    ? { id: PASS, judgeRevisionId: R2, operation: 'generate_cloze', startedBy: ADMIN } : init.pass;
  const revision: RevisionToRun = {
    id: R2, revision: 2, criteria: CRITERIA, instructions: 'Judge it.', examples: [], effort: 'low', thinking: null, maxOutputTokens: 700,
    model: MODEL, ...init.revision,
  };
  const items = init.items ?? [itemRow(I1, 0)];
  const repo = {
    start: vi.fn(async (_id: string, _now: Date) => pass),
    revisionOf: vi.fn(async (_id: string) => revision),
    pendingItems: vi.fn(async (_id: string) => items),
    isRunning: vi.fn(async (_id: string) => true),
    writeScores: vi.fn(async (..._args: unknown[]) => undefined),
    finish: vi.fn(async (_id: string, _now: Date) => undefined),
    fail: vi.fn(async (_id: string, _error: string, _now: Date) => undefined),
  };
  const answer = (input: ExecuteInput): RunReport => ({
    result: {
      status: 'succeeded', operation_id: (input as { callOperationId: string }).callOperationId,
      result: { codes: ['single_answer', 'natural'], verdicts: ['pass', 'fail_minor'], reasons: ['ok', 'a bit odd'] },
      meta: { operation: 'judge', provider: 'fake', model: SECRET_MODEL, effort: 'low', prompt_revision: 2, schema_version: 1, replayed: false },
    },
    calls: [
      { attempt: 1, outcome: 'provider-error', latency_ms: 30, cost_usd: null, http_status: 503, call_id: 'C0' },
      { attempt: 2, outcome: 'succeeded', latency_ms: 70, cost_usd: '0.00010000', http_status: null, call_id: 'C1' },
    ],
    rawOutput: '{}',
  });
  const runner = { execute: vi.fn(async (input: ExecuteInput) => answer(input)) };
  const logger = { warn: vi.fn(), info: vi.fn(), error: vi.fn() } as unknown as AppLogger;
  const job = new JudgeJob(new FakeClock(NOW), repo as never, runner as never, logger);
  return { job, repo, runner, answer };
}

const capReport = (input: ExecuteInput): RunReport => ({
  result: { status: 'unavailable', operation_id: (input as { callOperationId: string }).callOperationId, reason: 'admin-usd-cap' } as AiResult, calls: [], rawOutput: null,
});

describe('JudgeJob.run (D3, B13, B19)', () => {
  it('D3: the data of a call are exactly the five fields, the call id names the pass and the item, and the revision number is the prompt revision', async () => {
    const ctx = setup({ items: [itemRow(I1, 0)] });
    await ctx.job.run(PASS);
    expect(ctx.runner.execute).toHaveBeenCalledTimes(1);
    const sent = ctx.runner.execute.mock.calls[0]![0] as Extract<ExecuteInput, { purpose: 'judge' }>;
    expect(sent.data).toEqual({ target_operation: 'generate_cloze', input: IN, output: OUT, criteria: CRITERIA, context: null });
    expect(sent).toMatchObject({
      purpose: 'judge', operation: 'judge', actorId: ADMIN, callOperationId: `judge-${PASS}-${I1}`,
      prompt: { instructions: 'Judge it.', examples: [], revision: 2 },
      selection: { operation: 'judge', provider: 'fake', modelId: SECRET_MODEL, effort: 'low', maxOutputTokens: 700, price: { input: 1, cachedInput: null, output: 2 } },
    });
  });

  it('D3: apart from `selection` nothing the runner is given names the run, its config or the model', async () => {
    const ctx = setup({ items: [itemRow(I1, 0, { subjectId: I2 })] });
    await ctx.job.run(PASS);
    const { selection: _selection, ...rest } = ctx.runner.execute.mock.calls[0]![0] as Record<string, unknown>;
    const text = JSON.stringify(rest);
    for (const secret of [RUN, CONFIG, SECRET_MODEL, 'claude', 'anthropic', 'openai']) expect(text).not.toContain(secret);
    // The data a judge sees are the only thing that reaches a provider.
    expect(Object.keys((rest.data as Record<string, unknown>)).sort()).toEqual(['context', 'criteria', 'input', 'output', 'target_operation']);
  });

  it('the session words of a real question are handed over as context, and nothing else of the subject', async () => {
    const ctx = setup({ items: [itemRow(I1, 0, { subjectKind: 'real_question', context: { session_words: ['alpha', 'beta'] } })] });
    await ctx.job.run(PASS);
    expect((ctx.runner.execute.mock.calls[0]![0] as { data: { context: unknown } }).data.context).toEqual({ session_words: ['alpha', 'beta'] });
  });

  it("each item's scores are written with the rows of scoresFromOutput, the last call's id and the summed known cost; then the pass finishes", async () => {
    const ctx = setup({ items: [itemRow(I1, 0), itemRow(I2, 1)] });
    await ctx.job.run(PASS);
    const rows = scoresFromOutput(CRITERIA, { codes: ['single_answer', 'natural'], verdicts: ['pass', 'fail_minor'], reasons: ['ok', 'a bit odd'] }, null);
    expect(ctx.repo.writeScores).toHaveBeenCalledTimes(2);
    expect(ctx.repo.writeScores).toHaveBeenCalledWith(
      { id: PASS, judgeRevisionId: R2 }, { id: I1, subjectKind: 'eval_item', subjectId: `subject-${I1}` }, rows, 'C1', '0.00010000', NOW,
    );
    expect(ctx.repo.finish).toHaveBeenCalledExactlyOnceWith(PASS, NOW);
    expect(ctx.repo.fail).not.toHaveBeenCalled();
  });

  it('B13: a call that failed gives every criterion no verdict, with the failure as the problem; the item is still written (and counts as judged)', async () => {
    const ctx = setup();
    ctx.runner.execute.mockImplementation(async (input: ExecuteInput) => ({
      result: { status: 'transient_failure', operation_id: (input as { callOperationId: string }).callOperationId, reason: 'invalid-shape' } as AiResult,
      calls: [{ attempt: 1, outcome: 'invalid-shape', latency_ms: 30, cost_usd: '0.00002000', http_status: null, call_id: 'C9' }], rawOutput: 'x',
    }));
    await ctx.job.run(PASS);
    expect(ctx.repo.writeScores).toHaveBeenCalledWith(
      expect.anything(), expect.anything(), scoresFromOutput(CRITERIA, null, 'invalid-shape'), 'C9', '0.00002000', NOW,
    );
    expect(ctx.repo.finish).toHaveBeenCalledTimes(1);
  });

  it('B19: the second item stops at the usd cap: the pass fails with admin-usd-cap, the item is not written, the first stays, no later call starts', async () => {
    const ctx = setup({ items: [itemRow(I1, 0), itemRow(I2, 1), itemRow(I3, 2), itemRow(I4, 3), itemRow(I5, 4)] });
    let calls = 0;
    ctx.runner.execute.mockImplementation(async (input: ExecuteInput) => {
      calls += 1;
      return calls === 2 ? capReport(input) : ctx.answer(input);
    });
    await ctx.job.run(PASS);
    expect(ctx.runner.execute).toHaveBeenCalledTimes(3);
    const written = ctx.repo.writeScores.mock.calls.map((call) => (call[1] as { id: string }).id);
    expect(written).toEqual([I1, I3]);
    expect(ctx.repo.fail).toHaveBeenCalledExactlyOnceWith(PASS, 'admin-usd-cap', NOW);
    expect(ctx.repo.finish).not.toHaveBeenCalled();
  });

  it('a model without a price → the pass fails with model-price-missing and no call is made', async () => {
    const ctx = setup({ revision: { model: { ...MODEL, priceOutput: null } } });
    await ctx.job.run(PASS);
    expect(ctx.repo.fail).toHaveBeenCalledExactlyOnceWith(PASS, 'model-price-missing', NOW);
    expect(ctx.runner.execute).not.toHaveBeenCalled();
    expect(ctx.repo.finish).not.toHaveBeenCalled();
  });

  it('a revision whose model is gone → the pass fails with model-not-set', async () => {
    const ctx = setup({ revision: { model: null } });
    await ctx.job.run(PASS);
    expect(ctx.repo.fail).toHaveBeenCalledExactlyOnceWith(PASS, 'model-not-set', NOW);
    expect(ctx.runner.execute).not.toHaveBeenCalled();
  });

  it('start gives nothing (a pass that is not queued or running, or has no snapshot yet) → nothing else happens', async () => {
    const ctx = setup({ pass: null });
    await ctx.job.run(PASS);
    expect(ctx.repo.revisionOf).not.toHaveBeenCalled();
    expect(ctx.repo.pendingItems).not.toHaveBeenCalled();
    expect(ctx.runner.execute).not.toHaveBeenCalled();
    expect(ctx.repo.finish).not.toHaveBeenCalled();
    expect(ctx.repo.fail).not.toHaveBeenCalled();
  });

  it('a pass cancelled or closed as stalled meanwhile is no longer running: no further call, nothing written, no finish', async () => {
    const ctx = setup({ items: [itemRow(I1, 0), itemRow(I2, 1), itemRow(I3, 2), itemRow(I4, 3)] });
    ctx.repo.isRunning.mockResolvedValue(false);
    await ctx.job.run(PASS);
    expect(ctx.runner.execute).not.toHaveBeenCalled();
    expect(ctx.repo.writeScores).not.toHaveBeenCalled();
    expect(ctx.repo.finish).not.toHaveBeenCalled();
  });

  it('an error inside the job (a database failure) fails the pass with the error name only, never its message', async () => {
    const ctx = setup();
    ctx.repo.pendingItems.mockRejectedValue(Object.assign(new Error('connection to secret-host refused'), { code: 'ECONNREFUSED' }));
    await ctx.job.run(PASS);
    expect(ctx.repo.fail).toHaveBeenCalledExactlyOnceWith(PASS, 'Error ECONNREFUSED', NOW);
  });

  it('at most 3 calls run at once', async () => {
    const ctx = setup({ items: [I1, I2, I3, I4, I5].map((id, index) => itemRow(id, index)) });
    let live = 0;
    let peak = 0;
    ctx.runner.execute.mockImplementation(async (input: ExecuteInput) => {
      live += 1;
      peak = Math.max(peak, live);
      await new Promise((resolve) => { setTimeout(resolve, 5); });
      live -= 1;
      return ctx.answer(input);
    });
    await ctx.job.run(PASS);
    expect(peak).toBe(3);
    expect(ctx.repo.writeScores).toHaveBeenCalledTimes(5);
  });
});
