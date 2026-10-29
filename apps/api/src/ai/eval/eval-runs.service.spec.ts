import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { Selection } from '../runner/selection.js';
import { AI_SYSTEM_ACTOR_ID } from '../ai.constants.js';
import { AdminSpend } from '../runner/admin-spend.service.js';
import { EvalRunsService } from './eval-runs.service.js';

const ADMIN = '11111111-1111-4111-8111-111111111111';
const SELECTION: Selection = {
  operation: 'generate_cloze', modelRef: randomUUID(), provider: 'fake', modelId: 'fake:ok', effort: null, thinking: 'disabled',
  maxOutputTokens: 4096, price: { input: 1, cachedInput: null, output: 2 },
};
const NOW = new Date('2026-10-28T03:00:00Z');
const JUDGE = '66666666-6666-4666-8666-666666666666';
const JUDGE_REVISION = '77777777-7777-4777-8777-777777777777';
const [EX1, EX2] = [randomUUID(), randomUUID()];
const EXAMPLE_INPUT = { word: 'deploy', part_of_speech: 'verb', level: 'B1', meaning_vi: 'triển khai', context_label: null };
const IN1 = { word: 'one' };
const IN2 = { word: 'two' };

/** The live config every run of "the current prompt" now resolves to (nhóm B M2). */
const LIVE_MODEL = { id: randomUUID(), provider: 'fake', modelId: 'fake:ok', thinkingOff: 'disabled', maxOutputTokens: 4096, priceInput: 1, priceCachedInput: null, priceOutput: 2 };
const LIVE_CONFIG = {
  id: randomUUID(), operation: 'generate_cloze', number: 4, version: 0, instructions: 'x', examples: [], modelRef: LIVE_MODEL.id, effort: null, thinking: 'off',
  maxOutputTokens: 4096, status: 'published', model: LIVE_MODEL,
};

/** The real AdminSpend over a stub ledger and settings: the cap and the day's spend are the test's to set (nhóm B M3). */
function spendOf(state: { spent: number; cap: number | null }) {
  return new AdminSpend(
    { get: async () => ({ ai: { adminDailyUsdCap: state.cap } }) } as never,
    { adminSpentToday: async () => state.spent } as never,
  );
}

const JUDGE_PASS = '88888888-8888-4888-8888-888888888888';

function setup() {
  const spend = { spent: 0, cap: 2 as number | null };
  const created: Array<Record<string, unknown>> = [];
  // The run and its items are written through the transaction client, never through the shared one.
  const tx = {
    aiEvalRun: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: randomUUID(), ...data };
        created.push(row);
        return row;
      }),
    },
    aiEvalRunItem: { createMany: vi.fn(async (_args: { data: Array<Record<string, unknown>> }) => ({ count: 0 })) },
    aiJudgePass: { create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: JUDGE_PASS, ...data })) },
  };
  const prisma = {
    aiEvalExample: {
      findMany: vi.fn(async () => [{ id: EX1, split: 'dev', input: IN1, expected: null }, { id: EX2, split: 'dev', input: IN2, expected: null }]),
    },
    aiEvalRun: {
      create: vi.fn(),
      findUnique: vi.fn(async (_args?: unknown): Promise<Record<string, unknown> | null> => null),
      findMany: vi.fn(async (): Promise<Array<Record<string, unknown>>> => []),
      updateMany: vi.fn(async (): Promise<{ count: number }> => ({ count: 0 })),
      deleteMany: vi.fn(async (): Promise<{ count: number }> => ({ count: 0 })),
    },
    aiEvalRunItem: {
      updateMany: vi.fn(async (_args?: unknown) => ({ count: 0 })),
      findMany: vi.fn(async (_args?: unknown): Promise<Array<Record<string, unknown>>> => []),
      groupBy: vi.fn(async (_args?: unknown): Promise<Array<{ runId: string; status: string; _count: { _all: number } }>> => []),
    },
    aiEvalSet: {
      findUnique: vi.fn(async (_args?: unknown): Promise<Record<string, unknown> | null> => null),
      findMany: vi.fn(async (_args?: unknown): Promise<Array<{ id: string; version: number }>> => []),
    },
    aiEvalSetItem: { findMany: vi.fn(async (_args?: unknown): Promise<Array<Record<string, unknown>>> => []) },
    aiConfig: {
      findFirst: vi.fn(async (_args?: unknown): Promise<Record<string, unknown> | null> => null),
      findUnique: vi.fn(async (_args?: unknown): Promise<Record<string, unknown> | null> => LIVE_CONFIG),
      findMany: vi.fn(async (_args?: unknown): Promise<Array<{ id: string; number: number }>> => []),
    },
    aiLiveConfig: { findUnique: vi.fn(async (_args?: unknown): Promise<Record<string, unknown> | null> => ({ operation: 'generate_cloze', configId: LIVE_CONFIG.id, version: 7 })) },
    aiConfigEvent: { findFirst: vi.fn(async (_args?: unknown): Promise<Record<string, unknown> | null> => null) },
    aiCall: { deleteMany: vi.fn(async () => ({ count: 0 })) },
    aiJudgePass: {
      updateMany: vi.fn(async (_args?: unknown) => ({ count: 0 })),
      findFirst: vi.fn(async (_args?: unknown): Promise<Record<string, unknown> | null> => null),
      findMany: vi.fn(async (_args?: unknown): Promise<Array<{ id: string }>> => []),
    },
    aiLabel: { count: vi.fn(async (_args?: unknown) => 0) },
    $executeRaw: vi.fn(async () => 0),
    $transaction: vi.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)),
  };
  const selections = { load: vi.fn(async (): Promise<Selection | null> => SELECTION) };
  const registry = { get: vi.fn((provider: string) => (provider === 'fake' ? {} : undefined)) };
  const queue = { enqueue: vi.fn(async () => true) };
  const emailsOf = vi.fn(async (ids: string[]) => new Map(ids.filter((id) => id === ADMIN).map((id) => [id, 'admin@x.test'])));
  const limiter = { hit: vi.fn(async (): Promise<void> => undefined) };
  const judgeScores = {
    byRun: vi.fn(async (_runId: string): Promise<Array<Record<string, unknown>>> => []),
    labelsOf: vi.fn(async (_kind: string, _ids: string[]): Promise<Map<string, unknown[]>> => new Map()),
  };
  const agreement = { forRevisions: vi.fn(async (_ids: string[]): Promise<Map<string, unknown>> => new Map()) };
  const judgePasses = {
    views: vi.fn(async (_ids: string[]): Promise<unknown[]> => []),
    startable: vi.fn(async (_judge: string, _op: string, _now: Date) => ({
      judgeId: JUDGE, judgeRevisionId: JUDGE_REVISION, revision: 2, operation: 'generate_cloze', selection: SELECTION,
    })),
  };
  const service = new EvalRunsService(
    prisma as never, selections as never, registry as never, queue as never, { emailsOf } as never,
    limiter as never, new FakeClock(NOW), spendOf(spend), judgePasses as never, judgeScores as never, agreement as never,
  );
  return { service, prisma, tx, created, selections, registry, queue, emailsOf, limiter, live: LIVE_CONFIG, spend, judgePasses, judgeScores, agreement };
}

async function problemOf(promise: Promise<unknown>) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ProblemDetailsException);
  const problem = error as ProblemDetailsException;
  return { status: problem.getStatus(), type: problem.problemType, violations: (problem.extensions?.violations ?? []) as string[] };
}

