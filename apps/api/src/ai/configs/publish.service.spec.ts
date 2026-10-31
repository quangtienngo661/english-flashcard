import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { PublishService } from './publish.service.js';

const ADMIN = '11111111-1111-4111-8111-111111111111';
const OP = 'generate_cloze';
const NOW = new Date('2026-10-30T04:00:00Z');
const MODEL_ID = '22222222-2222-4222-8222-222222222222';
const SET = 'aaaaaaaa-0000-4000-8000-000000000001';
const OLD_SET = 'aaaaaaaa-0000-4000-8000-000000000002';
const pass = { status: 'pass', problems: [], reason: null };
const model = (id = MODEL_ID, modelId = 'fake:ok') => ({ id, provider: 'fake', modelId });

type Cfg = {
  id: string; operation: string; number: number; version: number; instructions: string; examples: unknown; modelRef: string | null; effort: string | null;
  thinking: string | null; maxOutputTokens: number | null; status: string; createdFrom: string | null; note: string | null; createdBy: string;
  createdAt: Date; publishedBy: string | null; publishedAt: Date | null;
};
const config = (over: Partial<Cfg> = {}): Cfg => ({
  id: randomUUID(), operation: OP, number: 3, version: 0, instructions: 'Text.', examples: [], modelRef: MODEL_ID, effort: null, thinking: null, maxOutputTokens: null,
  status: 'published', createdFrom: null, note: null, createdBy: ADMIN, createdAt: NOW, publishedBy: ADMIN, publishedAt: NOW, ...over,
});

type Run = { id: string; configId: string; configVersion: number; setId: string; status: string; createdAt: Date };
type Item = { runId: string; exampleId: string; position: number; split: string; status: string; rule: unknown; expectedResult: string | null };
const run = (configId: string, configVersion: number, over: Partial<Run> = {}): Run => ({
  id: randomUUID(), configId, configVersion, setId: SET, status: 'finished', createdAt: NOW, ...over,
});
const item = (runId: string, exampleId: string, position: number, over: Partial<Item> = {}): Item => ({
  runId, exampleId, position, split: exampleId.startsWith('h') ? 'held_out' : 'dev', status: 'succeeded', rule: pass, expectedResult: 'pass', ...over,
});
/** A complete run of three dev examples and one held-out example; `failing` ids fail the rule. */
const goodItems = (runId: string, failing: string[] = []): Item[] => ['d1', 'd2', 'd3', 'h1'].map((id, i) =>
  item(runId, id, i, failing.includes(id) ? { rule: { status: 'fail', problems: ['x'], reason: null } } : {}));

type Setup = { draftVersion?: number; draftModel?: string | null; liveModel?: string | null; withSet?: boolean; pointerVersion?: number; previous?: boolean };

