import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { AiAdapterRegistry } from '../adapters/ai-adapter.registry.js';
import { AdminSpend } from '../runner/admin-spend.service.js';
import { JudgePassesRepository } from './judge-passes.repository.js';
import { JudgePassesService } from './judge-passes.service.js';
import { JudgeScoresReader } from './judge-scores.reader.js';

const ADMIN = '11111111-1111-4111-8111-111111111111';
const NOW = new Date('2026-10-30T03:00:00Z');
const JUDGE = '22222222-2222-4222-8222-222222222222';
const R1 = '33333333-3333-4333-8333-333333333331';
const R2 = '33333333-3333-4333-8333-333333333332';
const MODEL = '44444444-4444-4444-8444-444444444444';
const RUN = '55555555-5555-4555-8555-555555555555';
const [I1, I2, I3, I4, I5] = ['a', 'b', 'c', 'd', 'e'].map((c) => `${c.repeat(8)}-${c.repeat(4)}-4${c.repeat(3)}-8${c.repeat(3)}-${c.repeat(12)}`);
const CRITERIA = [{ code: 'single_answer', question: 'Q1' }, { code: 'natural', question: 'Q2' }];
const IN = (word: string) => ({ word, part_of_speech: 'verb', level: 'B1', meaning_vi: 'x', context_label: null });
const OUT = (word: string) => ({ sentence: `We ___ ${word}.`, accepted_answers: [word], translation_vi: 'y' });

type Dict = Record<string, unknown>;
type RunItem = { id: string; runId: string; position: number; status: string; input: Dict | null; output: Dict | null };
type Score = { judgeRevisionId: string; subjectKind: string; subjectId: string; criterion: string; verdict: string | null; passId: string };

const priced = { id: MODEL, provider: 'anthropic', modelId: 'claude-x', thinkingOff: 'disabled', maxOutputTokens: 8000, priceInput: 1, priceCachedInput: null, priceOutput: 5 };