describe('EvalRunsService.create', () => {
  let ctx: ReturnType<typeof setup>;
  beforeEach(() => { ctx = setup(); });

  it('E1, Review focus 4: prompt "current" is the live config: the row names it and its version, stores the resolved selection, the price and the number of examples; enqueued; 202 body', async () => {
    const answer = await ctx.service.create(ADMIN, { operation: 'generate_cloze', prompt: 'current' });
    expect(ctx.created).toHaveLength(1);
    expect(ctx.judgePasses.startable).not.toHaveBeenCalled();
    expect(ctx.tx.aiJudgePass.create).not.toHaveBeenCalled();
    expect(ctx.created[0]).toMatchObject({
      operation: 'generate_cloze', provider: 'fake', model: 'fake:ok', effort: null, thinking: 'disabled', maxOutputTokens: 4096,
      configId: LIVE_CONFIG.id, configVersion: 0, promptRevision: null, priceInput: 1, priceCachedInput: null, priceOutput: 2, status: 'queued', total: 2, startedBy: ADMIN,
    });
    expect(ctx.created[0]).not.toHaveProperty('draft');
    expect(ctx.created[0]).not.toHaveProperty('exampleIds');
    expect(ctx.prisma.aiEvalExample.findMany).toHaveBeenCalledWith({
      where: { operation: 'generate_cloze' }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], select: { id: true, split: true, input: true, expected: true },
    });
    expect(ctx.queue.enqueue).toHaveBeenCalledWith(ctx.created[0]!.id);
    expect(answer).toEqual({ run_id: ctx.created[0]!.id, status: 'queued', judge_pass_id: null });
  });

  it('D14, B19: with judge_id the run row and a waiting pass (queued, no snapshot yet) are made in one transaction; the answer names the pass', async () => {
    const answer = await ctx.service.create(ADMIN, { operation: 'generate_cloze', prompt: 'current', judge_id: JUDGE });
    const runId = ctx.created[0]!.id;
    expect(ctx.judgePasses.startable).toHaveBeenCalledExactlyOnceWith(JUDGE, 'generate_cloze', NOW);
    expect(ctx.prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(ctx.tx.aiJudgePass.create).toHaveBeenCalledExactlyOnceWith({ data: {
      judgeRevisionId: JUDGE_REVISION, kind: 'eval_run', operation: 'generate_cloze', evalRunId: runId, status: 'queued', total: null, startedBy: ADMIN,
    } });
    expect(ctx.tx.aiEvalRun.create.mock.invocationCallOrder[0]!).toBeLessThan(ctx.tx.aiJudgePass.create.mock.invocationCallOrder[0]!);
    expect(answer).toEqual({ run_id: runId, status: 'queued', judge_pass_id: JUDGE_PASS });
    expect(ctx.queue.enqueue).toHaveBeenCalledExactlyOnceWith(runId);
  });

  it('a judge that cannot start (inactive, wrong operation, no model, unpriced, cap, already running) → its problem, no run row, no ai.test use, nothing enqueued', async () => {
    ctx.judgePasses.startable.mockRejectedValue(new ProblemDetailsException({ status: 409, type: 'judge-pass-running', title: 'running' }));
    expect(await problemOf(ctx.service.create(ADMIN, { operation: 'generate_cloze', prompt: 'current', judge_id: JUDGE }))).toMatchObject({ status: 409, type: 'judge-pass-running' });
    expect(ctx.created).toHaveLength(0);
    expect(ctx.limiter.hit).not.toHaveBeenCalled();
    expect(ctx.queue.enqueue).not.toHaveBeenCalled();
  });

  it('the unique index of B16 losing a race → 409 judge-pass-running and the run is not enqueued', async () => {
    ctx.tx.aiJudgePass.create.mockRejectedValueOnce(Object.assign(new Error('unique'), { code: 'P2002' }));
    expect(await problemOf(ctx.service.create(ADMIN, { operation: 'generate_cloze', prompt: 'current', judge_id: JUDGE }))).toMatchObject({ status: 409, type: 'judge-pass-running' });
    expect(ctx.queue.enqueue).not.toHaveBeenCalled();
  });

  it('judge_id must be a uuid', async () => {
    expect((await problemOf(ctx.service.create(ADMIN, { operation: 'generate_cloze', prompt: 'current', judge_id: 'nope' }))).violations[0]).toMatch(/^judge_id: /);
  });

  it('E1: each example becomes an item row with its snapshot, in position order, written with the run in one transaction', async () => {
    await ctx.service.create(ADMIN, { operation: 'generate_cloze', prompt: 'current' });
    const runId = ctx.created[0]!.id;
    expect(ctx.prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(ctx.prisma.aiEvalRun.create).not.toHaveBeenCalled();
    expect(ctx.tx.aiEvalRunItem.createMany).toHaveBeenCalledExactlyOnceWith({ data: [
      { runId, exampleId: EX1, position: 0, split: 'dev', input: IN1 },
      { runId, exampleId: EX2, position: 1, split: 'dev', input: IN2 },
    ] });
    expect(ctx.tx.aiEvalRun.create.mock.invocationCallOrder[0]!).toBeLessThan(ctx.tx.aiEvalRunItem.createMany.mock.invocationCallOrder[0]!);
    expect(ctx.queue.enqueue.mock.invocationCallOrder[0]!).toBeGreaterThan(ctx.tx.aiEvalRunItem.createMany.mock.invocationCallOrder[0]!);
  });

  it('E1: the expected answer and the split of an example are copied into its item row', async () => {
    ctx.prisma.aiEvalExample.findMany.mockResolvedValue([{ id: EX1, split: 'held_out', input: IN1, expected: { forms: ['go'] } } as never]);
    await ctx.service.create(ADMIN, { operation: 'generate_cloze', prompt: 'current' });
    expect(ctx.tx.aiEvalRunItem.createMany).toHaveBeenCalledExactlyOnceWith({ data: [
      { runId: ctx.created[0]!.id, exampleId: EX1, position: 0, split: 'held_out', input: IN1, expected: { forms: ['go'] } },
    ] });
  });

  it('B22: a model without its output price (or its input price) → 409 model-price-missing: no row, nothing enqueued, no ai.test use', async () => {
    for (const missing of [{ priceOutput: null }, { priceInput: null }, { priceInput: null, priceOutput: null }]) {
      ctx.prisma.aiConfig.findUnique.mockResolvedValueOnce({ ...LIVE_CONFIG, model: { ...LIVE_MODEL, ...missing } });
      expect(await problemOf(ctx.service.create(ADMIN, { operation: 'generate_cloze', prompt: 'current' }))).toMatchObject({ status: 409, type: 'model-price-missing' });
    }
    expect(ctx.created).toHaveLength(0);
    expect(ctx.tx.aiEvalRun.create).not.toHaveBeenCalled();
    expect(ctx.queue.enqueue).not.toHaveBeenCalled();
    expect(ctx.limiter.hit).not.toHaveBeenCalled();
  });

  it('B22 comes before the cap: an unpriced model with the cap reached is still model-price-missing', async () => {
    ctx.spend.spent = 5;
    ctx.prisma.aiConfig.findUnique.mockResolvedValue({ ...LIVE_CONFIG, model: { ...LIVE_MODEL, priceOutput: null } });
    expect(await problemOf(ctx.service.create(ADMIN, { operation: 'generate_cloze', prompt: 'current' }))).toMatchObject({ status: 409, type: 'model-price-missing' });
  });

  it('B20: the usd cap reached → 409 admin-usd-cap: no row, nothing enqueued, no ai.test use', async () => {
    ctx.spend.spent = 2;
    expect(await problemOf(ctx.service.create(ADMIN, { operation: 'generate_cloze', prompt: 'current' }))).toMatchObject({ status: 409, type: 'admin-usd-cap' });
    expect(ctx.created).toHaveLength(0);
    expect(ctx.queue.enqueue).not.toHaveBeenCalled();
    expect(ctx.limiter.hit).not.toHaveBeenCalled();
  });

  it('no cap (null) with 50 USD spent today → the run is created; 1.99 of 2 → created', async () => {
    ctx.spend.cap = null;
    ctx.spend.spent = 50;
    await ctx.service.create(ADMIN, { operation: 'generate_cloze', prompt: 'current' });
    ctx.spend.cap = 2;
    ctx.spend.spent = 1.99;
    await ctx.service.create(ADMIN, { operation: 'generate_cloze', prompt: 'current' });
    expect(ctx.created).toHaveLength(2);
  });

  it('a model whose cached-input price is empty still has a price (the cached rate falls back to the input rate)', async () => {
    await ctx.service.create(ADMIN, { operation: 'generate_cloze', prompt: 'current' });
    expect(ctx.created[0]).toMatchObject({ priceInput: 1, priceCachedInput: null, priceOutput: 2 });
  });

  it('the row stores the draft and no revision', async () => {
    const draft = { instructions: 'Draft.', examples: [{ input: EXAMPLE_INPUT, output: {
      sentence: 'We ___ on Friday.', accepted_answers: ['deploy'], translation_vi: 'Chúng tôi triển khai vào thứ Sáu.',
    } }] };
    await ctx.service.create(ADMIN, { operation: 'generate_cloze', prompt: draft });
    expect(ctx.created[0]).toMatchObject({ draft, promptRevision: null, configId: null, configVersion: null });
    expect(ctx.prisma.aiLiveConfig.findUnique).not.toHaveBeenCalled();
  });

  it('B6E73: no model in the live config → 409 model-not-set, no row', async () => {
    ctx.prisma.aiConfig.findUnique.mockResolvedValue({ ...LIVE_CONFIG, modelRef: null, model: null });
    const problem = await problemOf(ctx.service.create(ADMIN, { operation: 'generate_cloze', prompt: 'current' }));
    expect(problem).toMatchObject({ status: 409, type: 'model-not-set' });
    expect(ctx.created).toHaveLength(0);
    expect(ctx.queue.enqueue).not.toHaveBeenCalled();
  });

  it('provider not registered → 409 provider-not-configured, no row', async () => {
    ctx.prisma.aiConfig.findUnique.mockResolvedValue({ ...LIVE_CONFIG, model: { ...LIVE_MODEL, provider: 'openai' } });
    const problem = await problemOf(ctx.service.create(ADMIN, { operation: 'generate_cloze', prompt: 'current' }));
    expect(problem).toMatchObject({ status: 409, type: 'provider-not-configured' });
    expect(ctx.created).toHaveLength(0);
  });

  it('a draft that breaks the prompt rules → 400 with paths under prompt., no row', async () => {
    const draft = { instructions: '   ', examples: [{ input: { ...EXAMPLE_INPUT, meaning_vi: undefined }, output: {} }] };
    const problem = await problemOf(ctx.service.create(ADMIN, { operation: 'generate_cloze', prompt: draft }));
    expect(problem.status).toBe(400);
    expect(problem.type).toBe('validation-failed');
    expect(problem.violations[0]).toBe('prompt.instructions: Must not be blank');
    expect(problem.violations.some((v) => v.startsWith('prompt.examples[0].input.meaning_vi'))).toBe(true);
    expect(ctx.created).toHaveLength(0);
  });

  it('plan choice 21: no example for the operation → 400 examples: at least one example is needed', async () => {
    ctx.prisma.aiEvalExample.findMany.mockResolvedValue([]);
    const problem = await problemOf(ctx.service.create(ADMIN, { operation: 'generate_cloze', prompt: 'current' }));
    expect(problem).toMatchObject({ status: 400, violations: ['examples: at least one example is needed'] });
    expect(ctx.created).toHaveLength(0);
  });

  it('a run counts one ai.test use, taken once the request is accepted and before the row is made', async () => {
    await ctx.service.create(ADMIN, { operation: 'generate_cloze', prompt: 'current' });
    expect(ctx.limiter.hit).toHaveBeenCalledExactlyOnceWith('ai.test', ADMIN);
    expect(ctx.limiter.hit.mock.invocationCallOrder[0]!).toBeLessThan(ctx.tx.aiEvalRun.create.mock.invocationCallOrder[0]!);
  });

  it('over the ai.test limit → the 429 from the limiter, no row, nothing enqueued', async () => {
    ctx.limiter.hit.mockRejectedValue(new ProblemDetailsException({ status: 429, type: 'rate-limited', title: 'Too many requests' }));
    const problem = await problemOf(ctx.service.create(ADMIN, { operation: 'generate_cloze', prompt: 'current' }));
    expect(problem).toMatchObject({ status: 429, type: 'rate-limited' });
    expect(ctx.created).toHaveLength(0);
    expect(ctx.queue.enqueue).not.toHaveBeenCalled();
  });

  it('a request that is refused (no model, no provider, bad draft, no example) does not use up an ai.test run', async () => {
    ctx.prisma.aiConfig.findUnique.mockResolvedValueOnce({ ...LIVE_CONFIG, modelRef: null, model: null });
    await problemOf(ctx.service.create(ADMIN, { operation: 'generate_cloze', prompt: 'current' }));
    ctx.prisma.aiConfig.findUnique.mockResolvedValueOnce({ ...LIVE_CONFIG, model: { ...LIVE_MODEL, provider: 'openai' } });
    await problemOf(ctx.service.create(ADMIN, { operation: 'generate_cloze', prompt: 'current' }));
    await problemOf(ctx.service.create(ADMIN, { operation: 'generate_cloze', prompt: { instructions: '   ', examples: [] } }));
    ctx.prisma.aiEvalExample.findMany.mockResolvedValueOnce([]);
    await problemOf(ctx.service.create(ADMIN, { operation: 'generate_cloze', prompt: 'current' }));
    expect(ctx.limiter.hit).not.toHaveBeenCalled();
  });

  it('B6E91: enqueue returns false → the answer is still queued and the row stays queued', async () => {
    ctx.queue.enqueue.mockResolvedValue(false);
    const answer = await ctx.service.create(ADMIN, { operation: 'generate_cloze', prompt: 'current' });
    expect(answer.status).toBe('queued');
    expect(ctx.created[0]).toMatchObject({ status: 'queued' });
  });
});

describe('EvalRunsService.get', () => {
  it('plan review #4: an unknown id → 404 not-found', async () => {
    const ctx = setup();
    const problem = await problemOf(ctx.service.get(randomUUID()));
    expect(problem).toMatchObject({ status: 404, type: 'not-found' });
  });

  it('E1: items come from the item rows in position order, with the old keys kept and done counting the rows no longer pending', async () => {
    const ctx = setup();
    const id = randomUUID();
    ctx.prisma.aiEvalRun.findUnique.mockResolvedValue(runRow(ADMIN, id));
    ctx.prisma.aiEvalRunItem.groupBy.mockResolvedValue([
      { runId: id, status: 'succeeded', _count: { _all: 1 } }, { runId: id, status: 'pending', _count: { _all: 1 } },
    ]);
    ctx.prisma.aiEvalRunItem.findMany.mockResolvedValue([
      itemRow(EX1, 0, { status: 'succeeded', output: { sentence: 'x' }, rawOutput: '{}', latencyMs: 40, costUsd: { toFixed: () => '0.00000300' } }),
    ]);
    const run = await ctx.service.get(id);
    expect(ctx.prisma.aiEvalRunItem.findMany).toHaveBeenCalledWith({
      where: { runId: id, split: 'dev', status: { not: 'pending' } }, orderBy: [{ position: 'asc' }, { id: 'asc' }],
    });
    expect(run.done).toBe(1);
    expect(run.items).toEqual([
      {
        example_id: EX1, position: 0, split: 'dev', input: IN1, expected: null, status: 'succeeded', reason: null, output: { sentence: 'x' },
        raw_output: '{}', rule: null, expected_result: null, latency_ms: 40, cost_usd: '0.00000300',
      },
    ]);
  });

  it('B3: get lists dev items that have a result only; the held-out ones are not asked for', async () => {
    const ctx = setup();
    ctx.prisma.aiEvalRun.findUnique.mockResolvedValue(runRow(ADMIN));
    await ctx.service.get(randomUUID());
    const { where } = ctx.prisma.aiEvalRunItem.findMany.mock.calls[0]![0] as { where: Record<string, unknown> };
    expect(where).toMatchObject({ split: 'dev', status: { not: 'pending' } });
  });

  it('design §5.3: a finished run with no pending item is complete; its set version, legacy flag and set id are in the summary', async () => {
    const ctx = setup();
    const id = randomUUID();
    ctx.prisma.aiEvalRun.findUnique.mockResolvedValue({ ...runRow(ADMIN, id), status: 'finished', setId: 'S1' });
    ctx.prisma.aiEvalRunItem.groupBy.mockResolvedValue([
      { runId: id, status: 'succeeded', _count: { _all: 2 } }, { runId: id, status: 'transient_failure', _count: { _all: 1 } },
    ]);
    ctx.prisma.aiEvalSet.findMany.mockResolvedValue([{ id: 'S1', version: 1 }]);
    const run = await ctx.service.get(id);
    expect(run).toMatchObject({ complete: true, set_id: 'S1', set_version: 1, legacy: false, done: 3 });
  });

  it('design §5.3: a run on the working set has no set; one that still has a pending item is not complete', async () => {
    const ctx = setup();
    const id = randomUUID();
    ctx.prisma.aiEvalRun.findUnique.mockResolvedValue({ ...runRow(ADMIN, id), status: 'finished' });
    ctx.prisma.aiEvalRunItem.groupBy.mockResolvedValue([
      { runId: id, status: 'succeeded', _count: { _all: 1 } }, { runId: id, status: 'pending', _count: { _all: 1 } },
    ]);
    const run = await ctx.service.get(id);
    expect(run).toMatchObject({ complete: false, set_id: null, set_version: null });
  });

  it('a legacy run is flagged', async () => {
    const ctx = setup();
    ctx.prisma.aiEvalRun.findUnique.mockResolvedValue({ ...runRow(ADMIN), legacy: true });
    expect(await ctx.service.get(randomUUID())).toMatchObject({ legacy: true, set_id: null });
  });
});

describe('a hidden run (a run with labels that was "deleted", M3-T11)', () => {
  const hidden = (id: string) => ({ ...runRow(ADMIN, id), status: 'finished', setId: 'S1', hiddenAt: NOW });

  it('get, items and compare answer 404 for it, as for a run that is not there', async () => {
    const ctx = setup();
    const [a, b] = [randomUUID(), randomUUID()];
    ctx.prisma.aiEvalRun.findUnique.mockImplementation(async (args: unknown) => {
      const id = (args as { where: { id: string } }).where.id;
      return id === a ? hidden(a) : { ...runRow(ADMIN, b), status: 'finished', setId: 'S1' };
    });
    expect(await problemOf(ctx.service.get(a))).toMatchObject({ status: 404, type: 'not-found' });
    expect(await problemOf(ctx.service.items(a))).toMatchObject({ status: 404, type: 'not-found' });
    expect(await problemOf(ctx.service.compare(a, b))).toMatchObject({ status: 404, type: 'not-found' });
    expect(await problemOf(ctx.service.compare(b, a))).toMatchObject({ status: 404, type: 'not-found' });
    expect(ctx.prisma.aiEvalRunItem.findMany).not.toHaveBeenCalled();
  });

  it('delete of it answers 404 too', async () => {
    const ctx = setup();
    const id = randomUUID();
    ctx.prisma.aiLabel.count.mockResolvedValue(1);
    ctx.prisma.aiEvalRunItem.findMany.mockResolvedValue([{ id: 'i1' }]);
    ctx.prisma.aiEvalRun.findUnique.mockResolvedValue(hidden(id));
    expect(await problemOf(ctx.service.remove(id))).toMatchObject({ status: 404, type: 'not-found' });
    expect(ctx.prisma.aiEvalRun.deleteMany).not.toHaveBeenCalled();
  });
});

describe('EvalRunsService.items (B3, R7)', () => {
  it('lists the dev items that have a result in position order, and the statistics of every item', async () => {
    const ctx = setup();
    const id = randomUUID();
    ctx.prisma.aiEvalRun.findUnique.mockResolvedValue(runRow(ADMIN, id));
    ctx.prisma.aiEvalRunItem.findMany.mockResolvedValue([
      itemRow('d1', 0, { status: 'succeeded', rule: { status: 'pass', problems: [], reason: null }, expectedResult: 'pass' }),
      itemRow('d2', 1, { status: 'pending' }),
      itemRow('h1', 2, { split: 'held_out', status: 'succeeded', rule: { status: 'pass', problems: [], reason: null }, expectedResult: 'fail' }),
    ]);
    const answer = await ctx.service.items(id);
    expect(answer.items.map((item) => item.example_id)).toEqual(['d1']);
    expect(answer.stats.held_out).toMatchObject({ total: 1, expected_fail: 1, failing: 1 });
    expect(answer.stats.dev).toMatchObject({ total: 2, pending: 1, shape_pass: 1, rule_pass: 1, expected_pass: 1, failing: 0 });
    expect(JSON.stringify(answer)).not.toContain('h1');
  });

  it('an unknown run → 404', async () => {
    expect(await problemOf(setup().service.items(randomUUID()))).toMatchObject({ status: 404, type: 'not-found' });
  });
});

describe('EvalRunsService.create on a frozen version (design §5.3, B8)', () => {
  const S1 = randomUUID();
  const setItem = (exampleId: string, position: number, split: string, input: unknown, expected: unknown) => ({ exampleId, position, split, input, expected });

  it('copies the items of the version, with one held-out among them, and stores the set id', async () => {
    const ctx = setup();
    ctx.prisma.aiEvalSet.findUnique.mockResolvedValue({ id: S1, operation: 'generate_cloze', version: 1 });
    ctx.prisma.aiEvalSetItem.findMany.mockResolvedValue([
      setItem(EX1, 0, 'held_out', IN1, { forms: ['one'] }), setItem(EX2, 1, 'dev', IN2, { forms: ['two'] }),
    ]);
    await ctx.service.create(ADMIN, { operation: 'generate_cloze', prompt: 'current', set_id: S1 });
    expect(ctx.prisma.aiEvalSetItem.findMany).toHaveBeenCalledWith({ where: { setId: S1 }, orderBy: [{ position: 'asc' }, { id: 'asc' }] });
    expect(ctx.prisma.aiEvalExample.findMany).not.toHaveBeenCalled();
    expect(ctx.created[0]).toMatchObject({ setId: S1, total: 2 });
    expect(ctx.tx.aiEvalRunItem.createMany).toHaveBeenCalledExactlyOnceWith({ data: [
      { runId: ctx.created[0]!.id, exampleId: EX1, position: 0, split: 'held_out', input: IN1, expected: { forms: ['one'] } },
      { runId: ctx.created[0]!.id, exampleId: EX2, position: 1, split: 'dev', input: IN2, expected: { forms: ['two'] } },
    ] });
  });

  it('a version of another operation, or a version that does not exist → 400 set_id: not a version of <op>, no row', async () => {
    const ctx = setup();
    ctx.prisma.aiEvalSet.findUnique.mockResolvedValue({ id: S1, operation: 'lookup_word', version: 1 });
    expect(await problemOf(ctx.service.create(ADMIN, { operation: 'generate_cloze', prompt: 'current', set_id: S1 })))
      .toMatchObject({ status: 400, violations: ['set_id: not a version of generate_cloze'] });
    ctx.prisma.aiEvalSet.findUnique.mockResolvedValue(null);
    expect(await problemOf(ctx.service.create(ADMIN, { operation: 'generate_cloze', prompt: 'current', set_id: S1 })))
      .toMatchObject({ status: 400, violations: ['set_id: not a version of generate_cloze'] });
    expect(ctx.created).toHaveLength(0);
    expect(ctx.limiter.hit).not.toHaveBeenCalled();
  });

  it('without set_id the run takes the working set and stores no set', async () => {
    const ctx = setup();
    await ctx.service.create(ADMIN, { operation: 'generate_cloze', prompt: 'current' });
    expect(ctx.created[0]).toMatchObject({ setId: null });
    expect(ctx.prisma.aiEvalSet.findUnique).not.toHaveBeenCalled();
  });

  it('a set_id that is not a uuid → 400', async () => {
    const ctx = setup();
    expect((await problemOf(ctx.service.create(ADMIN, { operation: 'generate_cloze', prompt: 'current', set_id: 'x' }))).status).toBe(400);
  });
});

describe('EvalRunsService.compare (B10, D20)', () => {
  const [A, B] = [randomUUID(), randomUUID()];
  const IN_X1 = { word: 'x1' };
  const pass = { status: 'pass', problems: [], reason: null };
  const fail = { status: 'fail', problems: ['reveals-word'], reason: null };
  const row = (id: string, over: Record<string, unknown> = {}) => ({ ...runRow(ADMIN, id), status: 'finished', setId: 'S1', ...over });
  const itemOf = (runId: string, exampleId: string, position: number, over: Record<string, unknown> = {}) =>
    itemRow(exampleId, position, { runId, status: 'succeeded', rule: pass, expectedResult: 'pass', input: exampleId === 'x1' ? IN_X1 : { word: exampleId }, ...over });

  function compareCtx(runs: Record<string, Record<string, unknown> | null>, items: Record<string, Array<Record<string, unknown>>>) {
    const ctx = setup();
    ctx.prisma.aiEvalRun.findUnique.mockImplementation(async (args: unknown) => runs[(args as { where: { id: string } }).where.id] ?? null);
    ctx.prisma.aiEvalRunItem.findMany.mockImplementation(async (args: unknown) => items[(args as { where: { runId: string } }).where.runId] ?? []);
    ctx.prisma.aiEvalSet.findMany.mockResolvedValue([{ id: 'S1', version: 1 }]);
    return ctx;
  }

  const aItems = [
    itemOf(A, 'x1', 0), itemOf(A, 'x2', 1), itemOf(A, 'x3', 2, { status: 'permanent_failure', rule: null, expectedResult: null }),
    itemOf(A, 'x4', 3), itemOf(A, 'h1', 4, { split: 'held_out' }), itemOf(A, 'h2', 5, { split: 'held_out' }),
  ];
  const bItems = [
    itemOf(B, 'x1', 0, { rule: fail }), itemOf(B, 'x2', 1), itemOf(B, 'x3', 2), itemOf(B, 'x4', 3, { status: 'pending', rule: null, expectedResult: null }),
    itemOf(B, 'h1', 4, { split: 'held_out', expectedResult: 'fail' }), itemOf(B, 'h2', 5, { split: 'held_out' }),
  ];

  it('the dev examples that passed before and do not now, with the later run input; held-out only as a count', async () => {
    const ctx = compareCtx({ [A]: row(A), [B]: row(B) }, { [A]: aItems, [B]: bItems });
    const view = await ctx.service.compare(A, B);
    expect(view.regressions).toEqual({ dev: [{ example_id: 'x1', input: IN_X1, failed: ['rule'] }], held_out: 1 });
    expect(JSON.stringify(view)).not.toContain('"h1"');
    expect(view.a).toMatchObject({ id: A, set_id: 'S1', set_version: 1 });
    expect(view.b).toMatchObject({ id: B });
    expect(view.stats.a.dev).toMatchObject({ total: 4, failing: 1 });
    expect(view.stats.b.held_out).toMatchObject({ total: 2, expected_fail: 1, failing: 1 });
  });

  it('different versions → 409 eval-set-mismatch', async () => {
    const ctx = compareCtx({ [A]: row(A), [B]: row(B, { setId: 'S2' }) }, {});
    expect(await problemOf(ctx.service.compare(A, B))).toMatchObject({ status: 409, type: 'eval-set-mismatch' });
  });

  it('a run on the working set (no version) on either side → 409 eval-set-mismatch', async () => {
    const ctx = compareCtx({ [A]: row(A, { setId: null }), [B]: row(B) }, {});
    expect(await problemOf(ctx.service.compare(A, B))).toMatchObject({ status: 409, type: 'eval-set-mismatch' });
    expect(await problemOf(ctx.service.compare(B, A))).toMatchObject({ status: 409, type: 'eval-set-mismatch' });
    const both = compareCtx({ [A]: row(A, { setId: null }), [B]: row(B, { setId: null }) }, {});
    expect(await problemOf(both.service.compare(A, B))).toMatchObject({ status: 409, type: 'eval-set-mismatch' });
  });

  it('a missing run on either side → 404 not-found', async () => {
    const ctx = compareCtx({ [A]: row(A) }, {});
    expect(await problemOf(ctx.service.compare(A, B))).toMatchObject({ status: 404, type: 'not-found' });
    expect(await problemOf(ctx.service.compare(B, A))).toMatchObject({ status: 404, type: 'not-found' });
  });

  it('a run compared with itself has no regression', async () => {
    const ctx = compareCtx({ [A]: row(A) }, { [A]: aItems });
    const view = await ctx.service.compare(A, A);
    expect(view.regressions).toEqual({ dev: [], held_out: 0 });
  });
});

describe('EvalRunsService.create on a config (M2-T4)', () => {
  const DRAFT = randomUUID();
  const LIVE = randomUUID();
  const MODEL = { id: randomUUID(), provider: 'fake', modelId: 'fake:ok', effortLevels: [], thinkingOff: null, maxOutputTokens: 4096, priceInput: 1, priceCachedInput: null, priceOutput: 2 };
  const cfg = (id: string, over: Record<string, unknown> = {}) => ({
    id, operation: 'generate_cloze', number: 4, version: 2, instructions: 'Config text.', examples: [], modelRef: MODEL.id, effort: 'low', thinking: null,
    maxOutputTokens: 900, status: 'draft', model: MODEL, ...over,
  });

  it('config "draft" stores the draft id and version, the draft model as the selection, and no prompt revision, no draft text', async () => {
    const ctx = setup();
    ctx.prisma.aiConfig.findFirst.mockResolvedValue(cfg(DRAFT));
    await ctx.service.create(ADMIN, { operation: 'generate_cloze', config: 'draft' });
    expect(ctx.prisma.aiConfig.findFirst).toHaveBeenCalledWith({ where: { operation: 'generate_cloze', status: 'draft' }, include: { model: true } });
    expect(ctx.created[0]).toMatchObject({
      configId: DRAFT, configVersion: 2, promptRevision: null, provider: 'fake', model: 'fake:ok', effort: 'low', maxOutputTokens: 900,
      priceInput: 1, priceOutput: 2, status: 'queued', total: 2,
    });
    expect(ctx.created[0]).not.toHaveProperty('draft');
    expect(ctx.selections.load).not.toHaveBeenCalled();
    expect(ctx.queue.enqueue).toHaveBeenCalledWith(ctx.created[0]!.id);
  });

  it('with a set_id the items of that version are copied and the set id is stored next to the config', async () => {
    const ctx = setup();
    const S1 = randomUUID();
    ctx.prisma.aiConfig.findFirst.mockResolvedValue(cfg(DRAFT));
    ctx.prisma.aiEvalSet.findUnique.mockResolvedValue({ id: S1, operation: 'generate_cloze', version: 1 });
    ctx.prisma.aiEvalSetItem.findMany.mockResolvedValue([{ exampleId: EX1, position: 0, split: 'dev', input: IN1, expected: null }]);
    await ctx.service.create(ADMIN, { operation: 'generate_cloze', config: 'draft', set_id: S1 });
    expect(ctx.created[0]).toMatchObject({ setId: S1, configId: DRAFT, configVersion: 2, total: 1 });
  });

  it('config "live" runs the live config: the pointer, then that config with its model', async () => {
    const ctx = setup();
    ctx.prisma.aiLiveConfig.findUnique.mockResolvedValue({ operation: 'generate_cloze', configId: LIVE, version: 7 });
    ctx.prisma.aiConfig.findUnique.mockResolvedValue(cfg(LIVE, { status: 'published', version: 0, number: 3 }));
    await ctx.service.create(ADMIN, { operation: 'generate_cloze', config: 'live' });
    expect(ctx.prisma.aiConfig.findUnique).toHaveBeenCalledWith({ where: { id: LIVE }, include: { model: true } });
    expect(ctx.created[0]).toMatchObject({ configId: LIVE, configVersion: 0, promptRevision: null });
  });

  it('prompt and config together, or neither → 400, no row', async () => {
    const ctx = setup();
    const both = await problemOf(ctx.service.create(ADMIN, { operation: 'generate_cloze', prompt: 'current', config: 'draft' }));
    expect(both).toMatchObject({ status: 400, type: 'validation-failed' });
    expect((await problemOf(ctx.service.create(ADMIN, { operation: 'generate_cloze' }))).status).toBe(400);
    expect(ctx.created).toHaveLength(0);
    expect(ctx.limiter.hit).not.toHaveBeenCalled();
  });

  it('no draft → 404; a config without a model → 409 model-not-set; its provider not registered → 409 provider-not-configured; none costs a slot', async () => {
    const ctx = setup();
    expect(await problemOf(ctx.service.create(ADMIN, { operation: 'generate_cloze', config: 'draft' }))).toMatchObject({ status: 404, type: 'not-found' });
    ctx.prisma.aiConfig.findFirst.mockResolvedValue(cfg(DRAFT, { modelRef: null, model: null }));
    expect(await problemOf(ctx.service.create(ADMIN, { operation: 'generate_cloze', config: 'draft' }))).toMatchObject({ status: 409, type: 'model-not-set' });
    ctx.prisma.aiConfig.findFirst.mockResolvedValue(cfg(DRAFT, { model: { ...MODEL, provider: 'openai' } }));
    expect(await problemOf(ctx.service.create(ADMIN, { operation: 'generate_cloze', config: 'draft' }))).toMatchObject({ status: 409, type: 'provider-not-configured' });
    expect(ctx.created).toHaveLength(0);
    expect(ctx.limiter.hit).not.toHaveBeenCalled();
  });

  it('a legacy draft text (prompt: {instructions, examples}) is stored as a draft, with no config, on the live model', async () => {
    const ctx = setup();
    await ctx.service.create(ADMIN, { operation: 'generate_cloze', prompt: { instructions: 'Draft.', examples: [] } });
    expect(ctx.created[0]).toMatchObject({ configId: null, configVersion: null, promptRevision: null, draft: { instructions: 'Draft.', examples: [] }, model: 'fake:ok' });
  });

  it('prompt "current" together with config → 400 (exactly one of the two)', async () => {
    const ctx = setup();
    expect((await problemOf(ctx.service.create(ADMIN, { operation: 'generate_cloze', prompt: 'current', config: 'draft' }))).status).toBe(400);
  });
});

describe('EvalRunsService views of a config run (M2-T4)', () => {
  it('the summary carries the config id, its version and its number; a deleted draft has number null', async () => {
    const ctx = setup();
    const draftId = randomUUID();
    const goneId = randomUUID();
    ctx.prisma.aiEvalRun.findMany.mockResolvedValueOnce([
      { ...runRow(ADMIN), configId: draftId, configVersion: 2 }, { ...runRow(ADMIN), configId: goneId, configVersion: 1 }, runRow(ADMIN),
    ]);
    ctx.prisma.aiConfig.findMany.mockResolvedValueOnce([{ id: draftId, number: 4 }]);
    const { items } = await ctx.service.list('generate_cloze', 20, undefined);
    expect(items.map((item) => [item.config_id, item.config_version, item.config_number])).toEqual([[draftId, 2, 4], [goneId, 1, null], [null, null, null]]);
    expect(ctx.prisma.aiConfig.findMany).toHaveBeenCalledTimes(1);
  });

  it('get carries the same three fields', async () => {
    const ctx = setup();
    const id = randomUUID();
    const draftId = randomUUID();
    ctx.prisma.aiEvalRun.findUnique.mockResolvedValue({ ...runRow(ADMIN, id), configId: draftId, configVersion: 3 });
    ctx.prisma.aiConfig.findMany.mockResolvedValue([{ id: draftId, number: 6 }]);
    expect(await ctx.service.get(id)).toMatchObject({ config_id: draftId, config_version: 3, config_number: 6 });
  });
});

describe('EvalRunsService.list by set', () => {
  it('B8: set_id narrows the runs and is part of the page token binding', async () => {
    const ctx = setup();
    const S1 = randomUUID();
    ctx.prisma.aiEvalRun.findMany.mockResolvedValueOnce([]);
    await ctx.service.list('generate_cloze', 20, undefined, S1);
    expect(ctx.prisma.aiEvalRun.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { operation: 'generate_cloze', hiddenAt: null, setId: S1 } }));
    ctx.prisma.aiEvalRun.findMany.mockResolvedValueOnce([runRow(ADMIN), runRow(ADMIN)]);
    const { next_page_token: token } = await ctx.service.list('generate_cloze', 1, undefined, S1);
    expect(token).not.toBeNull();
    await expect(ctx.service.list('generate_cloze', 1, token!)).rejects.toBeInstanceOf(ProblemDetailsException);
    ctx.prisma.aiEvalRun.findMany.mockResolvedValueOnce([]);
    await expect(ctx.service.list('generate_cloze', 1, token!, S1)).resolves.toMatchObject({ items: [] });
  });
});