function setup(opts: Setup = {}) {
  const live = config({ number: 3, modelRef: opts.liveModel === undefined ? MODEL_ID : opts.liveModel });
  const previous = config({ number: 2, status: 'retired' });
  const draft = config({ number: 4, status: 'draft', version: opts.draftVersion ?? 1, modelRef: opts.draftModel === undefined ? MODEL_ID : opts.draftModel, publishedBy: null, publishedAt: null });
  const configs = [live, previous, draft];
  const pointer = { operation: OP, configId: live.id, previousConfigId: opts.previous === false ? null : previous.id, version: opts.pointerVersion ?? 4, lastNumber: 4 };
  const runs: Run[] = [];
  const items: Item[] = [];
  const events: Array<Record<string, unknown>> = [];
  const order: string[] = [];
  const withModel = (row: Cfg | undefined) => (row ? { ...row, model: row.modelRef ? model(row.modelRef) : null } : null);
  const tx = {
    aiLiveConfig: {
      updateMany: vi.fn(async ({ where, data }: { where: { operation: string; version: number }; data: { configId: string; previousConfigId: string | null; version: { increment: number } } }) => {
        order.push('pointer');
        if (pointer.operation !== where.operation || pointer.version !== where.version) return { count: 0 };
        pointer.configId = data.configId;
        pointer.previousConfigId = data.previousConfigId;
        pointer.version += data.version.increment;
        return { count: 1 };
      }),
    },
    aiConfig: {
      updateMany: vi.fn(async ({ where, data }: { where: { id: string; status?: string; version?: number }; data: Partial<Cfg> }) => {
        const row = configs.find((r) => r.id === where.id && (where.status === undefined || r.status === where.status) && (where.version === undefined || r.version === where.version));
        if (!row) return { count: 0 };
        order.push(data.status === 'published' && row.status === 'draft' ? 'draft' : 'live');
        Object.assign(row, data);
        return { count: 1 };
      }),
    },
    aiConfigEvent: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => { order.push('event'); events.push({ id: randomUUID(), at: NOW, ...data }); }),
    },
  };
  const prisma = {
    aiLiveConfig: { findUnique: vi.fn(async () => ({ ...pointer })) },
    aiConfig: {
      findFirst: vi.fn(async ({ where }: { where: { operation: string; status: string } }) => withModel(configs.find((r) => r.operation === where.operation && r.status === where.status))),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => withModel(configs.find((r) => r.id === where.id))),
      findMany: vi.fn(async ({ where }: { where: { id: { in: string[] } } }) => configs.filter((r) => where.id.in.includes(r.id)).map(withModel)),
    },
    aiEvalRun: {
      findMany: vi.fn(async ({ where }: { where: { configId: string; configVersion: number; setId: string; status: string } }) =>
        runs.filter((r) => r.configId === where.configId && r.configVersion === where.configVersion && r.setId === where.setId && r.status === where.status)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || (a.id < b.id ? 1 : -1))),
    },
    aiEvalRunItem: {
      findMany: vi.fn(async ({ where }: { where: { runId: { in: string[] } } }) => items.filter((i) => where.runId.in.includes(i.runId)).sort((a, b) => a.position - b.position)),
    },
    aiConfigEvent: {
      findMany: vi.fn(async (_args: unknown) => [...events].reverse()),
    },
    $transaction: vi.fn(async (work: (client: typeof tx) => Promise<unknown>) => work(tx)),
  };
  const configsService = { get: vi.fn(async (op: string) => ({ operation: op, live_version: pointer.version, live: { id: pointer.configId }, draft: configs.some((c) => c.status === 'draft') ? { id: draft.id } : null })) };
  const sets = { latest: vi.fn(async () => (opts.withSet === false ? null : { id: SET, version: 2 })) };
  const identity = { emailsOf: vi.fn(async (ids: string[]) => new Map(ids.filter((id) => id === ADMIN).map((id) => [id, 'admin@x.test']))) };
  const service = new PublishService(prisma as never, configsService as never, sets as never, identity as never, new FakeClock(NOW));
  return { service, prisma, tx, live, previous, draft, configs, pointer, runs, items, events, order, configsService, sets };
}

async function problemOf(promise: Promise<unknown>) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ProblemDetailsException);
  const problem = error as ProblemDetailsException;
  return { status: problem.getStatus(), type: problem.problemType, extensions: (problem.extensions ?? {}) as Record<string, unknown> };
}

/** The draft's complete run and the live config's complete run on the set. */
function withBothRuns(ctx: ReturnType<typeof setup>, draftFailing: string[] = []) {
  const candidate = run(ctx.draft.id, ctx.draft.version);
  const baseline = run(ctx.live.id, ctx.live.version);
  ctx.runs.push(candidate, baseline);
  ctx.items.push(...goodItems(candidate.id, draftFailing), ...goodItems(baseline.id));
  return { candidate, baseline };
}