function setup(init: { model?: Dict | null; spend?: { spent: number; cap: number | null }; registered?: string[] } = {}) {
  const spendState = init.spend ?? { spent: 0, cap: 2 };
  const judge = { id: JUDGE, name: 'Chỉ một đáp án', operations: ['generate_cloze'], active: true, createdBy: ADMIN, createdAt: NOW };
  const revisions = [
    { id: R1, judgeId: JUDGE, revision: 1, criteria: CRITERIA, modelRef: MODEL, effort: null, thinking: null, maxOutputTokens: null },
    { id: R2, judgeId: JUDGE, revision: 2, criteria: CRITERIA, modelRef: MODEL, effort: 'low', thinking: null, maxOutputTokens: 700 },
  ];
  const model = init.model === undefined ? priced : init.model;
  const withModel = (row: (typeof revisions)[number] | undefined) => (row ? { ...row, model: row.modelRef ? model : null } : null);
  const state = {
    judge: { ...judge }, passes: [] as Dict[], passItems: [] as Dict[],
    runs: new Map<string, Dict>([[RUN, { id: RUN, operation: 'generate_cloze', status: 'finished', hiddenAt: null }]]),
    runItems: [] as RunItem[], scores: [] as Score[], enqueued: [] as string[],
  };
  const tx = {
    aiJudgePass: {
      create: vi.fn(async ({ data }: { data: Dict }) => {
        if (['queued', 'running'].includes(data.status as string) && state.passes.some((p) => p.judgeRevisionId === data.judgeRevisionId && ['queued', 'running'].includes(p.status as string))) {
          throw Object.assign(new Error('unique'), { code: 'P2002' });
        }
        const row = { id: randomUUID(), judged: 0, error: null, costUsd: null, createdAt: NOW, startedAt: null, finishedAt: null, evalRunId: null, ...data };
        state.passes.push(row);
        return row;
      }),
    },
    aiJudgePassItem: { createMany: vi.fn(async ({ data }: { data: Dict[] }) => { state.passItems.push(...data); return { count: data.length }; }) },
  };
  const prisma = {
    ...tx,
    aiJudge: { findUnique: vi.fn(async ({ where }: { where: { id: string } }) => (where.id === JUDGE ? state.judge : null)) },
    aiJudgeRevision: {
      findFirst: vi.fn(async ({ where }: { where: { judgeId: string } }) => withModel(revisions.filter((r) => r.judgeId === where.judgeId).sort((a, b) => b.revision - a.revision)[0])),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => revisions.find((r) => r.id === where.id) ?? null),
    },
    aiJudgeScore: {
      findMany: vi.fn(async ({ where }: { where: { judgeRevisionId: string; subjectId: { in: string[] } } }) =>
        state.scores.filter((s) => s.judgeRevisionId === where.judgeRevisionId && where.subjectId.in.includes(s.subjectId) && s.verdict !== null)),
      // groupBy by (passId, subjectId): one row per pair, as the database gives.
      groupBy: vi.fn(async ({ where }: { where: { passId: { in: string[] } } }) => {
        const pairs = new Map(state.scores.filter((s) => where.passId.in.includes(s.passId) && s.verdict === null).map((s) => [`${s.passId}|${s.subjectId}`, { passId: s.passId, subjectId: s.subjectId }]));
        return [...pairs.values()];
      }),
    },
    aiEvalRun: { findUnique: vi.fn(async ({ where }: { where: { id: string } }) => state.runs.get(where.id) ?? null) },
    aiEvalRunItem: {
      findMany: vi.fn(async ({ where }: { where: { runId: string; status?: string } }) =>
        state.runItems.filter((i) => i.runId === where.runId && (where.status === undefined || i.status === where.status)).sort((a, b) => a.position - b.position)),
    },
    $transaction: vi.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)),
  };
  Object.assign(prisma.aiJudgePass, {
    findFirst: vi.fn(async ({ where }: { where: { judgeRevisionId: string } }) =>
      state.passes.find((p) => p.judgeRevisionId === where.judgeRevisionId && ['queued', 'running'].includes(p.status as string)) ?? null),
    findMany: vi.fn(async ({ where }: { where: { id: { in: string[] } } }) => state.passes.filter((p) => where.id.in.includes(p.id as string)).map((p) => {
      const revision = revisions.find((r) => r.id === p.judgeRevisionId)!;
      return { ...p, revision: { ...revision, judge: state.judge, model: revision.modelRef ? model : null } };
    })),
  });
  const registry = new AiAdapterRegistry();
  for (const provider of init.registered ?? ['anthropic', 'fake']) registry.register({ provider } as never);
  const spend = new AdminSpend(
    { get: async () => ({ ai: { adminDailyUsdCap: spendState.cap } }) } as never, { adminSpentToday: async () => spendState.spent } as never,
  );
  const queue = { enqueueJudgePass: vi.fn(async (id: string) => { state.enqueued.push(id); return true; }) };
  const identity = { emailsOf: vi.fn(async (ids: string[]) => new Map(ids.filter((id) => id === ADMIN).map((id) => [id, 'admin@x.test']))) };
  const service = new JudgePassesService(
    new JudgePassesRepository(prisma as never, new JudgeScoresReader(prisma as never, identity as never)), new JudgeScoresReader(prisma as never, identity as never), spend, registry, queue as never, identity as never, new FakeClock(NOW),
  );
  return { service, prisma, tx, state, queue, spendState };
}

async function problemOf(promise: Promise<unknown>) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ProblemDetailsException);
  const problem = error as ProblemDetailsException;
  return { status: problem.getStatus(), type: problem.problemType, violations: (problem.extensions?.violations ?? []) as string[] };
}

const score = (subjectId: string, criterion: string, verdict: string | null, passId = 'old'): Score => ({
  judgeRevisionId: R2, subjectKind: 'eval_item', subjectId, criterion, verdict, passId,
});