function itemRow(exampleId: string, position: number, over: Record<string, unknown> = {}) {
  return {
    id: `item-${position}`, runId: 'run', exampleId, position, split: 'dev', input: position === 0 ? IN1 : IN2, expected: null, status: 'pending',
    reason: null, output: null, rawOutput: null, rule: null, expectedResult: null, latencyMs: null, costUsd: null, hidden: false, ...over,
  };
}

function runRow(startedBy: string, id: string = randomUUID()) {
  return {
    setId: null, legacy: false, configId: null, configVersion: null,
    id, operation: 'generate_cloze', provider: 'fake', model: 'fake:ok', effort: null, thinking: 'disabled', maxOutputTokens: 4096,
    promptRevision: 4, draft: null, status: 'done', total: 2, validCount: 2, avgLatencyMs: 5, costUsd: null,
    costUnknownCount: 0, error: null, startedBy, createdAt: new Date('2026-10-01T00:00:00Z'), startedAt: null, finishedAt: null,
    heartbeatAt: null,
  };
}

describe('EvalRunsService.cancel', () => {
  const ACTIVE = ['queued', 'running'];

  it('a queued or running run becomes failed / cancelled with finished_at, in one UPDATE guarded by the status; the answer is the run detail', async () => {
    const ctx = setup();
    const id = randomUUID();
    ctx.prisma.aiEvalRun.updateMany.mockResolvedValue({ count: 1 });
    ctx.prisma.aiEvalRun.findUnique.mockResolvedValue({ ...runRow(ADMIN, id), status: 'failed', error: 'cancelled', finishedAt: NOW });
    const run = await ctx.service.cancel(id);
    expect(ctx.prisma.aiEvalRun.updateMany).toHaveBeenCalledExactlyOnceWith({
      where: { id, status: { in: ACTIVE } }, data: { status: 'failed', error: 'cancelled', finishedAt: NOW },
    });
    expect(run).toMatchObject({ id, status: 'failed', error: 'cancelled', finished_at: NOW.toISOString(), started_by_user: { email: 'admin@x.test' } });
    expect(run).toHaveProperty('items');
    expect(run).toHaveProperty('draft');
    expect(ctx.prisma.aiEvalRunItem.findMany).toHaveBeenCalledTimes(1);
  });

  it('B19: cancelling also fails the passes that wait for the run (queued) with run-failed, so none starts after it', async () => {
    const ctx = setup();
    const id = randomUUID();
    ctx.prisma.aiEvalRun.updateMany.mockResolvedValue({ count: 1 });
    ctx.prisma.aiEvalRun.findUnique.mockResolvedValue({ ...runRow(ADMIN, id), status: 'failed', error: 'cancelled', finishedAt: NOW });
    await ctx.service.cancel(id);
    expect(ctx.prisma.aiJudgePass.updateMany).toHaveBeenCalledExactlyOnceWith({
      where: { evalRunId: id, status: 'queued' }, data: { status: 'failed', error: 'run-failed', finishedAt: NOW },
    });
  });

  it('a run that cannot be cancelled leaves its passes alone', async () => {
    const ctx = setup();
    const id = randomUUID();
    ctx.prisma.aiEvalRun.findUnique.mockResolvedValue({ ...runRow(ADMIN, id), status: 'finished' });
    await problemOf(ctx.service.cancel(id));
    expect(ctx.prisma.aiJudgePass.updateMany).not.toHaveBeenCalled();
  });

  it('a run that finished a moment earlier (the guarded UPDATE changes no row) → 409 run-not-active and nothing is overwritten', async () => {
    const ctx = setup();
    const id = randomUUID();
    ctx.prisma.aiEvalRun.findUnique.mockResolvedValue({ ...runRow(ADMIN, id), status: 'finished' });
    expect(await problemOf(ctx.service.cancel(id))).toMatchObject({ status: 409, type: 'run-not-active' });
    expect(ctx.prisma.aiEvalRun.updateMany).toHaveBeenCalledTimes(1);
  });

  it('a run that already failed (or was cancelled before) → 409 run-not-active', async () => {
    const ctx = setup();
    const id = randomUUID();
    ctx.prisma.aiEvalRun.findUnique.mockResolvedValue({ ...runRow(ADMIN, id), status: 'failed', error: 'cancelled' });
    expect(await problemOf(ctx.service.cancel(id))).toMatchObject({ status: 409, type: 'run-not-active' });
  });

  it('an unknown id → 404 not-found', async () => {
    const ctx = setup();
    expect(await problemOf(ctx.service.cancel(randomUUID()))).toMatchObject({ status: 404, type: 'not-found' });
  });

  it('cancelling enqueues nothing, uses no ai.test run and calls no provider', async () => {
    const ctx = setup();
    ctx.prisma.aiEvalRun.updateMany.mockResolvedValue({ count: 1 });
    ctx.prisma.aiEvalRun.findUnique.mockResolvedValue({ ...runRow(ADMIN), status: 'failed', error: 'cancelled' });
    await ctx.service.cancel(randomUUID());
    expect(ctx.queue.enqueue).not.toHaveBeenCalled();
    expect(ctx.limiter.hit).not.toHaveBeenCalled();
    expect(ctx.prisma.aiCall.deleteMany).not.toHaveBeenCalled();
  });
});