describe('PublishService.check (design §6.3)', () => {
  it('no frozen set → no candidate, blocker eval-required', async () => {
    const ctx = setup({ withSet: false });
    const view = await ctx.service.check(OP);
    expect(view).toMatchObject({ set: null, candidate_run_id: null, turn_off: false, blockers: ['eval-required'] });
  });

  it('B25: a complete run of an older version of the draft does not count', async () => {
    const ctx = setup({ draftVersion: 2 });
    const stale = run(ctx.draft.id, 1);
    ctx.runs.push(stale);
    ctx.items.push(...goodItems(stale.id));
    const view = await ctx.service.check(OP);
    expect(view.candidate_run_id).toBeNull();
    expect(view.blockers).toContain('eval-required');
  });

  it('B27: a failed run, or a finished one with a skipped or pending item, is not complete', async () => {
    const ctx = setup();
    const failed = run(ctx.draft.id, 1, { status: 'failed' });
    const partial = run(ctx.draft.id, 1, { createdAt: new Date(NOW.getTime() + 1000) });
    ctx.runs.push(failed, partial);
    ctx.items.push(...goodItems(failed.id), ...goodItems(partial.id).map((entry, i) => (i === 0 ? { ...entry, status: 'skipped' } : entry)));
    expect((await ctx.service.check(OP)).blockers).toContain('eval-required');
    ctx.items.find((entry) => entry.runId === partial.id && entry.position === 0)!.status = 'pending';
    expect((await ctx.service.check(OP)).candidate_run_id).toBeNull();
  });

  it('B28: a live config with a model and no complete run of its own on the set → baseline required, blocker baseline-required', async () => {
    const ctx = setup();
    const candidate = run(ctx.draft.id, ctx.draft.version);
    ctx.runs.push(candidate);
    ctx.items.push(...goodItems(candidate.id));
    expect(await ctx.service.check(OP)).toMatchObject({
      candidate_run_id: candidate.id, baseline: { required: true, run_id: null }, blockers: ['baseline-required'], warnings: [],
    });
  });

  it('the newest complete run of the draft wins; a run on an older set is ignored', async () => {
    const ctx = setup();
    const older = run(ctx.draft.id, 1, { createdAt: new Date(NOW.getTime() - 1000) });
    const newer = run(ctx.draft.id, 1);
    const elsewhere = run(ctx.draft.id, 1, { setId: OLD_SET, createdAt: new Date(NOW.getTime() + 5000) });
    ctx.runs.push(older, newer, elsewhere);
    ctx.items.push(...goodItems(older.id), ...goodItems(newer.id), ...goodItems(elsewhere.id));
    expect((await ctx.service.check(OP)).candidate_run_id).toBe(newer.id);
  });

  it('both runs present → the warnings of the gate, no blocker', async () => {
    const ctx = setup();
    const { candidate, baseline } = withBothRuns(ctx, ['d1']);
    const view = await ctx.service.check(OP);
    expect(view).toMatchObject({
      turn_off: false, set: { id: SET, version: 2 }, candidate_run_id: candidate.id, baseline: { required: true, run_id: baseline.id }, blockers: [],
      draft: { id: ctx.draft.id, number: 4, version: 1 },
    });
    expect(view.warnings).toContainEqual({ code: 'dev-regressed', example_ids: ['d1'] });
  });

  it('no draft → 404', async () => {
    const ctx = setup();
    ctx.configs.splice(ctx.configs.indexOf(ctx.draft), 1);
    expect(await problemOf(ctx.service.check(OP))).toMatchObject({ status: 404, type: 'not-found' });
  });

  it('B29 (D37): a live config without a model needs no baseline and has no warning', async () => {
    const ctx = setup({ liveModel: null });
    const candidate = run(ctx.draft.id, ctx.draft.version);
    ctx.runs.push(candidate);
    ctx.items.push(...goodItems(candidate.id));
    const view = await ctx.service.check(OP);
    expect(view).toMatchObject({ turn_off: false, candidate_run_id: candidate.id, baseline: { required: false, run_id: null }, blockers: [], warnings: [] });
    // the live config's runs were never looked for
    const lookedFor = ctx.prisma.aiEvalRun.findMany.mock.calls.map(([args]) => (args as { where: { configId: string } }).where.configId);
    expect(lookedFor).not.toContain(ctx.live.id);
  });

  it('B48 (D38): a draft without a model is a turn-off: no run is read, nothing blocks', async () => {
    const ctx = setup({ draftModel: null });
    const view = await ctx.service.check(OP);
    expect(view).toMatchObject({ turn_off: true, candidate_run_id: null, baseline: { required: false, run_id: null }, blockers: [], warnings: [] });
    expect(ctx.prisma.aiEvalRun.findMany).not.toHaveBeenCalled();
  });
});

