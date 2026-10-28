import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import type { AppLogger } from '../../common/logging/app-logger.js';
import type { AiResult } from '../ai.types.js';
import type { StoredPrompt } from '../prompts/prompts.repository.js';
import type { ExecuteInput, RunReport } from '../runner/runner.service.js';
import { EvalJob } from './eval-job.js';
import type { EvalItem, EvalRunRow } from './eval-runs.repository.js';

const NOW = new Date('2026-10-20T03:00:00Z');
const ADMIN = '11111111-1111-4111-8111-111111111111';
const RUN = '22222222-2222-4222-8222-222222222222';
const [EX1, EX2, EX3, EX4, EX5] = ['a', 'b', 'c', 'd', 'e'].map((c) => `${c.repeat(8)}-${c.repeat(4)}-4${c.repeat(3)}-8${c.repeat(3)}-${c.repeat(12)}`);
const INPUT = (word: string) => ({ word, part_of_speech: 'verb', level: 'B1', meaning_vi: 'nghĩa', context_label: null });
const PROMPT: StoredPrompt = { instructions: 'Write one sentence.', examples: [], revision: 3 };

function runRow(over: Partial<EvalRunRow> = {}): EvalRunRow {
  return {
    id: RUN, operation: 'generate_cloze', provider: 'fake', model: 'fake:ok', effort: null, thinking: null, maxOutputTokens: null,
    promptRevision: 3, draft: null, exampleIds: [EX1, EX2, EX3], status: 'queued', total: 3, items: [], startedBy: ADMIN,
    startedAt: null, heartbeatAt: null, finishedAt: null, error: null, validCount: 0, avgLatencyMs: null, costUsd: null,
    costUnknownCount: 0, ...over,
  };
}

/** In-memory `ai_eval_runs` applying the same conditions as the SQL statements. */
function memoryRepository(row: EvalRunRow) {
  return {
    row,
    start: vi.fn(async (id: string, now: Date) => {
      if (row.id !== id || !['queued', 'running'].includes(row.status)) return null;
      Object.assign(row, { status: 'running', startedAt: row.startedAt ?? now, heartbeatAt: now });
      return structuredClone(row);
    }),
    isRunning: vi.fn(async (id: string) => row.id === id && row.status === 'running'),
    appendItem: vi.fn(async (id: string, item: EvalItem, now: Date) => {
      if (row.id === id && row.status === 'running') Object.assign(row, { items: [...row.items, item], heartbeatAt: now });
    }),
    finish: vi.fn(async (id: string, now: Date) => {
      if (row.id !== id || row.status !== 'running') return;
      const ran = row.items.filter((item) => item.status !== 'skipped');
      const latencies = row.items.flatMap((item) => (item.latency_ms === null ? [] : [item.latency_ms]));
      const costs = row.items.flatMap((item) => (item.cost_usd === null ? [] : [Number(item.cost_usd)]));
      Object.assign(row, {
        status: 'finished', finishedAt: now, heartbeatAt: now,
        validCount: row.items.filter((item) => item.status === 'succeeded').length,
        avgLatencyMs: latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : null,
        costUsd: costs.reduce((a, b) => a + b, 0).toFixed(8),
        costUnknownCount: ran.filter((item) => item.cost_usd === null).length,
      });
    }),
    fail: vi.fn(async (id: string, error: string, now: Date) => {
      if (row.id === id && row.status === 'running') Object.assign(row, { status: 'failed', error, finishedAt: now });
    }),
  };
}

const succeeded = (input: ExecuteInput): RunReport => ({
  result: {
    status: 'succeeded', operation_id: (input as { callOperationId: string }).callOperationId,
    result: { sentence: 'Lan will ___ it.', accepted_answers: ['x'], translation_vi: 'y' },
    meta: { operation: 'generate_cloze', provider: 'fake', model: 'fake:ok', effort: null, prompt_revision: 3, schema_version: 1, replayed: false },
  },
  calls: [{ attempt: 1, outcome: 'succeeded', latency_ms: 100, cost_usd: '0.00010000', http_status: null }],
  rawOutput: '{"sentence":"Lan will ___ it."}',
});