describe('EvalRunsService.remove', () => {
  const ENDED = ['finished', 'failed'];

  it('a finished or failed run is deleted by one DELETE guarded by the status; the answer is nothing', async () => {
    const ctx = setup();
    const id = randomUUID();
    ctx.prisma.aiEvalRun.deleteMany.mockResolvedValue({ count: 1 });
    await expect(ctx.service.remove(id)).resolves.toBeUndefined();
    expect(ctx.prisma.aiEvalRun.deleteMany).toHaveBeenCalledExactlyOnceWith({ where: { id, status: { in: ENDED } } });
  });

  it.each(['queued', 'running'])('a %s run → 409 run-active (cancel it first) and it stays', async (status) => {
    const ctx = setup();
    const id = randomUUID();
    ctx.prisma.aiEvalRun.findUnique.mockResolvedValue({ ...runRow(ADMIN, id), status });
    expect(await problemOf(ctx.service.remove(id))).toMatchObject({ status: 409, type: 'run-active' });
    expect(ctx.prisma.aiEvalRun.deleteMany).toHaveBeenCalledTimes(1);
  });

  it('an unknown id → 404 not-found', async () => {
    const ctx = setup();
    expect(await problemOf(ctx.service.remove(randomUUID()))).toMatchObject({ status: 404, type: 'not-found' });
  });

  it('B33: a run named by a publish or rollback event is evidence → 409 run-is-evidence, checked before the delete', async () => {
    const ctx = setup();
    const id = randomUUID();
    ctx.prisma.aiConfigEvent.findFirst.mockResolvedValue({ id: 'event' });
    expect(await problemOf(ctx.service.remove(id))).toMatchObject({ status: 409, type: 'run-is-evidence' });
    expect(ctx.prisma.aiConfigEvent.findFirst).toHaveBeenCalledWith({ where: { OR: [{ candidateRunId: id }, { baselineRunId: id }] }, select: { id: true } });
    expect(ctx.prisma.aiEvalRun.deleteMany).not.toHaveBeenCalled();
  });

  it('B33: the foreign key catching an event written between the check and the delete → the same 409', async () => {
    const ctx = setup();
    ctx.prisma.aiEvalRun.deleteMany.mockRejectedValue(Object.assign(new Error('fk'), { code: 'P2003' }));
    expect(await problemOf(ctx.service.remove(randomUUID()))).toMatchObject({ status: 409, type: 'run-is-evidence' });
  });

  it('deleting a run leaves ai_calls alone: the costs report reads ai_calls, so the money stays on the books', async () => {
    const ctx = setup();
    ctx.prisma.aiEvalRun.deleteMany.mockResolvedValue({ count: 1 });
    await ctx.service.remove(randomUUID());
    expect(ctx.prisma.aiCall.deleteMany).not.toHaveBeenCalled();
    expect(ctx.prisma.$executeRaw).not.toHaveBeenCalled();
  });
});

