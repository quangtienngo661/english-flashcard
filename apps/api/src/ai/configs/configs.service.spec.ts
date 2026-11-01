import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { AiAdapterRegistry } from '../adapters/ai-adapter.registry.js';
import { EvalRulesRegistry, type EvalRules } from '../eval/eval-rules.port.js';
import { AdminSpend } from '../runner/admin-spend.service.js';
import type { RunReport } from '../runner/runner.service.js';
import { ConfigsService } from './configs.service.js';
import { configFingerprint, contentOfConfig } from './config-snapshot.js';

const ADMIN = '11111111-1111-4111-8111-111111111111';
const OP = 'generate_cloze';
const NOW = new Date('2026-10-30T03:00:00Z');
const MODEL_ID = '22222222-2222-4222-8222-222222222222';
const OTHER_MODEL_ID = '33333333-3333-4333-8333-333333333333';
const UNPRICED_MODEL_ID = '55555555-5555-4555-8555-555555555555';
const EXAMPLE = {
  input: { word: 'deploy', part_of_speech: 'verb', level: 'B1', meaning_vi: 'triển khai', context_label: null },
  output: { sentence: 'We will ___ it.', accepted_answers: ['deploy'], translation_vi: 'Chúng tôi sẽ triển khai.' },
};

type Cfg = {
  id: string; operation: string; number: number; version: number; instructions: string; examples: unknown; modelRef: string | null; effort: string | null;
  thinking: string | null; maxOutputTokens: number | null; status: string; createdFrom: string | null; note: string | null; createdBy: string;
  name: string | null; deletedAt: Date | null; updatedAt: Date; fingerprint: string | null;
  createdAt: Date; publishedBy: string | null; publishedAt: Date | null;
};
const config = (over: Partial<Cfg> = {}): Cfg => ({
  id: randomUUID(), operation: OP, number: 3, version: 0, instructions: 'Write one sentence.', examples: [EXAMPLE], modelRef: MODEL_ID, effort: null, thinking: null,
  maxOutputTokens: null, status: 'published', createdFrom: null, note: null, createdBy: ADMIN, createdAt: NOW, name: null, deletedAt: null, updatedAt: NOW, fingerprint: null, publishedBy: ADMIN, publishedAt: NOW, ...over,
});
const model = (id: string, over: Record<string, unknown> = {}) => ({
  id, provider: 'fake', modelId: 'fake:ok', effortLevels: [], thinkingOff: null, maxOutputTokens: 4096, priceInput: 0, priceCachedInput: 0, priceOutput: 0, ...over,
});
type Filter = Record<string, any>;
function matches(row: Record<string, any>, where: Filter): boolean {
  return Object.entries(where).every(([key, value]) => {
    if (key === 'OR') return value.some((part: Filter) => matches(row, part));
    if (key === 'AND') return value.every((part: Filter) => matches(row, part));
    if (value instanceof Date) return row[key] instanceof Date && row[key].getTime() === value.getTime();
    if (value && typeof value === 'object' && !(value instanceof Date)) {
      if ('in' in value) return value.in.includes(row[key]);
      if ('lt' in value) return row[key] < value.lt;
      return row[key] != null && matches(row[key], value);
    }
    return row[key] === value;
  });
}

/** The real AdminSpend over a stub ledger and settings: the cap and the day's spend are the test's to set (nhóm B M3). */
function spendOf(state: { spent: number; cap: number | null }) {
  return new AdminSpend(
    { get: async () => ({ ai: { adminDailyUsdCap: state.cap } }) } as never,
    { adminSpentToday: async () => state.spent } as never,
  );
}

