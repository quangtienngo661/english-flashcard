import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { AiAdapterRegistry } from '../adapters/ai-adapter.registry.js';
import { EvalRulesRegistry, type EvalRules } from '../eval/eval-rules.port.js';
import { AdminSpend } from '../runner/admin-spend.service.js';
import type { RunReport } from '../runner/runner.service.js';
import { ConfigsService } from './configs.service.js';

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
  createdAt: Date; publishedBy: string | null; publishedAt: Date | null;
};
const config = (over: Partial<Cfg> = {}): Cfg => ({
  id: randomUUID(), operation: OP, number: 3, version: 0, instructions: 'Write one sentence.', examples: [EXAMPLE], modelRef: MODEL_ID, effort: null, thinking: null,
  maxOutputTokens: null, status: 'published', createdFrom: null, note: null, createdBy: ADMIN, createdAt: NOW, publishedBy: ADMIN, publishedAt: NOW, ...over,
});
const model = (id: string, over: Record<string, unknown> = {}) => ({
  id, provider: 'fake', modelId: 'fake:ok', effortLevels: [], thinkingOff: null, maxOutputTokens: 4096, priceInput: 0, priceCachedInput: 0, priceOutput: 0, ...over,
});
const p2002 = () => Object.assign(new Error('unique'), { code: 'P2002' });

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
  const draftOf = (op: string) => configs.find((row) => row.operation === op && row.status === 'draft');
  const prisma = {
    aiLiveConfig: {
      findUnique: vi.fn(async ({ where }: { where: { operation: string } }) => (where.operation === OP ? pointer : null)),
      update: vi.fn(async ({ data }: { data: { lastNumber: { increment: number } } }) => { pointer.lastNumber += data.lastNumber.increment; return pointer; }),
    },
    aiConfig: {
      findMany: vi.fn(async ({ where }: { where: { id: { in: string[] } } }) => configs.filter((row) => where.id.in.includes(row.id)).map(withModel)),
      findFirst: vi.fn(async ({ where }: { where: { operation: string; status: string } }) => withModel(configs.find((row) => row.operation === where.operation && row.status === where.status))),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => withModel(configs.find((row) => row.id === where.id))),
      create: vi.fn(async ({ data }: { data: Partial<Cfg> }) => {
        if (data.status === 'draft' && draftOf(data.operation!)) throw p2002();
        const row = config({ ...data, id: randomUUID(), publishedBy: null, publishedAt: null });
        configs.push(row);
        return withModel(row);
      }),
      updateMany: vi.fn(async ({ where, data }: { where: { id: string; status: string; version: number }; data: Record<string, unknown> }) => {
        const row = configs.find((r) => r.id === where.id && r.status === where.status && r.version === where.version);
        if (!row) return { count: 0 };
        const { version, ...rest } = data as { version: { increment: number } } & Partial<Cfg>;
        Object.assign(row, rest, { version: row.version + version.increment });
        return { count: 1 };
      }),
      delete: vi.fn(async ({ where }: { where: { id: string } }) => {
        const index = configs.findIndex((row) => row.id === where.id);
        if (index >= 0) configs.splice(index, 1);
      }),
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
  const service = new ConfigsService(prisma as never, identity as never, settings as never, registry, rules, runner as never, limiter as never, spendOf(spend), new FakeClock(NOW));
  return { service, prisma, configs, live, retired, otherOperation, pointer, runs, examples, rules, runner, limiter, registry, spend };
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

  it('two creates at once: the unique index of the loser → 409 draft-exists with the winner', async () => {
    const { service, prisma, configs } = setup();
    const winner = config({ status: 'draft', number: 4, publishedBy: null, publishedAt: null });
    prisma.aiConfig.create.mockImplementationOnce(async () => { configs.push(winner); throw p2002(); });
    const lost = await problemOf(service.createDraft(ADMIN, OP, {}));
    expect(lost).toMatchObject({ status: 409, type: 'draft-exists' });
    expect((lost.extensions.draft as { id: string }).id).toBe(winner.id);
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
    expect(configs.some((row) => row.id === draft.id)).toBe(false);
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