describe('EvalRunsService started_by_user', () => {
  it('get of a found run has started_by_user and keeps started_by', async () => {
    const ctx = setup();
    ctx.prisma.aiEvalRun.findUnique.mockResolvedValueOnce(runRow(ADMIN));
    const run = await ctx.service.get(randomUUID());
    expect(run.started_by).toBe(ADMIN);
    expect(run.started_by_user).toEqual({ id: ADMIN, email: 'admin@x.test', system: false });
    expect(ctx.emailsOf).toHaveBeenCalledTimes(1);
  });

  it('E1: list counts the done items of the whole page in one grouped query', async () => {
    const ctx = setup();
    const [a, b] = [randomUUID(), randomUUID()];
    ctx.prisma.aiEvalRun.findMany.mockResolvedValueOnce([runRow(ADMIN, a), runRow(ADMIN, b)]);
    ctx.prisma.aiEvalRunItem.groupBy.mockResolvedValueOnce([
      { runId: a, status: 'succeeded', _count: { _all: 2 } }, { runId: b, status: 'pending', _count: { _all: 2 } },
    ]);
    const { items } = await ctx.service.list('generate_cloze', 20, undefined);
    expect(ctx.prisma.aiEvalRunItem.groupBy).toHaveBeenCalledExactlyOnceWith({
      by: ['runId', 'status'], where: { runId: { in: [a, b] } }, _count: { _all: true },
    });
    expect(items.map((item) => item.done)).toEqual([2, 0]);
  });

  it('list: one emailsOf call for the page; system actor and unknown user', async () => {
    const ctx = setup();
    const unknown = '33333333-3333-4333-8333-333333333333';
    ctx.prisma.aiEvalRun.findMany.mockResolvedValueOnce([runRow(ADMIN), runRow(AI_SYSTEM_ACTOR_ID), runRow(unknown)]);
    const { items } = await ctx.service.list('generate_cloze', 20, undefined);
    expect(ctx.emailsOf).toHaveBeenCalledTimes(1);
    expect(items.map((item) => item.started_by_user)).toEqual([
      { id: ADMIN, email: 'admin@x.test', system: false },
      { id: AI_SYSTEM_ACTOR_ID, email: null, system: true },
      { id: unknown, email: null, system: false },
    ]);
  });
});