function setup(init: { lastNumber?: number } = {}) {
  const spend = { spent: 0, cap: 2 as number | null };
  const live = config({ id: randomUUID(), number: 3 });
  const retired = config({ number: 2, status: 'retired' });
  const otherOperation = config({ operation: 'lookup_word', number: 1 });
  const configs: Cfg[] = [live, retired, otherOperation];
  const pointer = { operation: OP, configId: live.id, previousConfigId: retired.id, version: 4, lastNumber: init.lastNumber ?? 3 };
  const models = new Map([[MODEL_ID, model(MODEL_ID)], [OTHER_MODEL_ID, model(OTHER_MODEL_ID, { provider: 'openai', modelId: 'gpt-x', effortLevels: [] })],
    [UNPRICED_MODEL_ID, model(UNPRICED_MODEL_ID, { priceInput: null, priceCachedInput: null, priceOutput: null })]]);
  const runs: Array<{ configId: string; status: string }> = [];
  const examples: Array<{ id: string; operation: string; split: string; input: unknown }> = [{ id: 'dev1', operation: OP, split: 'dev', input: EXAMPLE.input }];
  const withModel = (row: Cfg | undefined | null) => (row ? { ...row, model: row.modelRef ? models.get(row.modelRef) ?? null : null } : null);
  const revisions: Array<Record<string, any>> = [];
  const batchRows: Array<{ id: string; configId: string; kind: string; status: string }> = [];
  const prisma = {
    aiLiveConfig: {
      findUnique: vi.fn(async ({ where }: { where: { operation: string } }) => (where.operation === OP ? pointer : null)),
      update: vi.fn(async ({ data }: { data: { lastNumber: { increment: number } } }) => { pointer.lastNumber += data.lastNumber.increment; return pointer; }),
    },
    aiConfig: {
      findMany: vi.fn(async ({ where, take }: { where: Filter; take?: number }) => configs.filter((row) => matches(row, where)).sort((a, b) => b.number - a.number).slice(0, take).map(withModel)),
      findFirst: vi.fn(async ({ where }: { where: Filter }) => withModel(configs.find((row) => matches(row, where)))),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => withModel(configs.find((row) => row.id === where.id))),
      create: vi.fn(async ({ data }: { data: Partial<Cfg> }) => {
        const row = config({ ...data, id: randomUUID(), publishedBy: null, publishedAt: null });
        configs.push(row);
        return withModel(row);
      }),
      updateMany: vi.fn(async ({ where, data }: { where: Filter; data: Record<string, unknown> }) => {
        const row = configs.find((r) => matches(r, where));
        if (!row) return { count: 0 };
        const { version, ...rest } = data;
        Object.assign(row, rest, version === undefined ? {} : { version: typeof version === 'number' ? version : row.version + (version as { increment: number }).increment });
        return { count: 1 };
      }),
      delete: vi.fn(async ({ where }: { where: { id: string } }) => {
        const index = configs.findIndex((row) => row.id === where.id);
        if (index >= 0) configs.splice(index, 1);
      }),
    },
    $queryRaw: vi.fn(async (_sql: TemplateStringsArray, id: string, op: string) => configs.filter((row) => row.id === id && row.operation === op && row.status === 'draft' && row.deletedAt === null).map((row) => ({ id: row.id }))),
    aiBatch: { count: vi.fn(async ({ where }: { where: Filter }) => batchRows.filter((row) => matches(row, where)).length) },
    aiConfigRevision: {
      create: vi.fn(async ({ data }: { data: Record<string, any> }) => { const revision = { id: randomUUID(), savedAt: NOW, ...data }; revisions.push(revision); return revision; }),
      findMany: vi.fn(async ({ where, take, orderBy, cursor, skip = 0 }: { where: Filter; take: number; orderBy: Filter[]; cursor?: { id: string }; skip?: number }) => { const sorted = revisions.map<Record<string, any>>((r) => ({ ...r, config: configs.find((c) => c.id === r.configId) })).filter((r) => matches(r, where)).sort((a, b) => {
        for (const sort of orderBy) { const key = Object.keys(sort)[0]!; const sign = sort[key] === 'desc' ? -1 : 1; if (a[key] < b[key]) return -sign; if (a[key] > b[key]) return sign; } return 0;
      }); const start = cursor ? sorted.findIndex((r) => r.id === cursor.id) + skip : 0; return sorted.slice(start, start + take); }),
    },
    aiModel: { findUnique: vi.fn(async ({ where }: { where: { id: string } }) => models.get(where.id) ?? null) },
    aiEvalRun: { count: vi.fn(async ({ where }: { where: { configId: string; status: { in: string[] } } }) =>
      runs.filter((run) => run.configId === where.configId && where.status.in.includes(run.status)).length) },
    aiEvalExample: {
      findMany: vi.fn(async ({ where }: { where: { operation?: string; split?: string; id?: { in: string[] } } }) =>
        examples.filter((row) => (where.operation === undefined || row.operation === where.operation) && (where.split === undefined || row.split === where.split)
          && (!where.id || where.id.in.includes(row.id)))),
    },
    $transaction: vi.fn(async (work: (client: unknown) => Promise<unknown>) => work(prisma)),
  };
  const identity = { emailsOf: vi.fn(async (ids: string[]) => new Map(ids.filter((id) => id === ADMIN).map((id) => [id, 'admin@x.test']))) };
  const settings = { get: vi.fn(async () => ({ ai: { usdVndRate: 26_100 } })) };
  const registry = new AiAdapterRegistry();
  registry.register({ provider: 'fake' } as never);
  const rules = new EvalRulesRegistry();
  const report: RunReport = {
    result: { status: 'succeeded', operation_id: 't', result: EXAMPLE.output, meta: {} as never },
    calls: [{ attempt: 1, outcome: 'succeeded', latency_ms: 100, cost_usd: '0.00010000', http_status: null, call_id: 'C1' }], rawOutput: '{}',
  };
  const runner = { execute: vi.fn(async (_input: unknown) => report) };
  const limiter = { hit: vi.fn(async (): Promise<void> => undefined) };
  const batches = {
    create: vi.fn(async (input: Record<string, any>, _tx?: unknown) => { batchRows.push({ id: 'batch-1', configId: input.configId, kind: input.kind, status: 'queued' }); return 'batch-1'; }),
    start: vi.fn(async (id: string) => { const row = batchRows.find((r) => r.id === id); if (row) row.status = 'running'; }),
    finish: vi.fn(async (id: string, status?: string) => { const row = batchRows.find((r) => r.id === id); if (row) row.status = status ?? 'finished'; }),
  };
  const service = new ConfigsService(prisma as never, identity as never, settings as never, registry, rules, runner as never, limiter as never, spendOf(spend), new FakeClock(NOW), batches as never);
  return { service, prisma, configs, live, retired, otherOperation, pointer, runs, examples, rules, runner, limiter, registry, spend, revisions, batches, batchRows };
}

