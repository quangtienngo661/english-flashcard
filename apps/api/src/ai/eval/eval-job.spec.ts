import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import type { AppLogger } from '../../common/logging/app-logger.js';
import type { AiResult } from '../ai.types.js';
import type { StoredPrompt } from '../prompts/prompts.repository.js';
import type { ExecuteInput, RunReport } from '../runner/runner.service.js';
import { EvalJob } from './eval-job.js';
import { EvalRulesRegistry, type EvalRules } from './eval-rules.port.js';
import type { EvalRunItemRow, EvalRunRow, ItemResult } from './eval-runs.repository.js';

const NOW = new Date('2026-10-20T03:00:00Z');
const ADMIN = '11111111-1111-4111-8111-111111111111';
const RUN = '22222222-2222-4222-8222-222222222222';
const [EX1, EX2, EX3, EX4, EX5] = ['a', 'b', 'c', 'd', 'e'].map((c) => `${c.repeat(8)}-${c.repeat(4)}-4${c.repeat(3)}-8${c.repeat(3)}-${c.repeat(12)}`);
const itemId = (exampleId: string) => `item-${exampleId}`;
const INPUT = (word: string) => ({ word, part_of_speech: 'verb', level: 'B1', meaning_vi: 'nghĩa', context_label: null });
const PROMPT: StoredPrompt = { instructions: 'Write one sentence.', examples: [], revision: 3 };

function runRow(over: Partial<EvalRunRow> = {}): EvalRunRow {
  return {
    id: RUN, operation: 'generate_cloze', provider: 'fake', model: 'fake:ok', effort: null, thinking: null, maxOutputTokens: null,
    promptRevision: 3, draft: null, status: 'queued', total: 3, startedBy: ADMIN,
    startedAt: null, heartbeatAt: null, finishedAt: null, error: null, validCount: 0, avgLatencyMs: null, costUsd: null,
    costUnknownCount: 0, setId: null, priceInput: 1, priceCachedInput: null, priceOutput: 2, legacy: false, configId: null, configVersion: null, ...over,
  };
}

function pendingItem(exampleId: string, position: number, over: Partial<EvalRunItemRow> = {}): EvalRunItemRow {
  return {
    id: itemId(exampleId), runId: RUN, exampleId, position, split: 'dev', input: INPUT(exampleId), expected: null, status: 'pending', reason: null,
    output: null, rawOutput: null, rule: null, expectedResult: null, latencyMs: null, costUsd: null, ...over,
  };
}

const pendingItems = (ids: string[]) => ids.map((id, index) => pendingItem(id, index));