describe('EvalRunsService.items — judge scores, labels and passes (M3-T11, B3, B11)', () => {
  const RUN = randomUUID();
  const R2 = '33333333-3333-4333-8333-333333333332';
  const score = (itemId: string, split: 'dev' | 'held_out', verdict: string | null, reason: string | null) => ({
    itemId, split, judgeId: 'J', judgeName: 'Chỉ một đáp án', judgeRevisionId: R2, revision: 2, criterion: 'single_answer', verdict, problem: null, reason,
  });
  const label = { subject_kind: 'eval_item', subject_id: 'i1', criterion: 'single_answer', verdict: 'pass', labeled_by_user: { id: ADMIN, email: 'admin@x.test', system: false }, labeled_at: NOW.toISOString() };

  function ready() {
    const ctx = setup();
    ctx.prisma.aiEvalRun.findUnique.mockResolvedValue(runRow(ADMIN, RUN));
    ctx.prisma.aiEvalRunItem.findMany.mockResolvedValue([
      itemRow('d1', 0, { id: 'i1', status: 'succeeded', output: { sentence: 'x' } }),
      itemRow('d2', 1, { id: 'i2', status: 'pending' }),
      itemRow('h1', 2, { id: 'i3', split: 'held_out', status: 'succeeded', output: { sentence: 'y' } }),
    ]);
    ctx.judgeScores.byRun.mockResolvedValue([
      score('i1', 'dev', 'fail_major', 'beat fits too'), score('i3', 'held_out', 'pass', 'SECRET held-out reason'),
    ]);
    ctx.judgeScores.labelsOf.mockResolvedValue(new Map([['i1', [label]]]));
    return ctx;
  }

  it('each dev item has its item id, the scores of every judge revision on it and its labels', async () => {
    const ctx = ready();
    const answer = await ctx.service.items(RUN);
    expect(answer.items).toHaveLength(1);
    expect(answer.items[0]).toMatchObject({
      item_id: 'i1', example_id: 'd1',
      scores: [{ judge_id: 'J', judge_name: 'Chỉ một đáp án', judge_revision_id: R2, revision: 2, criterion: 'single_answer', verdict: 'fail_major', problem: null, reason: 'beat fits too' }],
      labels: [label],
    });
    expect(ctx.judgeScores.labelsOf).toHaveBeenCalledExactlyOnceWith('eval_item', ['i1']);
  });

  it('R7: the held-out part of the judge statistics is a tally; no held-out reason, item id or score appears anywhere in the answer', async () => {
    const ctx = ready();
    const answer = await ctx.service.items(RUN);
    expect(answer.judge_stats).toEqual([{
      judge_id: 'J', judge_name: 'Chỉ một đáp án', judge_revision_id: R2, revision: 2, criterion: 'single_answer',
      dev: { pass: 0, fail_major: 1, fail_minor: 0, unjudged: 0 }, held_out: { pass: 1, fail_major: 0, fail_minor: 0, unjudged: 0 }, calibrated: false,
    }]);
    const text = JSON.stringify(answer);
    expect(text).not.toContain('SECRET');
    expect(text).not.toContain('i3');
    expect(text).not.toContain('"h1"');
  });

  it('calibrated comes from the agreement of that revision and criterion', async () => {
    const ctx = ready();
    ctx.agreement.forRevisions.mockResolvedValue(new Map([[`${R2}|single_answer`, { calibrated: true }]]));
    expect((await ctx.service.items(RUN)).judge_stats[0]).toMatchObject({ calibrated: true });
    expect(ctx.agreement.forRevisions).toHaveBeenCalledWith([R2]);
  });

  it('the passes of the run, newest first, are the views of the ids in that order', async () => {
    const ctx = ready();
    ctx.prisma.aiJudgePass.findMany.mockResolvedValue([{ id: 'p-new' }, { id: 'p-old' }]);
    ctx.judgePasses.views.mockResolvedValue([{ id: 'p-new' }, { id: 'p-old' }]);
    const answer = await ctx.service.items(RUN);
    expect(ctx.prisma.aiJudgePass.findMany).toHaveBeenCalledExactlyOnceWith({ where: { evalRunId: RUN }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { id: true } });
    expect(ctx.judgePasses.views).toHaveBeenCalledExactlyOnceWith(['p-new', 'p-old']);
    expect(answer.passes).toEqual([{ id: 'p-new' }, { id: 'p-old' }]);
  });

  it('a run nobody judged has empty scores, labels, passes and statistics', async () => {
    const ctx = ready();
    ctx.judgeScores.byRun.mockResolvedValue([]);
    ctx.judgeScores.labelsOf.mockResolvedValue(new Map());
    const answer = await ctx.service.items(RUN);
    expect(answer.items[0]).toMatchObject({ scores: [], labels: [] });
    expect(answer.judge_stats).toEqual([]);
    expect(answer.passes).toEqual([]);
  });
});