async function problemOf(promise: Promise<unknown>) {
  const error = await promise.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(ProblemDetailsException);
  const problem = error as ProblemDetailsException;
  return { status: problem.getStatus(), type: problem.problemType, extensions: (problem.extensions ?? {}) as Record<string, unknown> };
}

const saveBody = (over: Record<string, unknown> = {}) => ({
  expected_version: 0, instructions: 'New text.', examples: [EXAMPLE], model_ref: MODEL_ID, effort: null, thinking: null, max_output_tokens: null, note: null, ...over,
});
const stubRules = (check: EvalRules['check']): EvalRules => ({ check, formsOf: vi.fn(async () => null), matchesExpected: vi.fn(() => true) });

describe('ConfigsService.get', () => {
  it('the live config, the previous one and no draft', async () => {
    const { service, live, retired } = setup();
    const view = await service.get(OP);
    expect(view).toMatchObject({ operation: OP, live_version: 4, draft: null });
    expect(view.live).toMatchObject({ id: live.id, number: 3, status: 'published', model: { id: MODEL_ID, model_id: 'fake:ok' }, created_by_user: { email: 'admin@x.test' } });
    expect(view.previous).toMatchObject({ id: retired.id, number: 2, status: 'retired' });
    expect(view.input_fields).toEqual(['word', 'part_of_speech', 'level', 'meaning_vi', 'context_label']);
  });

  it('an operation with no live pointer → 404', async () => {
    expect(await problemOf(setup().service.get('lookup_word'))).toMatchObject({ status: 404, type: 'not-found' });
  });
});

describe('ConfigsService.createDraft (B23)', () => {
  it('copies the live config under the next number, version 0, created_from the live id', async () => {
    const { service, live, pointer } = setup();
    const draft = await service.createDraft(ADMIN, OP, {});
    expect(draft).toMatchObject({ number: 4, version: 0, status: 'draft', created_from: live.id, instructions: live.instructions, model: { id: MODEL_ID } });
    expect(pointer.lastNumber).toBe(4);
    expect((await service.get(OP)).draft?.id).toBe(draft.id);
  });

  it('from_config_id of a retired config copies that one', async () => {
    const { service, retired } = setup();
    retired.instructions = 'Old text.';
    expect(await service.createDraft(ADMIN, OP, { from_config_id: retired.id })).toMatchObject({ instructions: 'Old text.', created_from: retired.id });
  });

  it("from_config_id of another operation's config, or of nothing → 400 naming the field", async () => {
    const { service, otherOperation } = setup();
    for (const id of [otherOperation.id, randomUUID()]) {
      expect(await problemOf(service.createDraft(ADMIN, OP, { from_config_id: id }))).toMatchObject({
        status: 400, extensions: { violations: ['from_config_id: not a published or retired config of generate_cloze'] },
      });
    }
  });

  it('a second create → 409 draft-exists with the first draft inside', async () => {
    const { service } = setup();
    const first = await service.createDraft(ADMIN, OP, {});
    const second = await problemOf(service.createDraft(ADMIN, OP, {}));
    expect(second).toMatchObject({ status: 409, type: 'draft-exists' });
    expect((second.extensions.draft as { id: string }).id).toBe(first.id);
  });

  it('plural create clones a named draft and keeps both initial revisions', async () => {
    const { service, revisions } = setup();
    const first = await service.createDraft(ADMIN, OP, { name: ' A ' }, true);
    const second = await service.createDraft(ADMIN, OP, { from_config_id: first.id, name: 'B' }, true);
    expect(second).toMatchObject({ name: 'B', number: 5, created_from: first.id, instructions: first.instructions });
    expect(revisions.map((r) => [r.configId, r.version, r.name])).toEqual([[first.id, 0, 'A'], [second.id, 0, 'B']]);
    expect((await service.get(OP))).toMatchObject({ draft: null, draft_count: 2 });
    expect(await problemOf(service.legacyDraft(OP))).toMatchObject({ status: 409, type: 'draft-selection-required' });
    expect((await service.getDraft(OP, second.id)).id).toBe(second.id);
  });

  it('Review focus 3: a deleted draft does not give its number again', async () => {
    const { service } = setup({ lastNumber: 5 });
    const first = await service.createDraft(ADMIN, OP, {});
    expect(first.number).toBe(6);
    await service.deleteDraft(OP);
    expect((await service.createDraft(ADMIN, OP, {})).number).toBe(7);
  });
});

