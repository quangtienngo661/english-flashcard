import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { Selection } from '../runner/selection.js';
import { AI_SYSTEM_ACTOR_ID } from '../ai.constants.js';
import { EvalRunsService } from './eval-runs.service.js';

const ADMIN = '11111111-1111-4111-8111-111111111111';
const SELECTION: Selection = {
  operation: 'generate_cloze', modelRef: randomUUID(), provider: 'fake', modelId: 'fake:ok', effort: null, thinking: 'disabled',
  maxOutputTokens: 4096, price: { input: 1, cachedInput: null, output: 2 },
};
const NOW = new Date('2026-10-28T03:00:00Z');
const [EX1, EX2] = [randomUUID(), randomUUID()];
const EXAMPLE_INPUT = { word: 'deploy', part_of_speech: 'verb', level: 'B1', meaning_vi: 'triển khai', context_label: null };
const IN1 = { word: 'one' };
const IN2 = { word: 'two' };

function setup() {
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
  };
  const prisma = {
    aiEvalExample: {
      findMany: vi.fn(async () => [{ id: EX1, split: 'dev', input: IN1, expected: null }, { id: EX2, split: 'dev', input: IN2, expected: null }]),
    },
    aiEvalRun: {
      create: vi.fn(),
      findUnique: vi.fn(async (): Promise<Record<string, unknown> | null> => null),
      findMany: vi.fn(async (): Promise<Array<Record<string, unknown>>> => []),
      updateMany: vi.fn(async (): Promise<{ count: number }> => ({ count: 0 })),
      deleteMany: vi.fn(async (): Promise<{ count: number }> => ({ count: 0 })),
    },
    aiEvalRunItem: {
      findMany: vi.fn(async (_args?: unknown): Promise<Array<Record<string, unknown>>> => []),
      groupBy: vi.fn(async (_args?: unknown): Promise<Array<{ runId: string; status: string; _count: { _all: number } }>> => []),
    },
    aiEvalSet: {
      findUnique: vi.fn(async (_args?: unknown): Promise<Record<string, unknown> | null> => null),
      findMany: vi.fn(async (_args?: unknown): Promise<Array<{ id: string; version: number }>> => []),
    },
    aiEvalSetItem: { findMany: vi.fn(async (_args?: unknown): Promise<Array<Record<string, unknown>>> => []) },
    aiCall: { deleteMany: vi.fn(async () => ({ count: 0 })) },
    $executeRaw: vi.fn(async () => 0),
    $transaction: vi.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)),
  };
  const selections = { load: vi.fn(async (): Promise<Selection | null> => SELECTION) };
  const registry = { get: vi.fn((provider: string) => (provider === 'fake' ? {} : undefined)) };
  const prompts = { current: vi.fn(async () => ({ instructions: 'x', examples: [], revision: 4 })) };
  const queue = { enqueue: vi.fn(async () => true) };
  const emailsOf = vi.fn(async (ids: string[]) => new Map(ids.filter((id) => id === ADMIN).map((id) => [id, 'admin@x.test'])));
  const limiter = { hit: vi.fn(async (): Promise<void> => undefined) };
  const service = new EvalRunsService(
    prisma as never, selections as never, registry as never, prompts as never, queue as never, { emailsOf } as never,
    limiter as never, new FakeClock(NOW),
  );
  return { service, prisma, tx, created, selections, registry, prompts, queue, emailsOf, limiter };
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

  it('E1: the row stores the resolved selection, the current revision, the price and the number of examples; enqueued; 202 body', async () => {
    const answer = await ctx.service.create(ADMIN, { operation: 'generate_cloze', prompt: 'current' });
    expect(ctx.created).toHaveLength(1);
    expect(ctx.created[0]).toMatchObject({
      operation: 'generate_cloze', provider: 'fake', model: 'fake:ok', effort: null, thinking: 'disabled', maxOutputTokens: 4096,
      promptRevision: 4, priceInput: 1, priceCachedInput: null, priceOutput: 2, status: 'queued', total: 2, startedBy: ADMIN,
    });
    expect(ctx.created[0]).not.toHaveProperty('draft');
    expect(ctx.created[0]).not.toHaveProperty('exampleIds');
    expect(ctx.prisma.aiEvalExample.findMany).toHaveBeenCalledWith({
      where: { operation: 'generate_cloze' }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], select: { id: true, split: true, input: true, expected: true },
    });
    expect(ctx.queue.enqueue).toHaveBeenCalledWith(ctx.created[0]!.id);
    expect(answer).toEqual({ run_id: ctx.created[0]!.id, status: 'queued' });
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

  it('E1: a model with no price leaves the three price columns null', async () => {
    ctx.selections.load.mockResolvedValue({ ...SELECTION, price: null });
    await ctx.service.create(ADMIN, { operation: 'generate_cloze', prompt: 'current' });
    expect(ctx.created[0]).toMatchObject({ priceInput: null, priceCachedInput: null, priceOutput: null });
  });

  it('the row stores the draft and no revision', async () => {
    const draft = { instructions: 'Draft.', examples: [{ input: EXAMPLE_INPUT, output: {
      sentence: 'We ___ on Friday.', accepted_answers: ['deploy'], translation_vi: 'Chúng tôi triển khai vào thứ Sáu.',
    } }] };
    await ctx.service.create(ADMIN, { operation: 'generate_cloze', prompt: draft });
    expect(ctx.created[0]).toMatchObject({ draft, promptRevision: null });
    expect(ctx.prompts.current).not.toHaveBeenCalled();
  });

  it('B6E73: no model → 409 model-not-set, no row', async () => {
    ctx.selections.load.mockResolvedValue(null);
    const problem = await problemOf(ctx.service.create(ADMIN, { operation: 'generate_cloze', prompt: 'current' }));
    expect(problem).toMatchObject({ status: 409, type: 'model-not-set' });
    expect(ctx.created).toHaveLength(0);
    expect(ctx.queue.enqueue).not.toHaveBeenCalled();
  });

  it('provider not registered → 409 provider-not-configured, no row', async () => {
    ctx.selections.load.mockResolvedValue({ ...SELECTION, provider: 'openai' });
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
    ctx.selections.load.mockResolvedValueOnce(null);
    await problemOf(ctx.service.create(ADMIN, { operation: 'generate_cloze', prompt: 'current' }));
    ctx.selections.load.mockResolvedValueOnce({ ...SELECTION, provider: 'openai' });
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

describe('EvalRunsService.list by set', () => {
  it('B8: set_id narrows the runs and is part of the page token binding', async () => {
    const ctx = setup();
    const S1 = randomUUID();
    ctx.prisma.aiEvalRun.findMany.mockResolvedValueOnce([]);
    await ctx.service.list('generate_cloze', 20, undefined, S1);
    expect(ctx.prisma.aiEvalRun.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { operation: 'generate_cloze', setId: S1 } }));
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
    setId: null, legacy: false,
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