describe('EvalRunsService.compare — judge columns (M3-T11, B11)', () => {
  const [A, B] = [randomUUID(), randomUUID()];
  const R1 = '33333333-3333-4333-8333-333333333331';
  const R2 = '33333333-3333-4333-8333-333333333332';
  const score = (itemId: string, revisionId: string, revision: number, verdict: string) => ({
    itemId, split: 'dev', judgeId: 'J', judgeName: 'Chỉ một đáp án', judgeRevisionId: revisionId, revision, criterion: 'single_answer', verdict, problem: null, reason: null,
  });
  const row = (id: string) => ({ ...runRow(ADMIN, id), status: 'finished', setId: 'S1' });

  function ctxWith(scoresA: unknown[], scoresB: unknown[]) {
    const ctx = setup();
    ctx.prisma.aiEvalRun.findUnique.mockImplementation(async (args: unknown) => ((args as { where: { id: string } }).where.id === A ? row(A) : row(B)));
    ctx.prisma.aiEvalSet.findMany.mockResolvedValue([{ id: 'S1', version: 1 }]);
    ctx.judgeScores.byRun.mockImplementation(async (runId: string) => (runId === A ? scoresA : scoresB) as never);
    return ctx;
  }

  it('R1 on run a only → no comparison row, and R1 is listed as scored on a', async () => {
    const ctx = ctxWith([score('d1', R1, 1, 'pass')], [score('d1', R2, 2, 'pass')]);
    const view = await ctx.service.compare(A, B);
    expect(view.judge).toEqual([]);
    // Newest revision first, as everywhere else.
    expect(view.judge_unmatched).toEqual([
      { judge_id: 'J', judge_name: 'Chỉ một đáp án', judge_revision_id: R2, revision: 2, scored: 'b' },
      { judge_id: 'J', judge_name: 'Chỉ một đáp án', judge_revision_id: R1, revision: 1, scored: 'a' },
    ]);
  });

  it('a revision that scored both runs is compared criterion by criterion, dev and held-out as tallies', async () => {
    const ctx = ctxWith([score('d1', R2, 2, 'pass')], [score('d1', R2, 2, 'fail_major')]);
    const view = await ctx.service.compare(A, B);
    expect(view.judge_unmatched).toEqual([]);
    expect(view.judge).toEqual([{
      judge_id: 'J', judge_name: 'Chỉ một đáp án', judge_revision_id: R2, revision: 2, criterion: 'single_answer',
      a: { dev: { pass: 1, fail_major: 0, fail_minor: 0, unjudged: 0 }, held_out: { pass: 0, fail_major: 0, fail_minor: 0, unjudged: 0 } },
      b: { dev: { pass: 0, fail_major: 1, fail_minor: 0, unjudged: 0 }, held_out: { pass: 0, fail_major: 0, fail_minor: 0, unjudged: 0 } },
    }]);
  });
});