describe('ConfigsService.saveDraft', () => {
  let ctx: ReturnType<typeof setup>;
  beforeEach(async () => { ctx = setup(); await ctx.service.createDraft(ADMIN, OP, {}); });

  it('stores the fields, bumps the version and returns the view', async () => {
    const saved = await ctx.service.saveDraft(ADMIN, OP, saveBody({ instructions: 'Changed.', note: ' a note ', effort: null }));
    expect(saved).toMatchObject({ version: 1, instructions: 'Changed.', note: 'a note', status: 'draft' });
    expect((await ctx.service.saveDraft(ADMIN, OP, saveBody({ expected_version: 1, note: '' }))).note).toBeNull();
  });

  it('an older expected_version → 409 draft-version-conflict and the few-shot rules are not asked', async () => {
    const check = vi.fn(async () => ({ status: 'pass' as const, problems: [], reason: null }));
    ctx.rules.register(stubRules(check));
    await ctx.service.saveDraft(ADMIN, OP, saveBody());
    expect(await problemOf(ctx.service.saveDraft(ADMIN, OP, saveBody({ expected_version: 0 })))).toMatchObject({ status: 409, type: 'draft-version-conflict' });
    expect(check).toHaveBeenCalledTimes(1);
  });

  it('the guarded update changing no row (a save slipped in between) → 409 draft-version-conflict', async () => {
    ctx.prisma.aiConfig.updateMany.mockResolvedValueOnce({ count: 0 });
    expect(await problemOf(ctx.service.saveDraft(ADMIN, OP, saveBody()))).toMatchObject({ status: 409, type: 'draft-version-conflict' });
  });

  it('no draft → 404; blank instructions → 400; an unknown model → 400 model_ref: not found', async () => {
    await ctx.service.deleteDraft(OP);
    expect(await problemOf(ctx.service.saveDraft(ADMIN, OP, saveBody()))).toMatchObject({ status: 404 });
    await ctx.service.createDraft(ADMIN, OP, {});
    expect(await problemOf(ctx.service.saveDraft(ADMIN, OP, saveBody({ instructions: '  ' })))).toMatchObject({ status: 400, type: 'validation-failed' });
    expect(await problemOf(ctx.service.saveDraft(ADMIN, OP, saveBody({ model_ref: randomUUID() }))))
      .toMatchObject({ status: 400, extensions: { violations: ['model_ref: not found'] } });
  });

  it('a model whose provider is not registered → 409 provider-not-configured', async () => {
    expect(await problemOf(ctx.service.saveDraft(ADMIN, OP, saveBody({ model_ref: OTHER_MODEL_ID })))).toMatchObject({ status: 409, type: 'provider-not-configured' });
  });

  it("the model's own choice rules apply (an effort the model does not offer → 400)", async () => {
    expect(await problemOf(ctx.service.saveDraft(ADMIN, OP, saveBody({ effort: 'high' })))).toMatchObject({ status: 400, extensions: { violations: ['effort: not offered by this model'] } });
  });

  it('a draft without a model is saved as it is (the "turn off" draft)', async () => {
    expect(await ctx.service.saveDraft(ADMIN, OP, saveBody({ model_ref: null }))).toMatchObject({ model: null, version: 1 });
  });

  it('B36: a few-shot example the rules fail → 422 few-shot-invalid with the failing ones only, nothing written', async () => {
    const check: EvalRules['check'] = vi.fn()
      .mockResolvedValueOnce({ status: 'pass', problems: [], reason: null })
      .mockResolvedValueOnce({ status: 'fail', problems: ['not-a-form'], reason: null });
    ctx.rules.register(stubRules(check));
    const refusal = await problemOf(ctx.service.saveDraft(ADMIN, OP, saveBody({ examples: [EXAMPLE, EXAMPLE] })));
    expect(refusal).toMatchObject({ status: 422, type: 'few-shot-invalid', extensions: { examples: [{ index: 1, problems: ['not-a-form'] }] } });
    expect(ctx.prisma.aiConfig.updateMany).not.toHaveBeenCalled();
  });

  it('B36: skipped rules and no registered port both accept the example', async () => {
    ctx.rules.register(stubRules(vi.fn(async () => ({ status: 'skipped' as const, problems: [], reason: 'not-in-catalog' as const }))));
    expect((await ctx.service.saveDraft(ADMIN, OP, saveBody())).version).toBe(1);
    const fresh = setup();
    await fresh.service.createDraft(ADMIN, OP, {});
    expect((await fresh.service.saveDraft(ADMIN, OP, saveBody())).version).toBe(1);
  });
});

describe('ConfigsService.deleteDraft', () => {
  it('a draft with a queued or running run → 409 draft-busy; with only finished runs → deleted', async () => {
    const { service, configs, runs } = setup();
    const draft = await service.createDraft(ADMIN, OP, {});
    runs.push({ configId: draft.id, status: 'running' });
    expect(await problemOf(service.deleteDraft(OP))).toMatchObject({ status: 409, type: 'draft-busy' });
    expect(configs.some((row) => row.id === draft.id)).toBe(true);
    runs[0]!.status = 'finished';
    await service.deleteDraft(OP);
    expect(configs.find((row) => row.id === draft.id)?.deletedAt).toEqual(NOW);
    expect(await problemOf(service.getDraft(OP, draft.id))).toMatchObject({ status: 404 });
  });

  it('no draft → 404', async () => {
    expect(await problemOf(setup().service.deleteDraft(OP))).toMatchObject({ status: 404 });
  });
});