function setup(row = runRow(), examples = [EX1, EX2, EX3, EX4]) {
  const repo = memoryRepository(row);
  const runner = { execute: vi.fn(async (input: ExecuteInput) => succeeded(input)) };
  const prisma = {
    aiEvalExample: {
      findMany: vi.fn(async ({ where }: { where: { id: { in: string[] } } }) =>
        examples.filter((id) => where.id.in.includes(id)).map((id) => ({ id, operation: 'generate_cloze', input: INPUT(id) }))),
    },
    aiModel: { findUnique: vi.fn(async () => ({ priceInput: 1, priceCachedInput: null, priceOutput: 2 })) },
  };
  const prompts = { atRevision: vi.fn(async () => PROMPT) };
  const logger = { warn: vi.fn(), info: vi.fn(), error: vi.fn() } as unknown as AppLogger;
  const job = new EvalJob(prisma as never, new FakeClock(NOW), repo as never, runner as never, prompts as never, logger);
  return { job, repo, runner, prisma, prompts };
}

describe('EvalJob.run', () => {
  let ctx: ReturnType<typeof setup>;
  beforeEach(() => { ctx = setup(); });

  it('B6#17: three examples → finished with total 3, valid count, average latency, cost', async () => {
    await ctx.job.run(RUN);
    expect(ctx.repo.row).toMatchObject({ status: 'finished', total: 3, validCount: 3, avgLatencyMs: 100, costUsd: '0.00030000' });
    expect(ctx.repo.row.items.map((item) => item.example_id)).toEqual([EX1, EX2, EX3]);
    expect(ctx.repo.row.items[0]).toEqual({
      example_id: EX1, status: 'succeeded', reason: null, output: expect.objectContaining({ sentence: 'Lan will ___ it.' }),
      raw_output: '{"sentence":"Lan will ___ it."}', latency_ms: 100, cost_usd: '0.00010000',
    });
  });

  it('each example runs as an eval call with the run row selection, the stored revision and a per-example id', async () => {
    ctx.repo.row.effort = 'low';
    ctx.repo.row.thinking = 'between_tools';
    ctx.repo.row.maxOutputTokens = 1200;
    await ctx.job.run(RUN);
    expect(ctx.prompts.atRevision).toHaveBeenCalledWith('generate_cloze', 3);
    expect(ctx.runner.execute).toHaveBeenCalledWith({
      purpose: 'eval', operation: 'generate_cloze', data: INPUT(EX1), actorId: ADMIN, callOperationId: `eval-${RUN}-${EX1}`,
      selection: {
        operation: 'generate_cloze', modelRef: null, provider: 'fake', modelId: 'fake:ok', effort: 'low', thinking: 'between_tools',
        maxOutputTokens: 1200, price: { input: 1, cachedInput: null, output: 2 },
      },
      prompt: PROMPT,
    });
  });

  it('a draft run uses the draft text with no revision', async () => {
    const draft = { instructions: 'Draft text.', examples: [] };
    ctx = setup(runRow({ promptRevision: null, draft }));
    await ctx.job.run(RUN);
    expect(ctx.prompts.atRevision).not.toHaveBeenCalled();
    expect(ctx.runner.execute.mock.calls[0]![0]).toMatchObject({ prompt: { instructions: 'Draft text.', examples: [], revision: null } });
  });

  it('a model removed since the run was created → price null', async () => {
    ctx.prisma.aiModel.findUnique.mockResolvedValue(null as never);
    await ctx.job.run(RUN);
    expect(ctx.runner.execute.mock.calls[0]![0]).toMatchObject({ selection: { price: null } });
  });

  it('B6E72: one example\'s adapter error → its item carries the reason, the others run, finished', async () => {
    ctx.runner.execute.mockImplementation(async (input: ExecuteInput) => {
      const id = (input as { callOperationId: string }).callOperationId;
      if (!id.endsWith(EX2)) return succeeded(input);
      const result: AiResult = { status: 'transient_failure', operation_id: id, reason: 'rate-limited' };
      return { result, calls: [{ attempt: 1, outcome: 'rate-limited', latency_ms: 40, cost_usd: null, http_status: 429 }], rawOutput: null };
    });
    await ctx.job.run(RUN);
    expect(ctx.repo.row.status).toBe('finished');
    expect(ctx.repo.row.items.find((item) => item.example_id === EX2)).toEqual({
      example_id: EX2, status: 'transient_failure', reason: 'rate-limited', output: null, raw_output: null, latency_ms: 40, cost_usd: null,
    });
    expect(ctx.repo.row).toMatchObject({ validCount: 2, costUnknownCount: 1 });
  });

  it('an item\'s latency is the sum of its attempts; one call of unknown cost makes the item\'s cost unknown', async () => {
    ctx.runner.execute.mockImplementation(async (input: ExecuteInput) => ({
      ...succeeded(input),
      calls: [
        { attempt: 1, outcome: 'provider-error', latency_ms: 30, cost_usd: null, http_status: 503 },
        { attempt: 2, outcome: 'succeeded', latency_ms: 70, cost_usd: '0.00010000', http_status: null },
      ],
    }));
    await ctx.job.run(RUN);
    expect(ctx.repo.row.items[0]).toMatchObject({ latency_ms: 100, cost_usd: null });
  });

  it('B6E93: items already hold example X → X is not run again, and the summary counts X', async () => {
    const earlier: EvalItem = {
      example_id: EX1, status: 'succeeded', reason: null, output: {}, raw_output: '{}', latency_ms: 200, cost_usd: '0.00020000',
    };
    ctx = setup(runRow({ status: 'running', items: [earlier], startedAt: new Date('2026-10-20T02:00:00Z') }));
    await ctx.job.run(RUN);
    expect(ctx.runner.execute).toHaveBeenCalledTimes(2);
    expect(ctx.runner.execute.mock.calls.map(([input]) => (input as { callOperationId: string }).callOperationId))
      .not.toContain(`eval-${RUN}-${EX1}`);
    expect(ctx.repo.row).toMatchObject({
      status: 'finished', validCount: 3, avgLatencyMs: 133, costUsd: '0.00040000', startedAt: new Date('2026-10-20T02:00:00Z'),
    });
  });

  it('an example added after create is not run; one deleted since → item example-deleted', async () => {
    ctx = setup(runRow(), [EX1, EX3, EX4]);
    await ctx.job.run(RUN);
    expect(ctx.runner.execute).toHaveBeenCalledTimes(2);
    expect(ctx.runner.execute.mock.calls.map(([input]) => (input as { data: { word: string } }).data.word)).not.toContain(EX4);
    expect(ctx.repo.row.items.find((item) => item.example_id === EX2)).toEqual({
      example_id: EX2, status: 'skipped', reason: 'example-deleted', output: null, raw_output: null, latency_ms: null, cost_usd: null,
    });
    expect(ctx.repo.row).toMatchObject({ status: 'finished', validCount: 2, costUnknownCount: 0 });
  });

  it('at most 3 run at once', async () => {
    const ids = Array.from({ length: 7 }, (_, i) => `0000000${i}-0000-4000-8000-000000000000`);
    ctx = setup(runRow({ exampleIds: ids, total: 7 }), ids);
    let running = 0;
    let peak = 0;
    ctx.runner.execute.mockImplementation(async (input: ExecuteInput) => {
      running += 1;
      peak = Math.max(peak, running);
      await new Promise((resolve) => setTimeout(resolve, 5));
      running -= 1;
      return succeeded(input);
    });
    await ctx.job.run(RUN);
    expect(peak).toBe(3);
    expect(ctx.repo.row.items).toHaveLength(7);
  });

  it('a finished run → no-op', async () => {
    ctx = setup(runRow({ status: 'finished' }));
    await ctx.job.run(RUN);
    expect(ctx.runner.execute).not.toHaveBeenCalled();
    expect(ctx.repo.finish).not.toHaveBeenCalled();
  });

  it('the run is checked before every paid call, not once for the whole run', async () => {
    await ctx.job.run(RUN);
    expect(ctx.repo.isRunning).toHaveBeenCalledTimes(3);
    expect(ctx.repo.isRunning).toHaveBeenCalledWith(RUN);
    ctx.runner.execute.mock.invocationCallOrder.forEach((order, index) => {
      expect(ctx.repo.isRunning.mock.invocationCallOrder[index]!).toBeLessThan(order);
    });
  });

  it('a run cancelled while it is running → no new provider call after that, results still in flight are not stored, it is never finished', async () => {
    const ids = [EX1, EX2, EX3, EX4, EX5];
    ctx = setup(runRow({ exampleIds: ids, total: 5 }), ids);
    const cancelledAt = new Date('2026-10-20T03:05:00Z');
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    let calls = 0;
    ctx.runner.execute.mockImplementation(async (input: ExecuteInput) => {
      calls += 1;
      if (calls === 1) return succeeded(input); // example 1 is done at once and stored
      if (calls === 4) { // the cancel arrives during the fourth call; calls 2 and 3 are still in flight
        Object.assign(ctx.repo.row, { status: 'failed', error: 'cancelled', finishedAt: cancelledAt });
        release();
        return succeeded(input);
      }
      await gate;
      return succeeded(input);
    });
    await ctx.job.run(RUN);
    expect(ctx.runner.execute).toHaveBeenCalledTimes(4);
    expect(ctx.runner.execute.mock.calls.map(([input]) => (input as { callOperationId: string }).callOperationId))
      .not.toContain(`eval-${RUN}-${EX5}`);
    expect(ctx.repo.row).toMatchObject({ status: 'failed', error: 'cancelled', finishedAt: cancelledAt });
    expect(ctx.repo.row.items.map((item) => item.example_id)).toEqual([EX1]);
    expect(ctx.repo.finish).not.toHaveBeenCalled();
    expect(ctx.repo.fail).not.toHaveBeenCalled();
  });

  it('a run cancelled just after it started, before its first call → nothing is called and nothing is written', async () => {
    const start = ctx.repo.start.getMockImplementation()!;
    ctx.repo.start.mockImplementation(async (id: string, now: Date) => {
      const started = await start(id, now);
      Object.assign(ctx.repo.row, { status: 'failed', error: 'cancelled', finishedAt: now });
      return started;
    });
    await ctx.job.run(RUN);
    expect(ctx.repo.row).toMatchObject({ status: 'failed', error: 'cancelled', items: [] });
    expect(ctx.runner.execute).not.toHaveBeenCalled();
    expect(ctx.repo.appendItem).not.toHaveBeenCalled();
    expect(ctx.repo.finish).not.toHaveBeenCalled();
    expect(ctx.repo.fail).not.toHaveBeenCalled();
  });

  it('a run cancelled while still queued is never started: start finds it failed and the job returns', async () => {
    ctx = setup(runRow({ status: 'failed', error: 'cancelled', finishedAt: NOW }));
    await ctx.job.run(RUN);
    expect(ctx.repo.start).toHaveBeenCalledTimes(1);
    expect(ctx.repo.isRunning).not.toHaveBeenCalled();
    expect(ctx.runner.execute).not.toHaveBeenCalled();
    expect(ctx.prisma.aiEvalExample.findMany).not.toHaveBeenCalled();
    expect(ctx.repo.row).toMatchObject({ status: 'failed', error: 'cancelled', items: [], startedAt: null });
  });

  it('the status check itself failing → the run is failed with the error name, like any other throw', async () => {
    ctx.repo.isRunning.mockRejectedValue(new Error('connection lost with a secret in it'));
    await ctx.job.run(RUN);
    expect(ctx.runner.execute).not.toHaveBeenCalled();
    expect(ctx.repo.row).toMatchObject({ status: 'failed', error: 'Error' });
  });

  it('a throw → failed with a one-line error that carries no content', async () => {
    ctx.runner.execute.mockRejectedValue(new Error('boom\nwith the learner sentence inside'));
    await ctx.job.run(RUN);
    expect(ctx.repo.row.status).toBe('failed');
    expect(ctx.repo.row.error).toBe('Error');
  });

  it('a stored revision that no longer exists → failed with that reason', async () => {
    ctx.prompts.atRevision.mockResolvedValue(null as never);
    await ctx.job.run(RUN);
    expect(ctx.repo.row).toMatchObject({ status: 'failed', error: 'prompt revision 3 not found' });
    expect(ctx.runner.execute).not.toHaveBeenCalled();
  });
});