function seedRun(ctx: ReturnType<typeof setup>) {
  ctx.state.runItems.push(
    { id: I1, runId: RUN, position: 0, status: 'succeeded', input: IN('one'), output: OUT('one') },
    { id: I2, runId: RUN, position: 1, status: 'succeeded', input: IN('two'), output: OUT('two') },
    { id: I3, runId: RUN, position: 2, status: 'succeeded', input: IN('three'), output: OUT('three') },
    { id: I4, runId: RUN, position: 3, status: 'transient_failure', input: IN('four'), output: null },
    { id: I5, runId: RUN, position: 4, status: 'succeeded', input: null, output: OUT('five') },
  );
}

describe('JudgePassesService.startable (B16, B22)', () => {
  let ctx: ReturnType<typeof setup>;
  beforeEach(() => { ctx = setup(); });

  it('the newest revision, its selection with the revision settings and the model price', async () => {
    await expect(ctx.service.startable(JUDGE, 'generate_cloze', NOW)).resolves.toEqual({
      judgeId: JUDGE, judgeRevisionId: R2, revision: 2, operation: 'generate_cloze',
      selection: {
        operation: 'judge', modelRef: MODEL, provider: 'anthropic', modelId: 'claude-x', effort: 'low', thinking: null, maxOutputTokens: 700,
        price: { input: 1, cachedInput: null, output: 5 },
      },
    });
  });

  it('refuses in order, each with its type: unknown judge 404, inactive 400, other operation 400, no model 409, provider off 409, unpriced 409, cap 409, running 409', async () => {
    expect(await problemOf(ctx.service.startable(randomUUID(), 'generate_cloze', NOW))).toMatchObject({ status: 404, type: 'not-found' });
    ctx.state.judge.active = false;
    expect(await problemOf(ctx.service.startable(JUDGE, 'generate_cloze', NOW))).toMatchObject({ status: 400, violations: ['judge_id: judge is not active'] });
    ctx.state.judge.active = true;
    expect(await problemOf(ctx.service.startable(JUDGE, 'lookup_word', NOW))).toMatchObject({ status: 400, violations: ['judge_id: judge does not score lookup_word'] });
    expect(await problemOf(setup({ model: null }).service.startable(JUDGE, 'generate_cloze', NOW))).toMatchObject({ status: 409, type: 'model-not-set' });
    expect(await problemOf(setup({ registered: ['fake'] }).service.startable(JUDGE, 'generate_cloze', NOW))).toMatchObject({ status: 409, type: 'provider-not-configured' });
    expect(await problemOf(setup({ model: { ...priced, priceOutput: null } }).service.startable(JUDGE, 'generate_cloze', NOW))).toMatchObject({ status: 409, type: 'model-price-missing' });
    ctx.spendState.spent = 2;
    expect(await problemOf(ctx.service.startable(JUDGE, 'generate_cloze', NOW))).toMatchObject({ status: 409, type: 'admin-usd-cap' });
    ctx.spendState.spent = 0;
    ctx.state.passes.push({ judgeRevisionId: R2, status: 'running' });
    expect(await problemOf(ctx.service.startable(JUDGE, 'generate_cloze', NOW))).toMatchObject({ status: 409, type: 'judge-pass-running' });
  });

  it('a queued or running pass of another revision of the same judge does not block (the rule is per revision)', async () => {
    ctx.state.passes.push({ judgeRevisionId: R1, status: 'queued' });
    await expect(ctx.service.startable(JUDGE, 'generate_cloze', NOW)).resolves.toMatchObject({ judgeRevisionId: R2 });
  });
});