describe('ConfigsService.testDraft', () => {
  it('runs the saved draft on the dev examples, with the draft number as the prompt revision, after taking an ai.test slot', async () => {
    const { service, runner, limiter } = setup();
    const draft = await service.createDraft(ADMIN, OP, {});
    const answer = await service.testDraft(ADMIN, OP, {});
    expect(answer.items).toHaveLength(1);
    expect(limiter.hit).toHaveBeenCalledExactlyOnceWith('ai.test', ADMIN);
    const call = runner.execute.mock.calls[0]![0] as { purpose: string; prompt: { revision: number; instructions: string }; selection: { modelId: string } };
    expect(call).toMatchObject({ purpose: 'test', prompt: { revision: draft.number, instructions: draft.instructions }, selection: { modelId: 'fake:ok' } });
  });

  it('a held-out id in example_ids → 400, nothing computed, no ai.test slot used', async () => {
    const { service, runner, limiter, examples } = setup();
    examples.push({ id: '44444444-4444-4444-8444-444444444444', operation: OP, split: 'held_out', input: {} });
    await service.createDraft(ADMIN, OP, {});
    expect(await problemOf(service.testDraft(ADMIN, OP, { example_ids: ['44444444-4444-4444-8444-444444444444'] }))).toMatchObject({ status: 400 });
    expect(runner.execute).not.toHaveBeenCalled();
    expect(limiter.hit).not.toHaveBeenCalled();
  });

  it('E14: a draft whose model has no price → 409 model-price-missing: the runner is not called and no ai.test slot is used', async () => {
    const { service, runner, limiter } = setup();
    await service.createDraft(ADMIN, OP, {});
    await service.saveDraft(ADMIN, OP, saveBody({ model_ref: UNPRICED_MODEL_ID }));
    expect(await problemOf(service.testDraft(ADMIN, OP, {}))).toMatchObject({ status: 409, type: 'model-price-missing' });
    expect(runner.execute).not.toHaveBeenCalled();
    expect(limiter.hit).not.toHaveBeenCalled();
  });

  it('B20: the usd cap reached → 409 admin-usd-cap before the slot and before the runner; with room it runs', async () => {
    const { service, runner, limiter, spend } = setup();
    await service.createDraft(ADMIN, OP, {});
    spend.spent = 2;
    expect(await problemOf(service.testDraft(ADMIN, OP, {}))).toMatchObject({ status: 409, type: 'admin-usd-cap' });
    expect(runner.execute).not.toHaveBeenCalled();
    expect(limiter.hit).not.toHaveBeenCalled();
    spend.spent = 1.99;
    expect((await service.testDraft(ADMIN, OP, {})).items).toHaveLength(1);
  });

  it('no draft → 404; a draft without a model → 409 model-not-set and the slot is not used', async () => {
    const { service, limiter } = setup();
    expect(await problemOf(service.testDraft(ADMIN, OP, {}))).toMatchObject({ status: 404 });
    await service.createDraft(ADMIN, OP, {});
    await service.saveDraft(ADMIN, OP, saveBody({ model_ref: null }));
    expect(await problemOf(service.testDraft(ADMIN, OP, {}))).toMatchObject({ status: 409, type: 'model-not-set' });
    expect(limiter.hit).not.toHaveBeenCalled();
  });
});