const body = (over: Record<string, unknown> = {}) => ({
  expected_version: 1, candidate_run_id: null as string | null, baseline_run_id: null as string | null, acknowledge_warnings: false, ...over,
});

describe('PublishService.publish', () => {
  it('no draft (published by a parallel request, or deleted) → 409 publish-stale, never 404', async () => {
    const ctx = setup();
    ctx.configs.splice(ctx.configs.indexOf(ctx.draft), 1);
    expect(await problemOf(ctx.service.publish(ADMIN, OP, body()))).toMatchObject({ status: 409, type: 'publish-stale' });
    expect(ctx.events).toEqual([]);
  });

  it('draft-version-conflict first when expected_version is not the draft version', async () => {
    const ctx = setup({ draftVersion: 2 });
    expect(await problemOf(ctx.service.publish(ADMIN, OP, body({ expected_version: 1 })))).toMatchObject({ status: 409, type: 'draft-version-conflict' });
  });

  it('B27: no candidate → 409 eval-required', async () => {
    const ctx = setup();
    expect(await problemOf(ctx.service.publish(ADMIN, OP, body()))).toMatchObject({ status: 409, type: 'eval-required' });
  });

  it('B28: a candidate but no baseline for a live config with a model → 409 baseline-required', async () => {
    const ctx = setup();
    const candidate = run(ctx.draft.id, 1);
    ctx.runs.push(candidate);
    ctx.items.push(...goodItems(candidate.id));
    expect(await problemOf(ctx.service.publish(ADMIN, OP, body({ candidate_run_id: candidate.id })))).toMatchObject({ status: 409, type: 'baseline-required' });
  });

  it('B30: run ids that are not the ones the check found → 409 publish-stale', async () => {
    const ctx = setup();
    const { candidate, baseline } = withBothRuns(ctx);
    expect(await problemOf(ctx.service.publish(ADMIN, OP, body({ candidate_run_id: randomUUID(), baseline_run_id: baseline.id })))).toMatchObject({ status: 409, type: 'publish-stale' });
    expect(await problemOf(ctx.service.publish(ADMIN, OP, body({ candidate_run_id: candidate.id, baseline_run_id: randomUUID() })))).toMatchObject({ status: 409, type: 'publish-stale' });
  });

  it('B30: warnings without acknowledge_warnings → 409 publish-warnings carrying the check\'s list; with it the publish goes through', async () => {
    const ctx = setup();
    const { candidate, baseline } = withBothRuns(ctx, ['d1']);
    const asked = body({ candidate_run_id: candidate.id, baseline_run_id: baseline.id });
    const refused = await problemOf(ctx.service.publish(ADMIN, OP, asked));
    expect(refused).toMatchObject({ status: 409, type: 'publish-warnings' });
    expect(refused.extensions.warnings).toEqual((await ctx.service.check(OP)).warnings);
    await ctx.service.publish(ADMIN, OP, { ...asked, acknowledge_warnings: true });
    expect(ctx.events[0]).toMatchObject({ kind: 'publish', warnings: expect.arrayContaining([expect.objectContaining({ code: 'dev-regressed' })]) });
    expect((ctx.events[0]!.warnings as unknown[]).length).toBe(refused.extensions.warnings instanceof Array ? refused.extensions.warnings.length : -1);
  });

  it('a clean publish: pointer, draft, live, event in that order; both run ids on the event; the view has no draft and the old live as previous', async () => {
    const ctx = setup();
    const { candidate, baseline } = withBothRuns(ctx);
    const oldLive = ctx.live.id;
    const view = await ctx.service.publish(ADMIN, OP, body({ candidate_run_id: candidate.id, baseline_run_id: baseline.id }));
    expect(ctx.order).toEqual(['pointer', 'draft', 'live', 'event']);
    expect(ctx.pointer).toMatchObject({ configId: ctx.draft.id, previousConfigId: oldLive, version: 5 });
    expect(ctx.draft).toMatchObject({ status: 'published', publishedBy: ADMIN, publishedAt: NOW });
    expect(ctx.live.status).toBe('retired');
    expect(ctx.events).toHaveLength(1);
    expect(ctx.events[0]).toMatchObject({
      operation: OP, kind: 'publish', configId: ctx.draft.id, fromConfigId: oldLive, candidateRunId: candidate.id, baselineRunId: baseline.id, warnings: [], actorId: ADMIN,
    });
    expect(view).toMatchObject({ live: { id: ctx.draft.id } });
  });

  it('B31: the pointer moved since it was read (a parallel publish) → 409 publish-stale and no event', async () => {
    const ctx = setup();
    const { candidate, baseline } = withBothRuns(ctx);
    ctx.tx.aiLiveConfig.updateMany.mockImplementationOnce(async () => { ctx.order.push('pointer'); return { count: 0 }; });
    expect(await problemOf(ctx.service.publish(ADMIN, OP, body({ candidate_run_id: candidate.id, baseline_run_id: baseline.id })))).toMatchObject({ status: 409, type: 'publish-stale' });
    expect(ctx.events).toEqual([]);
    expect(ctx.draft.status).toBe('draft');
  });

  it('B29 (D37): a live config without a model → published on the draft\'s complete run alone, event baselineRunId null', async () => {
    const ctx = setup({ liveModel: null });
    const candidate = run(ctx.draft.id, ctx.draft.version);
    ctx.runs.push(candidate);
    ctx.items.push(...goodItems(candidate.id));
    await ctx.service.publish(ADMIN, OP, body({ candidate_run_id: candidate.id }));
    expect(ctx.events[0]).toMatchObject({ candidateRunId: candidate.id, baselineRunId: null, warnings: [] });
  });

  it('B29 (D37): still needs the complete run (eval-required) and refuses a baseline id nobody asked for (publish-stale)', async () => {
    const ctx = setup({ liveModel: null });
    expect(await problemOf(ctx.service.publish(ADMIN, OP, body()))).toMatchObject({ status: 409, type: 'eval-required' });
    const candidate = run(ctx.draft.id, ctx.draft.version);
    ctx.runs.push(candidate);
    ctx.items.push(...goodItems(candidate.id));
    expect(await problemOf(ctx.service.publish(ADMIN, OP, body({ candidate_run_id: candidate.id, baseline_run_id: randomUUID() })))).toMatchObject({ status: 409, type: 'publish-stale' });
  });

  describe('B48 (D38): turning an operation off', () => {
    it('a draft without a model publishes with no run: pointer, draft, live, event; the event has no run and no warning', async () => {
      const ctx = setup({ draftModel: null });
      const view = await ctx.service.publish(ADMIN, OP, body());
      expect(ctx.order).toEqual(['pointer', 'draft', 'live', 'event']);
      expect(ctx.events[0]).toMatchObject({ kind: 'publish', candidateRunId: null, baselineRunId: null, warnings: [] });
      expect(view).toMatchObject({ live: { id: ctx.draft.id } });
      expect(ctx.prisma.aiEvalRun.findMany).not.toHaveBeenCalled();
    });

    it('the version is still checked; a run id is refused; the pointer race is still caught', async () => {
      const ctx = setup({ draftModel: null });
      expect(await problemOf(ctx.service.publish(ADMIN, OP, body({ expected_version: 0 })))).toMatchObject({ status: 409, type: 'draft-version-conflict' });
      expect(await problemOf(ctx.service.publish(ADMIN, OP, body({ candidate_run_id: randomUUID() })))).toMatchObject({ status: 409, type: 'publish-stale' });
      ctx.tx.aiLiveConfig.updateMany.mockImplementationOnce(async () => ({ count: 0 }));
      expect(await problemOf(ctx.service.publish(ADMIN, OP, body()))).toMatchObject({ status: 409, type: 'publish-stale' });
      expect(ctx.events).toEqual([]);
    });

    it('a rollback turns the operation back on', async () => {
      const ctx = setup({ draftModel: null });
      await ctx.service.publish(ADMIN, OP, body());
      const turnedOff = ctx.pointer.version;
      const oldLive = ctx.pointer.previousConfigId;
      await ctx.service.rollback(ADMIN, OP, { expected_live_version: turnedOff });
      expect(ctx.pointer.configId).toBe(oldLive);
    });
  });
});