/** In-memory `ai_eval_runs` and `ai_eval_run_items` applying the same conditions as the SQL statements. */
function memoryRepository(row: EvalRunRow, items: EvalRunItemRow[]) {
  return {
    row,
    items,
    start: vi.fn(async (id: string, now: Date) => {
      if (row.id !== id || !['queued', 'running'].includes(row.status)) return null;
      Object.assign(row, { status: 'running', startedAt: row.startedAt ?? now, heartbeatAt: now });
      return structuredClone(row);
    }),
    isRunning: vi.fn(async (id: string) => row.id === id && row.status === 'running'),
    configOf: vi.fn(async (_id: string): Promise<{ number: number; version: number; instructions: string; examples: unknown[] } | null> => null),
    pendingItems: vi.fn(async (id: string) =>
      items.filter((item) => item.runId === id && item.status === 'pending').sort((a, b) => a.position - b.position).map((item) => structuredClone(item))),
    completeItem: vi.fn(async (id: string, result: ItemResult, now: Date) => {
      const item = items.find((candidate) => candidate.id === id);
      if (!item || item.status !== 'pending' || row.status !== 'running') return;
      Object.assign(item, {
        status: result.status, reason: result.reason, output: result.output, rawOutput: result.raw_output, rule: result.rule,
        expectedResult: result.expected_result, latencyMs: result.latency_ms, costUsd: result.cost_usd,
      });
      row.heartbeatAt = now;
    }),
    finish: vi.fn(async (id: string, now: Date) => {
      if (row.id !== id || row.status !== 'running') return;
      const ran = items.filter((item) => item.status !== 'skipped');
      const latencies = items.flatMap((item) => (item.latencyMs === null ? [] : [item.latencyMs]));
      const costs = items.flatMap((item) => (item.costUsd === null ? [] : [Number(item.costUsd)]));
      Object.assign(row, {
        status: 'finished', finishedAt: now, heartbeatAt: now,
        validCount: items.filter((item) => item.status === 'succeeded').length,
        avgLatencyMs: latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : null,
        costUsd: costs.reduce((a, b) => a + b, 0).toFixed(8),
        costUnknownCount: ran.filter((item) => item.costUsd === null).length,
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

function stubRules(over: Partial<EvalRules> = {}): EvalRules {
  return {
    check: vi.fn(async () => ({ status: 'pass' as const, problems: [], reason: null })),
    formsOf: vi.fn(async () => null),
    matchesExpected: vi.fn(() => true),
    ...over,
  };
}

function setup(row = runRow(), items = pendingItems([EX1, EX2, EX3]), rules: EvalRules | null = null) {
  const repo = memoryRepository(row, items);
  const runner = { execute: vi.fn(async (input: ExecuteInput) => succeeded(input)) };
  const prompts = { atRevision: vi.fn(async () => PROMPT) };
  const logger = { warn: vi.fn(), info: vi.fn(), error: vi.fn() } as unknown as AppLogger;
  const registry = new EvalRulesRegistry();
  if (rules) registry.register(rules);
  const job = new EvalJob(new FakeClock(NOW), repo as never, runner as never, prompts as never, registry, logger);
  return { job, repo, runner, prompts, rules };
}

const callIds = (ctx: ReturnType<typeof setup>) => ctx.runner.execute.mock.calls.map(([input]) => (input as { callOperationId: string }).callOperationId);

describe('EvalJob.run', () => {
  let ctx: ReturnType<typeof setup>;
  beforeEach(() => { ctx = setup(); });

  it('B6#17: three examples → finished with total 3, valid count, average latency, cost', async () => {
    await ctx.job.run(RUN);
    expect(ctx.repo.row).toMatchObject({ status: 'finished', total: 3, validCount: 3, avgLatencyMs: 100, costUsd: '0.00030000' });
    expect(ctx.repo.items.map((item) => item.exampleId)).toEqual([EX1, EX2, EX3]);
    expect(ctx.repo.items[0]).toMatchObject({
      id: itemId(EX1), status: 'succeeded', reason: null, output: expect.objectContaining({ sentence: 'Lan will ___ it.' }),
      rawOutput: '{"sentence":"Lan will ___ it."}', latencyMs: 100, costUsd: '0.00010000',
    });
  });

  it('E1: each example runs from its snapshot, as an eval call with the run row selection, its stored price, the stored revision and a per-example id', async () => {
    ctx.repo.row.effort = 'low';
    ctx.repo.row.thinking = 'between_tools';
    ctx.repo.row.maxOutputTokens = 1200;
    await ctx.job.run(RUN);
    expect(ctx.prompts.atRevision).toHaveBeenCalledWith('generate_cloze', 3);
    expect(ctx.runner.execute).toHaveBeenCalledTimes(3);
    expect(ctx.runner.execute).toHaveBeenCalledWith({
      purpose: 'eval', operation: 'generate_cloze', data: INPUT(EX1), actorId: ADMIN, callOperationId: `eval-${RUN}-${EX1}`,
      selection: {
        operation: 'generate_cloze', modelRef: null, provider: 'fake', modelId: 'fake:ok', effort: 'low', thinking: 'between_tools',
        maxOutputTokens: 1200, price: { input: 1, cachedInput: null, output: 2 },
      },
      prompt: PROMPT,
    });
  });

  it('E1: the cached-input price of the run row is carried too', async () => {
    ctx = setup(runRow({ priceCachedInput: 0.1 }));
    await ctx.job.run(RUN);
    expect(ctx.runner.execute.mock.calls[0]![0]).toMatchObject({ selection: { price: { input: 1, cachedInput: 0.1, output: 2 } } });
  });

  it('a run created without a price (the model had none) → price null', async () => {
    ctx = setup(runRow({ priceInput: null, priceOutput: null }));
    await ctx.job.run(RUN);
    expect(ctx.runner.execute.mock.calls[0]![0]).toMatchObject({ selection: { price: null } });
  });

  it('a draft run uses the draft text with no revision', async () => {
    const draft = { instructions: 'Draft text.', examples: [] };
    ctx = setup(runRow({ promptRevision: null, draft }));
    await ctx.job.run(RUN);
    expect(ctx.prompts.atRevision).not.toHaveBeenCalled();
    expect(ctx.runner.execute.mock.calls[0]![0]).toMatchObject({ prompt: { instructions: 'Draft text.', examples: [], revision: null } });
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
    expect(ctx.repo.items.find((item) => item.exampleId === EX2)).toMatchObject({
      status: 'transient_failure', reason: 'rate-limited', output: null, rawOutput: null, latencyMs: 40, costUsd: null, rule: null, expectedResult: null,
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
    expect(ctx.repo.items[0]).toMatchObject({ latencyMs: 100, costUsd: null });
  });

  it('B6E93: an item already completed is not run again, and the summary counts it', async () => {
    const items = pendingItems([EX1, EX2, EX3]);
    Object.assign(items[0]!, { status: 'succeeded', output: {}, rawOutput: '{}', latencyMs: 200, costUsd: '0.00020000' });
    ctx = setup(runRow({ status: 'running', startedAt: new Date('2026-10-20T02:00:00Z') }), items);
    await ctx.job.run(RUN);
    expect(ctx.runner.execute).toHaveBeenCalledTimes(2);
    expect(callIds(ctx)).not.toContain(`eval-${RUN}-${EX1}`);
    expect(ctx.repo.row).toMatchObject({
      status: 'finished', validCount: 3, avgLatencyMs: 133, costUsd: '0.00040000', startedAt: new Date('2026-10-20T02:00:00Z'),
    });
  });

  it('E1: an example deleted from the working set after the run was created still runs from its snapshot', async () => {
    await ctx.job.run(RUN);
    expect(ctx.runner.execute).toHaveBeenCalledTimes(3);
    expect(ctx.repo.items.map((item) => item.status)).toEqual(['succeeded', 'succeeded', 'succeeded']);
  });

  it('a pending row whose snapshot has no input (an example deleted before the migration) → skipped, example-deleted, no call', async () => {
    const items = pendingItems([EX1, EX2, EX3]);
    items[1]!.input = null;
    ctx = setup(runRow(), items);
    await ctx.job.run(RUN);
    expect(ctx.runner.execute).toHaveBeenCalledTimes(2);
    expect(ctx.repo.items[1]).toMatchObject({ status: 'skipped', reason: 'example-deleted', output: null, rawOutput: null, latencyMs: null, costUsd: null });
    expect(ctx.repo.row).toMatchObject({ status: 'finished', validCount: 2, costUnknownCount: 0 });
  });

  it('at most 3 run at once', async () => {
    const ids = Array.from({ length: 7 }, (_, i) => `0000000${i}-0000-4000-8000-000000000000`);
    ctx = setup(runRow({ total: 7 }), pendingItems(ids));
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
    expect(ctx.repo.items.filter((item) => item.status === 'succeeded')).toHaveLength(7);
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
    ctx = setup(runRow({ total: 5 }), pendingItems(ids));
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
    expect(callIds(ctx)).not.toContain(`eval-${RUN}-${EX5}`);
    expect(ctx.repo.row).toMatchObject({ status: 'failed', error: 'cancelled', finishedAt: cancelledAt });
    expect(ctx.repo.items.filter((item) => item.status === 'succeeded').map((item) => item.exampleId)).toEqual([EX1]);
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
    expect(ctx.repo.row).toMatchObject({ status: 'failed', error: 'cancelled' });
    expect(ctx.repo.items.every((item) => item.status === 'pending')).toBe(true);
    expect(ctx.runner.execute).not.toHaveBeenCalled();
    expect(ctx.repo.finish).not.toHaveBeenCalled();
    expect(ctx.repo.fail).not.toHaveBeenCalled();
  });

  it('a run cancelled while still queued is never started: start finds it failed and the job returns', async () => {
    ctx = setup(runRow({ status: 'failed', error: 'cancelled', finishedAt: NOW }));
    await ctx.job.run(RUN);
    expect(ctx.repo.start).toHaveBeenCalledTimes(1);
    expect(ctx.repo.isRunning).not.toHaveBeenCalled();
    expect(ctx.repo.pendingItems).not.toHaveBeenCalled();
    expect(ctx.runner.execute).not.toHaveBeenCalled();
    expect(ctx.repo.row).toMatchObject({ status: 'failed', error: 'cancelled', startedAt: null });
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

  it('completeItem is called with the full result of the item, once per item', async () => {
    await ctx.job.run(RUN);
    expect(ctx.repo.completeItem).toHaveBeenCalledTimes(3);
    expect(ctx.repo.completeItem).toHaveBeenCalledWith(itemId(EX2), {
      status: 'succeeded', reason: null, output: { sentence: 'Lan will ___ it.', accepted_answers: ['x'], translation_vi: 'y' },
      raw_output: '{"sentence":"Lan will ___ it."}', latency_ms: 100, cost_usd: '0.00010000',
      rule: { status: 'skipped', problems: [], reason: 'no-rules' }, expected_result: null,
    }, NOW);
  });
});

describe('EvalJob.run on a config (M2-T4, design §6.5)', () => {
  const CONFIG = '55555555-5555-4555-8555-555555555555';
  const configRun = (over: Partial<EvalRunRow> = {}) => runRow({ promptRevision: null, configId: CONFIG, configVersion: 2, ...over });
  const stored = { number: 4, version: 2, instructions: 'Config text.', examples: [] as unknown[] };

  it('a config at the version the run tried → the prompt is the config text and the revision is the config number', async () => {
    const ctx = setup(configRun());
    ctx.repo.configOf.mockResolvedValue(stored);
    await ctx.job.run(RUN);
    expect(ctx.repo.configOf).toHaveBeenCalledExactlyOnceWith(CONFIG);
    expect(ctx.prompts.atRevision).not.toHaveBeenCalled();
    expect(ctx.runner.execute).toHaveBeenCalledTimes(3);
    expect(ctx.runner.execute.mock.calls[0]![0]).toMatchObject({ prompt: { instructions: 'Config text.', examples: [], revision: 4 } });
    expect(ctx.repo.row.status).toBe('finished');
  });

  it('Review focus 1: the draft saved again while the run was queued (version 3 ≠ 2) → failed config-changed, no provider call', async () => {
    const ctx = setup(configRun());
    ctx.repo.configOf.mockResolvedValue({ ...stored, version: 3 });
    await ctx.job.run(RUN);
    expect(ctx.repo.row).toMatchObject({ status: 'failed', error: 'config-changed' });
    expect(ctx.runner.execute).not.toHaveBeenCalled();
    expect(ctx.repo.completeItem).not.toHaveBeenCalled();
  });

  it('the draft deleted meanwhile → failed config-deleted, no provider call', async () => {
    const ctx = setup(configRun());
    await ctx.job.run(RUN);
    expect(ctx.repo.row).toMatchObject({ status: 'failed', error: 'config-deleted' });
    expect(ctx.runner.execute).not.toHaveBeenCalled();
  });

  it('a prompt run never reads a config', async () => {
    const ctx = setup();
    await ctx.job.run(RUN);
    expect(ctx.repo.configOf).not.toHaveBeenCalled();
  });
});

describe('EvalJob.run with the registered rules (E2, D11)', () => {
  const STORED_SKIPPED = { status: 'skipped', problems: [], reason: 'no-rules' };

  it('B9: a succeeded cloze gets the rule result and the expected result, from one runner call', async () => {
    const rules = stubRules();
    const items = pendingItems([EX1]);
    items[0]!.expected = { forms: ['x'] };
    const ctx = setup(runRow({ total: 1 }), items, rules);
    await ctx.job.run(RUN);
    expect(ctx.runner.execute).toHaveBeenCalledTimes(1);
    expect(rules.check).toHaveBeenCalledExactlyOnceWith('generate_cloze', INPUT(EX1), expect.objectContaining({ accepted_answers: ['x'] }));
    expect(rules.matchesExpected).toHaveBeenCalledExactlyOnceWith('generate_cloze', expect.objectContaining({ accepted_answers: ['x'] }), { forms: ['x'] });
    expect(ctx.repo.items[0]).toMatchObject({ rule: { status: 'pass', problems: [], reason: null }, expectedResult: 'pass' });
  });

  it('D11: a failing rule is stored as it is, and nothing is asked of the provider again', async () => {
    const rules = stubRules({
      check: vi.fn(async () => ({ status: 'fail' as const, problems: ['unknown-form:deployment'], reason: null })),
      matchesExpected: vi.fn(() => false),
    });
    const items = pendingItems([EX1]);
    items[0]!.expected = { forms: ['go'] };
    const ctx = setup(runRow({ total: 1 }), items, rules);
    await ctx.job.run(RUN);
    expect(ctx.runner.execute).toHaveBeenCalledTimes(1);
    expect(ctx.repo.items[0]).toMatchObject({ status: 'succeeded', rule: { status: 'fail', problems: ['unknown-form:deployment'] }, expectedResult: 'fail' });
  });

  it('a call that did not succeed → no rule, no expected result, the rules are not asked', async () => {
    const rules = stubRules();
    const ctx = setup(runRow({ total: 1 }), pendingItems([EX1]), rules);
    ctx.runner.execute.mockImplementation(async (input: ExecuteInput) => {
      const result: AiResult = { status: 'transient_failure', operation_id: (input as { callOperationId: string }).callOperationId, reason: 'timeout' };
      return { result, calls: [{ attempt: 1, outcome: 'timeout', latency_ms: 10, cost_usd: null, http_status: null }], rawOutput: null };
    });
    await ctx.job.run(RUN);
    expect(ctx.repo.items[0]).toMatchObject({ status: 'transient_failure', rule: null, expectedResult: null });
    expect(rules.check).not.toHaveBeenCalled();
    expect(rules.matchesExpected).not.toHaveBeenCalled();
  });

  it('lookup_word: the rule is not applicable, the expected answer is compared by the job itself', async () => {
    const rules = stubRules();
    const items = pendingItems([EX1]);
    items[0]!.expected = { lemma: 'run', part_of_speech: 'verb' };
    const ctx = setup(runRow({ operation: 'lookup_word', total: 1 }), items, rules);
    ctx.runner.execute.mockImplementation(async (input: ExecuteInput) => ({
      ...succeeded(input), result: { ...succeeded(input).result, result: { lemma: 'Run', part_of_speech: 'verb', meaning_vi: 'chạy' } } as AiResult,
    }));
    await ctx.job.run(RUN);
    expect(rules.check).not.toHaveBeenCalled();
    expect(ctx.repo.items[0]).toMatchObject({ rule: { status: 'not_applicable', problems: [], reason: null }, expectedResult: 'pass' });
  });

  it('Review focus 4: an example without an expected answer gets no expected result', async () => {
    const ctx = setup(runRow({ total: 1 }), pendingItems([EX1]), stubRules());
    await ctx.job.run(RUN);
    expect(ctx.repo.items[0]).toMatchObject({ rule: { status: 'pass' }, expectedResult: null });
  });

  it('B9: no rules registered → the cloze rule is skipped for no-rules and the forms cannot be checked', async () => {
    const items = pendingItems([EX1]);
    items[0]!.expected = { forms: ['x'] };
    const ctx = setup(runRow({ total: 1 }), items, null);
    await ctx.job.run(RUN);
    expect(ctx.repo.items[0]).toMatchObject({ rule: STORED_SKIPPED, expectedResult: null });
  });
});