describe('JudgePassesService.createForRun (B15, B16, Review focus 3)', () => {
  let ctx: ReturnType<typeof setup>;
  beforeEach(() => { ctx = setup(); seedRun(ctx); });

  it('B15: items scored completely by R2 are skipped, a NULL score or none are judged, a failed item or one without input never is; in position order, enqueued once', async () => {
    ctx.state.scores.push(
      score(I1, 'single_answer', 'pass'), score(I1, 'natural', 'fail_minor'),
      score(I2, 'single_answer', 'pass'), score(I2, 'natural', null),
    );
    const view = await ctx.service.createForRun(ADMIN, RUN, { judge_id: JUDGE });
    expect(ctx.state.passItems.map((item) => [item.subjectKind, item.subjectId, item.position])).toEqual([
      ['eval_item', I2, 0], ['eval_item', I3, 1],
    ]);
    expect(ctx.state.passItems[0]).toEqual({
      passId: view.id, position: 0, subjectKind: 'eval_item', subjectId: I2, input: IN('two'), output: OUT('two'),
    });
    expect(ctx.state.passes[0]).toMatchObject({
      kind: 'eval_run', operation: 'generate_cloze', evalRunId: RUN, judgeRevisionId: R2, status: 'queued', total: 2, startedBy: ADMIN,
    });
    expect(ctx.queue.enqueueJudgePass).toHaveBeenCalledExactlyOnceWith(view.id);
    expect(view).toEqual({
      id: view.id, kind: 'eval_run', operation: 'generate_cloze', eval_run_id: RUN, judge: { id: JUDGE, name: 'Chỉ một đáp án' },
      judge_revision: { id: R2, revision: 2, model: { provider: 'anthropic', model_id: 'claude-x' } }, status: 'queued', error: null, total: 2,
      judged: 0, unjudged: 0, cost_usd: null, started_by_user: { id: ADMIN, email: 'admin@x.test', system: false },
      created_at: NOW.toISOString(), started_at: null, finished_at: null,
    });
  });

  it('B15: every judgeable item already scored → the pass is finished with total 0 and nothing is enqueued', async () => {
    for (const id of [I1, I2, I3]) ctx.state.scores.push(score(id, 'single_answer', 'pass'), score(id, 'natural', 'pass'));
    const view = await ctx.service.createForRun(ADMIN, RUN, { judge_id: JUDGE });
    expect(view).toMatchObject({ status: 'finished', total: 0, judged: 0 });
    expect(ctx.state.passItems).toEqual([]);
    expect(ctx.queue.enqueueJudgePass).not.toHaveBeenCalled();
  });

  it('B16: an active pass of R2 → 409 judge-pass-running and nothing is inserted; the unique index losing a race says the same', async () => {
    ctx.state.passes.push({ judgeRevisionId: R2, status: 'queued' });
    expect(await problemOf(ctx.service.createForRun(ADMIN, RUN, { judge_id: JUDGE }))).toMatchObject({ status: 409, type: 'judge-pass-running' });
    expect(ctx.tx.aiJudgePass.create).not.toHaveBeenCalled();
    ctx.state.passes.length = 0;
    ctx.prisma.aiJudge.findUnique.mockResolvedValue(ctx.state.judge);
    ctx.tx.aiJudgePass.create.mockRejectedValueOnce(Object.assign(new Error('unique'), { code: 'P2002' }));
    expect(await problemOf(ctx.service.createForRun(ADMIN, RUN, { judge_id: JUDGE }))).toMatchObject({ status: 409, type: 'judge-pass-running' });
    expect(ctx.state.passItems).toEqual([]);
  });

  it('a run that is queued or running → 409 run-active; a missing or hidden run → 404; a finished or a failed run is allowed', async () => {
    for (const status of ['queued', 'running']) {
      ctx.state.runs.set(RUN, { id: RUN, operation: 'generate_cloze', status, hiddenAt: null });
      expect(await problemOf(ctx.service.createForRun(ADMIN, RUN, { judge_id: JUDGE }))).toMatchObject({ status: 409, type: 'run-active' });
    }
    expect(await problemOf(ctx.service.createForRun(ADMIN, randomUUID(), { judge_id: JUDGE }))).toMatchObject({ status: 404 });
    ctx.state.runs.set(RUN, { id: RUN, operation: 'generate_cloze', status: 'failed', hiddenAt: NOW });
    expect(await problemOf(ctx.service.createForRun(ADMIN, RUN, { judge_id: JUDGE }))).toMatchObject({ status: 404 });
    ctx.state.runs.set(RUN, { id: RUN, operation: 'generate_cloze', status: 'failed', hiddenAt: null });
    await expect(ctx.service.createForRun(ADMIN, RUN, { judge_id: JUDGE })).resolves.toMatchObject({ status: 'queued' });
  });

  it('a judge of another operation than the run → 400; a body without judge_id, or with another key → 400; an unpriced judge model → 409', async () => {
    ctx.state.runs.set(RUN, { id: RUN, operation: 'lookup_word', status: 'finished', hiddenAt: null });
    expect(await problemOf(ctx.service.createForRun(ADMIN, RUN, { judge_id: JUDGE }))).toMatchObject({ status: 400, violations: ['judge_id: judge does not score lookup_word'] });
    expect((await problemOf(ctx.service.createForRun(ADMIN, RUN, {} as never))).violations[0]).toMatch(/^judge_id: /);
    expect((await problemOf(ctx.service.createForRun(ADMIN, RUN, { judge_id: JUDGE, extra: 1 } as never))).status).toBe(400);
    const unpriced = setup({ model: { ...priced, priceInput: null } });
    seedRun(unpriced);
    expect(await problemOf(unpriced.service.createForRun(ADMIN, RUN, { judge_id: JUDGE }))).toMatchObject({ status: 409, type: 'model-price-missing' });
  });

  it('the judge job is asked for only after the pass exists (a Redis outage leaves it queued for the hourly recovery)', async () => {
    ctx.queue.enqueueJudgePass.mockResolvedValue(false);
    const view = await ctx.service.createForRun(ADMIN, RUN, { judge_id: JUDGE });
    expect(view.status).toBe('queued');
    expect(ctx.state.passes).toHaveLength(1);
  });
});