describe('PublishService.rollback', () => {
  it('B32: nothing before the live config → 409 no-previous', async () => {
    const ctx = setup({ previous: false });
    expect(await problemOf(ctx.service.rollback(ADMIN, OP, { expected_live_version: 4 }))).toMatchObject({ status: 409, type: 'no-previous' });
  });

  it('Review focus 2: a page that is behind (version 3, pointer at 4) → 409 publish-stale and nothing is written', async () => {
    const ctx = setup();
    expect(await problemOf(ctx.service.rollback(ADMIN, OP, { expected_live_version: 3 }))).toMatchObject({ status: 409, type: 'publish-stale' });
    expect(ctx.order).toEqual([]);
    expect(ctx.events).toEqual([]);
  });

  it('puts the previous config back: previous published, live retired, pointer without a previous and one version on, the draft untouched, one rollback event', async () => {
    const ctx = setup();
    const previousId = ctx.previous.id;
    const liveId = ctx.live.id;
    await ctx.service.rollback(ADMIN, OP, { expected_live_version: 4 });
    expect(ctx.pointer).toMatchObject({ configId: previousId, previousConfigId: null, version: 5 });
    expect(ctx.previous.status).toBe('published');
    expect(ctx.live.status).toBe('retired');
    expect(ctx.draft.status).toBe('draft');
    expect(ctx.events).toHaveLength(1);
    expect(ctx.events[0]).toMatchObject({ kind: 'rollback', configId: previousId, fromConfigId: liveId, actorId: ADMIN, candidateRunId: null, baselineRunId: null });
  });

  it('the pointer moved between the read and the write → 409 publish-stale', async () => {
    const ctx = setup();
    ctx.tx.aiLiveConfig.updateMany.mockImplementationOnce(async () => ({ count: 0 }));
    expect(await problemOf(ctx.service.rollback(ADMIN, OP, { expected_live_version: 4 }))).toMatchObject({ status: 409, type: 'publish-stale' });
    expect(ctx.events).toEqual([]);
  });
});