describe('EvalRunsService.remove — labels and judge passes (M3-T11, D16, B16)', () => {
  const ENDED = ['finished', 'failed'];

  it('a run whose items carry a label is hidden, not deleted: the run gets hiddenAt, its items hidden, nothing is deleted, the answer is nothing', async () => {
    const ctx = setup();
    const id = randomUUID();
    ctx.prisma.aiEvalRunItem.findMany.mockResolvedValue([{ id: 'i1' }, { id: 'i2' }]);
    ctx.prisma.aiLabel.count.mockResolvedValue(1);
    ctx.prisma.aiEvalRun.updateMany.mockResolvedValue({ count: 1 });
    await expect(ctx.service.remove(id)).resolves.toBeUndefined();
    expect(ctx.prisma.aiLabel.count).toHaveBeenCalledExactlyOnceWith({ where: { subjectKind: 'eval_item', subjectId: { in: ['i1', 'i2'] } } });
    expect(ctx.prisma.aiEvalRun.updateMany).toHaveBeenCalledExactlyOnceWith({ where: { id, status: { in: ENDED }, hiddenAt: null }, data: { hiddenAt: NOW } });
    expect(ctx.prisma.aiEvalRunItem.updateMany).toHaveBeenCalledExactlyOnceWith({ where: { runId: id }, data: { hidden: true } });
    expect(ctx.prisma.aiEvalRun.deleteMany).not.toHaveBeenCalled();
  });

  it('a queued or running run with labels is still refused 409 run-active (the guarded statement changes nothing)', async () => {
    const ctx = setup();
    const id = randomUUID();
    ctx.prisma.aiEvalRunItem.findMany.mockResolvedValue([{ id: 'i1' }]);
    ctx.prisma.aiLabel.count.mockResolvedValue(1);
    ctx.prisma.aiEvalRun.findUnique.mockResolvedValue({ ...runRow(ADMIN, id), status: 'running' });
    expect(await problemOf(ctx.service.remove(id))).toMatchObject({ status: 409, type: 'run-active' });
    expect(ctx.prisma.aiEvalRunItem.updateMany).not.toHaveBeenCalled();
  });

  it('a run without a label is deleted as before, and the labels are asked about its items only', async () => {
    const ctx = setup();
    const id = randomUUID();
    ctx.prisma.aiEvalRunItem.findMany.mockResolvedValue([{ id: 'i1' }]);
    ctx.prisma.aiEvalRun.deleteMany.mockResolvedValue({ count: 1 });
    await ctx.service.remove(id);
    expect(ctx.prisma.aiEvalRun.deleteMany).toHaveBeenCalledExactlyOnceWith({ where: { id, status: { in: ENDED } } });
    expect(ctx.prisma.aiEvalRun.updateMany).not.toHaveBeenCalled();
  });

  it('a queued or running judge pass of the run → 409 judge-pass-running and nothing is hidden or deleted', async () => {
    const ctx = setup();
    const id = randomUUID();
    ctx.prisma.aiJudgePass.findFirst.mockResolvedValue({ id: 'p1' });
    expect(await problemOf(ctx.service.remove(id))).toMatchObject({ status: 409, type: 'judge-pass-running' });
    expect(ctx.prisma.aiJudgePass.findFirst).toHaveBeenCalledExactlyOnceWith({ where: { evalRunId: id, status: { in: ['queued', 'running'] } }, select: { id: true } });
    expect(ctx.prisma.aiEvalRun.deleteMany).not.toHaveBeenCalled();
    expect(ctx.prisma.aiEvalRun.updateMany).not.toHaveBeenCalled();
  });

  it('the evidence check still comes first: a run that is evidence is 409 run-is-evidence even with a running pass', async () => {
    const ctx = setup();
    ctx.prisma.aiConfigEvent.findFirst.mockResolvedValue({ id: 'event' });
    ctx.prisma.aiJudgePass.findFirst.mockResolvedValue({ id: 'p1' });
    expect(await problemOf(ctx.service.remove(randomUUID()))).toMatchObject({ type: 'run-is-evidence' });
  });
});