describe('JudgePassesService.createReal (contract §4, M4)', () => {
  const S1 = { subjectId: 'f1111111-1111-4111-8111-111111111111', input: IN('real1'), output: OUT('real1'), context: { session_words: ['alpha'] } };
  const S2 = { subjectId: 'f2222222-2222-4222-8222-222222222222', input: IN('real2'), output: OUT('real2'), context: null };
  let ctx: ReturnType<typeof setup>;
  beforeEach(() => { ctx = setup(); });

  it('a real pass for generate_cloze with a limit: kind real, no run, items real_question with their context, total set, enqueued', async () => {
    const { passId } = await ctx.service.createReal({
      judgeId: JUDGE, kind: 'real', filters: { operation: 'generate_cloze', limit: 200 }, subjects: [S1, S2], actorId: ADMIN,
    });
    expect(ctx.state.passes[0]).toMatchObject({
      id: passId, kind: 'real', operation: 'generate_cloze', limit: 200, evalRunId: null, filters: { operation: 'generate_cloze', limit: 200 },
      status: 'queued', total: 2, judgeRevisionId: R2, startedBy: ADMIN,
    });
    expect(ctx.state.passItems).toEqual([
      { passId, position: 0, subjectKind: 'real_question', subjectId: S1.subjectId, input: S1.input, output: S1.output, context: S1.context },
      { passId, position: 1, subjectKind: 'real_question', subjectId: S2.subjectId, input: S2.input, output: S2.output },
    ]);
    expect(ctx.queue.enqueueJudgePass).toHaveBeenCalledExactlyOnceWith(passId);
  });

  it('no filters.limit (or a non-integer) → the pass row has no limit; subjects already judged completely by that revision are left out', async () => {
    ctx.state.scores.push({ ...score(S1.subjectId, 'single_answer', 'pass'), subjectKind: 'real_question' }, { ...score(S1.subjectId, 'natural', 'pass'), subjectKind: 'real_question' });
    const { passId } = await ctx.service.createReal({
      judgeId: JUDGE, kind: 'real', filters: { operation: 'generate_cloze', limit: 'many' }, subjects: [S1, S2], actorId: ADMIN,
    });
    expect(ctx.state.passes[0]).toMatchObject({ id: passId, total: 1 });
    expect(ctx.state.passes[0]).not.toHaveProperty('limit');
    expect(ctx.state.passItems.map((item) => item.subjectId)).toEqual([S2.subjectId]);
  });

  it('every subject already judged, or none given → a finished pass with total 0, nothing enqueued', async () => {
    const empty = await ctx.service.createReal({ judgeId: JUDGE, kind: 'real', filters: { operation: 'generate_cloze' }, subjects: [], actorId: ADMIN });
    expect(ctx.state.passes.find((p) => p.id === empty.passId)).toMatchObject({ status: 'finished', total: 0 });
    expect(ctx.queue.enqueueJudgePass).not.toHaveBeenCalled();
  });

  it('filters without a valid operation → 400 filters.operation; a judge that does not score it → 400; an unknown judge → 404', async () => {
    expect((await problemOf(ctx.service.createReal({ judgeId: JUDGE, kind: 'real', filters: {}, subjects: [S1], actorId: ADMIN }))).violations[0]).toMatch(/^filters\.operation: /);
    expect((await problemOf(ctx.service.createReal({ judgeId: JUDGE, kind: 'real', filters: { operation: 'judge' }, subjects: [S1], actorId: ADMIN }))).violations[0]).toMatch(/^filters\.operation: /);
    expect(await problemOf(ctx.service.createReal({ judgeId: JUDGE, kind: 'real', filters: { operation: 'lookup_word' }, subjects: [S1], actorId: ADMIN })))
      .toMatchObject({ status: 400, violations: ['judge_id: judge does not score lookup_word'] });
    expect(await problemOf(ctx.service.createReal({ judgeId: randomUUID(), kind: 'real', filters: { operation: 'generate_cloze' }, subjects: [S1], actorId: ADMIN })))
      .toMatchObject({ status: 404 });
  });

  it('an active pass of the revision → 409 judge-pass-running', async () => {
    ctx.state.passes.push({ judgeRevisionId: R2, status: 'running' });
    expect(await problemOf(ctx.service.createReal({ judgeId: JUDGE, kind: 'real', filters: { operation: 'generate_cloze' }, subjects: [S1], actorId: ADMIN })))
      .toMatchObject({ status: 409, type: 'judge-pass-running' });
  });

  it('B16: a second real pass of the same revision while the first is still queued → 409 judge-pass-running; one pass, one queue message', async () => {
    const first = await ctx.service.createReal({ judgeId: JUDGE, kind: 'real', filters: { operation: 'generate_cloze' }, subjects: [S1], actorId: ADMIN });
    expect(ctx.state.passes).toHaveLength(1);
    expect(ctx.state.passes[0]).toMatchObject({ id: first.passId, status: 'queued' });
    expect(await problemOf(ctx.service.createReal({ judgeId: JUDGE, kind: 'real', filters: { operation: 'generate_cloze' }, subjects: [S2], actorId: ADMIN })))
      .toMatchObject({ status: 409, type: 'judge-pass-running' });
    expect(ctx.state.passes).toHaveLength(1);
    expect(ctx.queue.enqueueJudgePass).toHaveBeenCalledExactlyOnceWith(first.passId);
  });
});

describe('JudgePassesService.get', () => {
  it('counts the subjects of the pass that have a score without a verdict as unjudged; an unknown pass → 404', async () => {
    const ctx = setup();
    seedRun(ctx);
    const view = await ctx.service.createForRun(ADMIN, RUN, { judge_id: JUDGE });
    ctx.state.scores.push(score(I2, 'single_answer', null, view.id), score(I2, 'natural', null, view.id), score(I3, 'single_answer', null, view.id));
    await expect(ctx.service.get(view.id)).resolves.toMatchObject({ id: view.id, unjudged: 2 });
    expect(await problemOf(ctx.service.get(randomUUID()))).toMatchObject({ status: 404, type: 'not-found' });
  });
});