describe('PublishService.history', () => {
  it('newest first, each event with who, the config number and its model, and where it came from', async () => {
    const ctx = setup();
    ctx.events.push(
      { id: 'e1', operation: OP, kind: 'publish', configId: ctx.live.id, fromConfigId: ctx.previous.id, candidateRunId: 'r1', baselineRunId: null, warnings: [], actorId: ADMIN, at: new Date('2026-10-29T00:00:00Z') },
      { id: 'e2', operation: OP, kind: 'rollback', configId: ctx.previous.id, fromConfigId: ctx.live.id, candidateRunId: null, baselineRunId: null, warnings: [], actorId: ADMIN, at: new Date('2026-10-30T00:00:00Z') },
    );
    const { items, next_page_token: next } = await ctx.service.history(OP, 20, undefined);
    expect(next).toBeNull();
    expect(items.map((entry) => entry.id)).toEqual(['e2', 'e1']);
    expect(items[0]).toMatchObject({
      kind: 'rollback', actor_user: { email: 'admin@x.test' }, config: { id: ctx.previous.id, number: 2, model_id: 'fake:ok' },
      from_config: { id: ctx.live.id, number: 3 }, candidate_run_id: null,
    });
  });

  it('a page smaller than the list gives a token', async () => {
    const ctx = setup();
    for (const id of ['e1', 'e2', 'e3']) {
      ctx.events.push({ id, operation: OP, kind: 'publish', configId: ctx.live.id, fromConfigId: null, candidateRunId: null, baselineRunId: null, warnings: [], actorId: ADMIN, at: NOW });
    }
    const { items, next_page_token: next } = await ctx.service.history(OP, 2, undefined);
    expect(items).toHaveLength(2);
    expect(next).not.toBeNull();
  });
});