describe('AI workspace drafts and immutable revisions', () => {
  it('exact ID save never writes the other draft; a repeated save makes no extra version or revision', async () => {
    const ctx = setup();
    const a = await ctx.service.createDraft(ADMIN, OP, { name: 'A' }, true);
    const b = await ctx.service.createDraft(ADMIN, OP, { name: 'B' }, true);
    const saved = await ctx.service.saveDraft(ADMIN, OP, saveBody({ name: 'B edited' }), b.id);
    expect(saved).toMatchObject({ id: b.id, name: 'B edited', version: 1, updated_at: NOW.toISOString(), fingerprint: expect.stringMatching(/^[a-f0-9]{64}$/) });
    expect((await ctx.service.getDraft(OP, a.id)).version).toBe(0);
    const count = ctx.revisions.length;
    expect(await ctx.service.saveDraft(ADMIN, OP, saveBody({ expected_version: 1, name: 'B edited' }), b.id)).toMatchObject({ version: 1 });
    expect(ctx.revisions).toHaveLength(count);
    expect(ctx.revisions.at(-1)).toMatchObject({ configId: b.id, version: 1, savedBy: ADMIN, content: { instructions: 'New text.' }, name: 'B edited' });
  });

  it('list and revision tokens are bound to operation and config; nullable legacy revision hashes are computed on read', async () => {
    const ctx = setup();
    const a = await ctx.service.createDraft(ADMIN, OP, { name: 'A' }, true);
    const b = await ctx.service.createDraft(ADMIN, OP, { name: 'B' }, true);
    const page = await ctx.service.listDrafts(OP, 1);
    expect(page.items.map((r) => r.id)).toEqual([b.id]);
    expect((await ctx.service.listDrafts(OP, 1, page.next_page_token!)).items.map((r) => r.id)).toEqual([a.id]);
    expect(await problemOf(ctx.service.listDrafts('lookup_word', 1, page.next_page_token!))).toMatchObject({ status: 400 });
    await ctx.service.saveDraft(ADMIN, OP, saveBody(), b.id);
    const revisions = await ctx.service.revisions(OP, b.id, 1);
    expect(revisions.items[0]).toMatchObject({ config_id: b.id, version: 1, saved_by_user: { email: 'admin@x.test' } });
    expect(await problemOf(ctx.service.revisions(OP, a.id, 1, revisions.next_page_token!))).toMatchObject({ status: 400 });
    ctx.revisions.find((r) => r.configId === b.id && r.version === 0)!.fingerprint = null;
    const older = await ctx.service.revisions(OP, b.id, 1, revisions.next_page_token!);
    expect(older.items[0]?.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    await ctx.service.deleteDraft(OP, b.id);
    expect((await ctx.service.revisions(OP, b.id, 20)).items).toHaveLength(2);
  });

  it('wrong operation, published IDs and deleted IDs are refused before mutations', async () => {
    const ctx = setup();
    const d = await ctx.service.createDraft(ADMIN, OP, {}, true);
    for (const id of [ctx.live.id, ctx.otherOperation.id, randomUUID()]) {
      expect(await problemOf(ctx.service.saveDraft(ADMIN, OP, saveBody(), id))).toMatchObject({ status: 404 });
      expect(await problemOf(ctx.service.testDraft(ADMIN, OP, {}, id))).toMatchObject({ status: 404 });
    }
    await ctx.service.deleteDraft(OP, d.id);
    expect(await problemOf(ctx.service.createDraft(ADMIN, OP, { from_config_id: d.id }, true))).toMatchObject({ status: 400 });
    expect(ctx.runner.execute).not.toHaveBeenCalled();
  });

  it('a draft deleted between validation and the transaction cannot be saved or revised', async () => {
    const ctx = setup();
    const d = await ctx.service.createDraft(ADMIN, OP, {}, true);
    const before = ctx.revisions.length;
    ctx.prisma.$transaction.mockImplementationOnce(async (work) => { ctx.configs.find((r) => r.id === d.id)!.deletedAt = NOW; return work(ctx.prisma); });
    expect(await problemOf(ctx.service.saveDraft(ADMIN, OP, saveBody(), d.id))).toMatchObject({ status: 409 });
    expect(ctx.revisions).toHaveLength(before);
    expect(ctx.configs.find((r) => r.id === d.id)?.version).toBe(0);
  });

  it('prepare uses the save validation and normalizes model IDs, preserving prompt string content', async () => {
    const ctx = setup();
    const { expected_version: _v, note: _n, ...content } = saveBody({ instructions: '  Keep spaces.  ', model_ref: MODEL_ID.toUpperCase() });
    const prepared = await ctx.service.prepare(OP, content);
    expect(prepared).toMatchObject({ content: { instructions: '  Keep spaces.  ', model_ref: MODEL_ID }, selection: { modelId: 'fake:ok' }, prompt: { instructions: '  Keep spaces.  ' } });
    expect(prepared.fingerprint).toBe(configFingerprint(OP, prepared.content));
    expect(await problemOf(ctx.service.prepare(OP, { ...content, instructions: ' ' }))).toMatchObject({ status: 400 });
    expect(await problemOf(ctx.service.prepare(OP, { ...content, effort: 'high' }))).toMatchObject({ status: 400 });
    ctx.rules.register(stubRules(async () => ({ status: 'fail', problems: ['wrong-form'], reason: null })));
    expect(await problemOf(ctx.service.prepare(OP, content))).toMatchObject({ status: 422, type: 'few-shot-invalid' });
    expect(ctx.prisma.aiConfig.updateMany).not.toHaveBeenCalled();
  });

  it('temporary test uses a frozen snapshot and one grouped batch without saving the draft or raw output', async () => {
    const ctx = setup();
    const a = await ctx.service.createDraft(ADMIN, OP, {}, true);
    const b = await ctx.service.createDraft(ADMIN, OP, {}, true);
    const snapshot = { ...contentOfConfig(await ctx.service.getDraft(OP, b.id)), instructions: 'Temporary instructions.' };
    const result = await ctx.service.testDraft(ADMIN, OP, { snapshot }, b.id);
    expect(result).toMatchObject({ batch_id: 'batch-1', fingerprint: configFingerprint(OP, snapshot), items: [expect.objectContaining({ status: 'succeeded' })] });
    expect(ctx.batches.create).toHaveBeenCalledWith(expect.objectContaining({ kind: 'test', configId: b.id, configVersion: 0, snapshot, total: 1, actorId: ADMIN }), ctx.prisma);
    expect(ctx.batches.start).toHaveBeenCalledWith('batch-1');
    expect(ctx.batches.finish).toHaveBeenCalledWith('batch-1', 'finished');
    expect(ctx.runner.execute).toHaveBeenCalledWith(expect.objectContaining({ batchId: 'batch-1', prompt: expect.objectContaining({ instructions: 'Temporary instructions.' }) }));
    expect((await ctx.service.getDraft(OP, b.id)).instructions).toBe(a.instructions);
    expect(ctx.revisions).toHaveLength(2);
    expect(JSON.stringify(ctx.batches.create.mock.calls)).not.toContain('raw_output');
  });

  it('heldout, missing price, no model, invalid snapshot and rate limit refuse before batch creation', async () => {
    const ctx = setup();
    const d = await ctx.service.createDraft(ADMIN, OP, {}, true);
    const content = contentOfConfig(await ctx.service.getDraft(OP, d.id));
    const heldout = '44444444-4444-4444-8444-444444444444';
    ctx.examples.push({ id: heldout, operation: OP, split: 'held_out', input: {} });
    expect(await problemOf(ctx.service.testDraft(ADMIN, OP, { example_ids: [heldout] }, d.id))).toMatchObject({ status: 400 });
    expect(await problemOf(ctx.service.testDraft(ADMIN, OP, { snapshot: { ...content, model_ref: null } }, d.id))).toMatchObject({ type: 'model-not-set' });
    expect(await problemOf(ctx.service.testDraft(ADMIN, OP, { snapshot: { ...content, model_ref: UNPRICED_MODEL_ID } }, d.id))).toMatchObject({ type: 'model-price-missing' });
    expect(await problemOf(ctx.service.testDraft(ADMIN, OP, { snapshot: { ...content, instructions: ' ' } }, d.id))).toMatchObject({ status: 400 });
    ctx.limiter.hit.mockRejectedValueOnce(new Error('rate limit'));
    await expect(ctx.service.testDraft(ADMIN, OP, {}, d.id)).rejects.toThrow('rate limit');
    expect(ctx.batches.create).not.toHaveBeenCalled();
    expect(ctx.runner.execute).not.toHaveBeenCalled();
  });

  it('a runner error closes the batch as failed', async () => {
    const ctx = setup();
    const d = await ctx.service.createDraft(ADMIN, OP, {}, true);
    ctx.runner.execute.mockRejectedValueOnce(new Error('runner failure'));
    await expect(ctx.service.testDraft(ADMIN, OP, {}, d.id)).rejects.toThrow('runner failure');
    expect(ctx.batches.finish).toHaveBeenCalledWith('batch-1', 'failed');
  });
});


describe('draft row lock and active quick tests', () => {
  it('delete locks before active eval/batch checks and keeps drafts with queued/running quick tests', async () => {
    const ctx = setup();
    const draft = await ctx.service.createDraft(ADMIN, OP, {}, true);
    for (const status of ['queued', 'running']) {
      ctx.batchRows.splice(0, ctx.batchRows.length, { id: 'batch-1', configId: draft.id, kind: 'test', status });
      expect(await problemOf(ctx.service.deleteDraft(OP, draft.id))).toMatchObject({ type: 'draft-busy' });
      expect(ctx.configs.find((r) => r.id === draft.id)?.deletedAt).toBeNull();
    }
    expect(ctx.prisma.$queryRaw).toHaveBeenCalled();
    const [sql, id, op] = ctx.prisma.$queryRaw.mock.calls[0]!;
    expect(sql.join('?')).toContain('FOR UPDATE');
    expect([id, op]).toEqual([draft.id, OP]);
    ctx.batchRows[0]!.status = 'finished';
    await ctx.service.deleteDraft(OP, draft.id);
    expect(ctx.configs.find((r) => r.id === draft.id)?.deletedAt).toEqual(NOW);
  });

  it('a test whose draft was deleted while preparing refuses under the shared lock before batch creation', async () => {
    const ctx = setup();
    const draft = await ctx.service.createDraft(ADMIN, OP, {}, true);
    ctx.prisma.$transaction.mockImplementationOnce(async (work) => { ctx.configs.find((r) => r.id === draft.id)!.deletedAt = NOW; return work(ctx.prisma); });
    expect(await problemOf(ctx.service.testDraft(ADMIN, OP, {}, draft.id))).toMatchObject({ status: 404 });
    expect(ctx.batches.create).not.toHaveBeenCalled();
    expect(ctx.runner.execute).not.toHaveBeenCalled();
  });
});


describe('operation revisions history', () => {
  it('includes published and deleted configs, filters by relation operation, and pages by saved time then id', async () => {
    const ctx = setup();
    const a = await ctx.service.createDraft(ADMIN, OP, { name: 'Published' }, true);
    const b = await ctx.service.createDraft(ADMIN, OP, { name: 'Deleted' }, true);
    ctx.configs.find((r) => r.id === a.id)!.status = 'published';
    await ctx.service.deleteDraft(OP, b.id);
    Object.assign(ctx.revisions[0]!, { id: '00000000-0000-4000-8000-000000000001', savedAt: NOW });
    Object.assign(ctx.revisions[1]!, { id: '00000000-0000-4000-8000-000000000002', savedAt: NOW, fingerprint: null });
    ctx.revisions.push({ ...ctx.revisions[0], id: '00000000-0000-4000-8000-000000000003', configId: ctx.retired.id, savedAt: new Date(NOW.getTime() + 1000), name: 'Retired' });
    ctx.revisions.push({ ...ctx.revisions[0], id: randomUUID(), configId: ctx.otherOperation.id, savedAt: new Date(NOW.getTime() + 2000) });
    const first = await ctx.service.operationRevisions(OP, 2);
    expect(first.items.map((r) => [r.config_number, r.name, r.config_status])).toEqual([[2, 'Retired', 'retired'], [5, 'Deleted', 'deleted']]);
    expect(first.items[1]).toMatchObject({ operation: OP, config_id: b.id, config_deleted_at: NOW.toISOString(), content: { instructions: b.instructions }, version: 0, fingerprint: expect.stringMatching(/^[a-f0-9]{64}$/), saved_by_user: { email: 'admin@x.test' } });
    expect(first.next_page_token).not.toBeNull();
    const next = await ctx.service.operationRevisions(OP, 2, first.next_page_token!);
    expect(next.items.map((r) => [r.config_id, r.config_status])).toEqual([[a.id, 'published']]);
    expect(next.next_page_token).toBeNull();
    expect(ctx.prisma.aiConfigRevision.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { config: { operation: OP } }, orderBy: [{ savedAt: 'desc' }, { id: 'desc' }], take: 3, include: expect.objectContaining({ config: expect.anything() }) }));
    expect(await problemOf(ctx.service.operationRevisions('lookup_word', 2, first.next_page_token!))).toMatchObject({ status: 400, extensions: { violations: ['page_token: Invalid page token'] } });
    expect(await problemOf(ctx.service.operationRevisions(OP, 20, 'invalid-token'))).toMatchObject({ status: 400 });
  });

  it('defaults to twenty rows and gives a next token; an empty operation has no rows or token', async () => {
    const ctx = setup();
    const d = await ctx.service.createDraft(ADMIN, OP, {}, true);
    for (let index = 1; index <= 20; index++) ctx.revisions.push({ ...ctx.revisions[0], id: randomUUID(), version: index, configId: d.id, savedAt: new Date(NOW.getTime() + index) });
    const page = await ctx.service.operationRevisions(OP);
    expect(page.items).toHaveLength(20);
    expect(page.items.map((r) => r.version)).toEqual(Array.from({ length: 20 }, (_, i) => 20 - i));
    expect(page.next_page_token).not.toBeNull();
    expect(await ctx.service.operationRevisions('lookup_word')).toEqual({ items: [], next_page_token: null });
  });
});


