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
  maxOutputTokens: 4096, price: null,
};
const NOW = new Date('2026-10-28T03:00:00Z');
const [EX1, EX2] = [randomUUID(), randomUUID()];
const EXAMPLE_INPUT = { word: 'deploy', part_of_speech: 'verb', level: 'B1', meaning_vi: 'triển khai', context_label: null };

function setup() {
  const created: Array<Record<string, unknown>> = [];
  const prisma = {
    aiEvalExample: { findMany: vi.fn(async () => [{ id: EX1 }, { id: EX2 }]) },
    aiEvalRun: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const row = { id: randomUUID(), ...data };
        created.push(row);
        return row;
      }),
      findUnique: vi.fn(async (): Promise<Record<string, unknown> | null> => null),
      findMany: vi.fn(async (): Promise<Array<Record<string, unknown>>> => []),
      updateMany: vi.fn(async (): Promise<{ count: number }> => ({ count: 0 })),
      deleteMany: vi.fn(async (): Promise<{ count: number }> => ({ count: 0 })),
    },
    aiCall: { deleteMany: vi.fn(async () => ({ count: 0 })) },
    $executeRaw: vi.fn(async () => 0),
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
  return { service, prisma, created, selections, registry, prompts, queue, emailsOf, limiter };
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

  it('the row stores the resolved selection, the current revision, the example ids and their number; enqueued; 202 body', async () => {
    const answer = await ctx.service.create(ADMIN, { operation: 'generate_cloze', prompt: 'current' });
    expect(ctx.created).toHaveLength(1);
    expect(ctx.created[0]).toMatchObject({
      operation: 'generate_cloze', provider: 'fake', model: 'fake:ok', effort: null, thinking: 'disabled', maxOutputTokens: 4096,
      promptRevision: 4, exampleIds: [EX1, EX2], status: 'queued', total: 2, startedBy: ADMIN,
    });
    expect(ctx.created[0]).not.toHaveProperty('draft');
    expect(ctx.prisma.aiEvalExample.findMany).toHaveBeenCalledWith({
      where: { operation: 'generate_cloze' }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], select: { id: true },
    });
    expect(ctx.queue.enqueue).toHaveBeenCalledWith(ctx.created[0]!.id);
    expect(answer).toEqual({ run_id: ctx.created[0]!.id, status: 'queued' });
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
    expect(ctx.limiter.hit.mock.invocationCallOrder[0]!).toBeLessThan(ctx.prisma.aiEvalRun.create.mock.invocationCallOrder[0]!);
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
});

function runRow(startedBy: string, id: string = randomUUID()) {
  return {
    id, operation: 'generate_cloze', provider: 'fake', model: 'fake:ok', effort: null, thinking: 'disabled', maxOutputTokens: 4096,
    promptRevision: 4, draft: null, status: 'done', total: 2, items: [], validCount: 2, avgLatencyMs: 5, costUsd: null,
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