describe('draft list latest quick/eval batch metadata', () => {
  it('attaches the latest batch per listed config without fetching raw content or global runs', async () => {
    const ctx = setup(); const a = await ctx.service.createDraft(ADMIN, OP, {}, true); const b = await ctx.service.createDraft(ADMIN, OP, {}, true);
    ctx.prisma.$queryRaw.mockResolvedValueOnce([
      { config_id: b.id, id: 'batch-eval', kind: 'eval', status: 'running', config_version: 0, fingerprint: 'hash', source_id: 'eval-1', model: 'fake:ok', provider: 'fake', total: 3, created_at: NOW, started_at: NOW, finished_at: null },
    ] as never);
    const page = await ctx.service.listDrafts(OP);
    expect(page.items.find((r) => r.id === b.id)).toMatchObject({ last_run: { id: 'batch-eval', kind: 'eval', status: 'running', source_id: 'eval-1', config_version: 0, total: 3, created_at: NOW.toISOString(), started_at: NOW.toISOString(), finished_at: null } });
    expect(page.items.find((r) => r.id === a.id)?.last_run).toBeNull();
    const sql = ctx.prisma.$queryRaw.mock.calls[0]![0] as unknown as { sql: string; values: unknown[] };
    expect(sql.sql).toContain('DISTINCT ON (b.config_id)');
    expect(sql.sql).toContain('b.created_at DESC, b.id DESC');
    expect(sql.sql).toContain("b.kind IN ('test', 'eval')");
    expect(sql.sql).toContain('r.hidden_at IS NULL');
    expect(sql.sql).toContain("r.error = 'cancelled'");
    expect(sql.values).toEqual([OP, b.id, a.id]);
    expect(sql.sql).not.toContain('call_contents');
  });

  it('an empty draft page returns no batch query', async () => {
    const ctx = setup();
    expect(await ctx.service.listDrafts(OP)).toEqual({ items: [], next_page_token: null });
    expect(ctx.prisma.$queryRaw).not.toHaveBeenCalled();
  });
});
