import { describe, expect, it, vi } from 'vitest';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { SETTINGS_DEFAULTS, type AppSettings, type SettingsService } from '../../settings/index.js';
import { AiAdapter, type AdapterOutcome, type ModelDescription } from '../adapters/ai-adapter.js';
import { AiAdapterRegistry } from '../adapters/ai-adapter.registry.js';
import { AI_OPERATIONS, type AiOperation, type AiProviderName } from '../ai.types.js';
import type { CallLedger } from '../runner/call-ledger.service.js';
import type { ReadinessCheck, ReadinessService } from '../runner/readiness.service.js';
import type { ModelRow } from '../runner/selection.js';
import type { HeldOutReader } from '../eval/held-out.js';
import type { DashboardQualityService } from './dashboard-quality.service.js';
import { ReportsService } from './reports.service.js';

const NOW = new Date('2026-10-20T05:00:00.000Z');
const MODEL_REF = '00000000-0000-4000-8000-0000000000b1';

class StubAdapter extends AiAdapter {
  constructor(readonly provider: AiProviderName) {
    super();
  }
  async call(): Promise<AdapterOutcome> {
    throw new Error('reports never call a provider');
  }
  async describeModel(): Promise<ModelDescription> {
    return { kind: 'not-found' };
  }
}

type Model = ModelRow & { shutdownAt: Date | null; lifecycle: string | null };
const model = (overrides: Partial<Model> = {}): Model => ({
  id: MODEL_REF, provider: 'fake', modelId: 'fake:ok', thinkingOff: null, maxOutputTokens: 4_096, priceInput: '0', priceCachedInput: null,
  priceOutput: '0', shutdownAt: null, lifecycle: 'active', ...overrides,
});

type Statement = { sql: string; values: unknown[] };

type Setup = {
  readiness?: Partial<Record<AiOperation, ReadinessCheck>>;
  models?: Partial<Record<AiOperation, Model | null>>;
  registered?: AiProviderName[];
  aiEnabled?: boolean;
  lastErrors?: Array<{ operation: string; created_at: Date; outcome: string; http_status: number | null; purpose: string }>;
  today?: { failed_calls: number; failed_cost_usd: string; cost_usd: string; admin_cost_usd: string };
  grouped?: Array<Record<string, unknown>>;
  total?: Record<string, unknown>;
  calls?: Array<Record<string, unknown>>;
  contents?: Array<{ callId: string; request: unknown; response: string | null; expiresAt: Date }>;
  /** Example ids the held-out reader reports as still hidden. */
  hidden?: string[];
  /** Items of judge passes (nhóm B M3) and the eval run items they point at. */
  passItems?: Array<{ id: string; subjectKind: string; subjectId: string }>;
  runItems?: Array<{ id: string; exampleId: string }>;
};

function setup(input: Setup = {}) {
  const statements: Statement[] = [];
  const counted: Date[] = [];
  const settings: AppSettings = {
    ...SETTINGS_DEFAULTS, entitlements: { ...SETTINGS_DEFAULTS.entitlements, aiEnabled: input.aiEnabled ?? true },
  };
  const models: Partial<Record<AiOperation, Model | null>> = { generate_cloze: model(), ...input.models };
  const contentArgs: unknown[] = [];
  const prisma = {
    aiLiveConfig: {
      findMany: vi.fn(async (_args?: unknown) => AI_OPERATIONS.map((operation) => ({
        operation,
        config: {
          effort: operation === 'generate_cloze' ? 'low' : null, thinking: null, maxOutputTokens: 1_200, modelRef: models[operation]?.id ?? null,
          model: models[operation],
        },
      }))),
    },
    // `calls` ignores its filter (the old tests name an id the rows do not carry); a query with a purpose is the by-purpose one and is filtered.
    aiCall: {
      findMany: vi.fn(async (args?: { where?: { operationId?: string | { in: string[] }; purpose?: string; outcome?: string } }) => {
        const where = args?.where;
        if (where?.purpose === undefined) return input.calls ?? [];
        const ids = typeof where.operationId === 'string' ? [where.operationId] : where.operationId?.in;
        // Newest first, as the query asks.
        return (input.calls ?? []).filter((row) => (ids === undefined || ids.includes(row.operationId as string)) && row.purpose === where.purpose && row.outcome === where.outcome)
          .sort((a, b) => (b.createdAt as Date).getTime() - (a.createdAt as Date).getTime());
      }),
    },
    aiJudgePassItem: {
      findMany: vi.fn(async (args: { where: { id: { in: string[] } } }) => (input.passItems ?? []).filter((row) => args.where.id.in.includes(row.id))),
    },
    aiEvalRunItem: {
      findMany: vi.fn(async (args: { where: { id: { in: string[] } } }) => (input.runItems ?? []).filter((row) => args.where.id.in.includes(row.id))),
    },
    aiCallContent: {
      findMany: vi.fn(async (args: { where: { callId: { in: string[] }; expiresAt: { gt: Date } } }) => {
        contentArgs.push(args);
        return (input.contents ?? []).filter((row) => args.where.callId.in.includes(row.callId) && row.expiresAt > args.where.expiresAt.gt);
      }),
    },
    $queryRaw: vi.fn(async (first: TemplateStringsArray | { sql: string; values: unknown[] }, ...rest: unknown[]) => {
      const statement = Array.isArray(first)
        ? { sql: (first as TemplateStringsArray).join('?'), values: rest }
        : { sql: (first as { sql: string }).sql, values: (first as { values: unknown[] }).values };
      statement.sql = statement.sql.replace(/\s+/g, ' ').trim();
      statements.push(statement);
      if (statement.sql.includes('DISTINCT ON')) return input.lastErrors ?? [];
      if (statement.sql.includes('GROUP BY')) return input.grouped ?? [];
      if (statement.sql.includes('unknown_cost_calls')) {
        return [input.total ?? {
          calls: 0, input_tokens: 0n, cached_input_tokens: 0n, output_tokens: 0n, reasoning_tokens: 0n, cost_usd: '0.00000000',
          unknown_cost_calls: 0,
        }];
      }
      return [input.today ?? { failed_calls: 0, failed_cost_usd: '0.00000000', cost_usd: '0.00000000', admin_cost_usd: '0.00000000' }];
    }),
  } as unknown as PrismaClient;
  const registry = new AiAdapterRegistry();
  for (const provider of input.registered ?? ['fake']) registry.register(new StubAdapter(provider));
  const readiness = {
    check: vi.fn(async (op: AiOperation) => input.readiness?.[op] ?? { ready: false, reason: 'model-not-set' }),
  } as unknown as ReadinessService;
  const ledger = {
    countToday: vi.fn(async (now: Date) => {
      counted.push(now);
      return 42;
    }),
  } as unknown as CallLedger;
  const heldOut = { hiddenIds: vi.fn(async (ids: string[]) => new Set(ids.filter((id) => (input.hidden ?? []).includes(id)))) };
  const service = new ReportsService(
    prisma, { get: async () => settings } as unknown as SettingsService, readiness, registry, ledger, heldOut as unknown as HeldOutReader,
    {} as unknown as DashboardQualityService,
  );
  return { service, statements, counted, contentArgs, heldOut };
}

async function problemStatus(promise: Promise<unknown>): Promise<number> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(ProblemDetailsException);
    return (error as ProblemDetailsException).getStatus();
  }
  throw new Error('expected a problem');
}

const daysFromNow = (days: number) => new Date(NOW.getTime() + days * 86_400_000);

describe('ReportsService.status', () => {
  it('ready and reason per operation from readiness', async () => {
    const { service } = setup({
      readiness: {
        generate_cloze: { ready: true, selection: {} as never, prompt: {} as never },
        lookup_word: { ready: false, reason: 'model-not-set' },
        translate_sentence: { ready: false, reason: 'ai-disabled' },
      },
    });
    const { operations } = await service.status(NOW);
    expect(operations.map((item) => [item.operation, item.ready, item.reason])).toEqual([
      ['generate_cloze', true, null], ['lookup_word', false, 'model-not-set'], ['translate_sentence', false, 'ai-disabled'],
      ['generate_meaning_question', false, 'model-not-set'], ['generate_sentence_mcq', false, 'model-not-set'],
      ['check_private_word', false, 'model-not-set'],
    ]);
    expect(operations[0]).toMatchObject({
      model: { provider: 'fake', model_id: 'fake:ok' }, effort: 'low', thinking: null, max_output_tokens: 1_200, model_warning: null,
    });
    expect(operations[1]).toMatchObject({ model: null, effort: null, thinking: null, max_output_tokens: null });
  });

  it('B6#21: the newest failed call is provider-quota → last_error provider-quota; succeeded calls never show', async () => {
    const at = new Date('2026-10-20T04:59:00.000Z');
    const { service, statements } = setup({
      lastErrors: [{ operation: 'generate_cloze', created_at: at, outcome: 'provider-quota', http_status: 429, purpose: 'test' }],
    });
    const { operations } = await service.status(NOW);
    expect(operations[0].last_error).toEqual({ at: at.toISOString(), outcome: 'provider-quota', http_status: 429, purpose: 'test' });
    expect(operations[1].last_error).toBeNull();
    const distinct = statements.find((statement) => statement.sql.includes('DISTINCT ON'));
    expect(distinct?.sql).toContain("WHERE outcome <> 'succeeded'");
    expect(distinct?.sql).toContain('ORDER BY operation, created_at DESC');
  });

  it('plan review #2: an invalid-shape call shows as last_error and in failed_calls', async () => {
    const at = new Date('2026-10-20T04:00:00.000Z');
    const { service } = setup({
      lastErrors: [{ operation: 'lookup_word', created_at: at, outcome: 'invalid-shape', http_status: null, purpose: 'learner' }],
      today: { failed_calls: 1, failed_cost_usd: '0.00003500', cost_usd: '0.00010500', admin_cost_usd: '0.00000000' },
    });
    const report = await service.status(NOW);
    expect(report.operations[1].last_error).toEqual({ at: at.toISOString(), outcome: 'invalid-shape', http_status: null, purpose: 'learner' });
    expect(report.today).toMatchObject({ failed_calls: 1, failed_cost_usd: '0.00003500' });
  });

  it.each([
    ['shutting down in 25 days', { shutdownAt: daysFromNow(25) }, true],
    ['shutting down in 31 days', { shutdownAt: daysFromNow(31) }, false],
    ['lifecycle deprecated', { lifecycle: 'deprecated' }, true],
    ['lifecycle retired', { lifecycle: 'retired' }, true],
    ['active, no date', {}, false],
  ])('B6E41: a model %s → warning %s', async (_name, overrides, warned) => {
    const used = model(overrides);
    const { service } = setup({ models: { generate_cloze: used } });
    const [first] = (await service.status(NOW)).operations;
    expect(first.model_warning).toEqual(warned
      ? { shutdown_at: used.shutdownAt?.toISOString() ?? null, lifecycle: used.lifecycle }
      : null);
  });

  it('B6E69: at 23:30 Z today counts from 17:00 Z', async () => {
    const late = new Date('2026-10-20T23:30:00.000Z');
    const { service, statements, counted } = setup();
    await service.status(late);
    expect(counted).toEqual([late]);
    const today = statements.find((statement) => statement.sql.includes('FILTER'));
    expect(today?.values).toEqual([new Date('2026-10-20T17:00:00.000Z')]);
  });

  it('today: calls from the ledger, the cap, costs and VND at usd_vnd_rate', async () => {
    const { service } = setup({ today: { failed_calls: 3, failed_cost_usd: '0.01000000', cost_usd: '1.28120000', admin_cost_usd: '1.50000000' } });
    expect((await service.status(NOW)).today).toEqual({
      calls: 42, cap: 3_000, failed_calls: 3, failed_cost_usd: '0.01000000', cost_usd: '1.28120000', cost_vnd: 33_439,
      admin_cost_usd: '1.50000000', admin_usd_cap: 2,
    });
  });

  it('providers reflect the registry; ai_enabled the switch', async () => {
    const report = await setup({ registered: ['fake', 'anthropic'], aiEnabled: false }).service.status(NOW);
    expect(report.providers).toEqual({ openai: false, anthropic: true, fake: true });
    expect(report.ai_enabled).toBe(false);
  });
});

describe('ReportsService.costs', () => {
  it('a call at 2026-10-20T17:30Z is in 2026-10-21: the day key is the Vietnam date and the range starts at Vietnam midnight', async () => {
    const { service, statements } = setup();
    await service.costs({ from: '2026-10-21', to: '2026-10-21', group_by: 'day' }, NOW);
    const grouped = statements.find((statement) => statement.sql.includes('GROUP BY'));
    expect(grouped?.sql).toContain("(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date");
    expect(grouped?.values).toEqual([new Date('2026-10-20T17:00:00.000Z'), new Date('2026-10-21T17:00:00.000Z')]);
  });

  it('defaults to today in Vietnam (plan choice 15)', async () => {
    const { service, statements } = setup();
    await service.costs({ group_by: 'operation' }, new Date('2026-10-20T23:30:00.000Z'));
    expect(statements[0].values).toEqual([new Date('2026-10-20T17:00:00.000Z'), new Date('2026-10-21T17:00:00.000Z')]);
  });

  it('B6E64: unknown-cost calls are counted apart and add nothing to cost_usd; VND = USD × usd_vnd_rate, rounded', async () => {
    const { service } = setup({
      grouped: [{
        key: 'generate_cloze', calls: 3, input_tokens: 1_800n, cached_input_tokens: 0n, output_tokens: 1_500n, reasoning_tokens: 10n,
        cost_usd: '0.01240000', unknown_cost_calls: 1,
      }],
      total: {
        calls: 3, input_tokens: 1_800n, cached_input_tokens: 0n, output_tokens: 1_500n, reasoning_tokens: 10n, cost_usd: '0.01240000',
        unknown_cost_calls: 1,
      },
    });
    const report = await service.costs({ group_by: 'operation' }, NOW);
    expect(report.items).toEqual([{
      key: 'generate_cloze', calls: 3, input_tokens: 1_800, cached_input_tokens: 0, output_tokens: 1_500, reasoning_tokens: 10,
      cost_usd: '0.01240000', cost_vnd: 324, unknown_cost_calls: 1,
    }]);
    expect(report.total).toEqual({
      calls: 3, input_tokens: 1_800, cached_input_tokens: 0, output_tokens: 1_500, reasoning_tokens: 10, cost_usd: '0.01240000',
      cost_vnd: 324, unknown_cost_calls: 1,
    });
  });

  it('B6#20: group_by model sums calls and tokens per provider/model', async () => {
    const { service, statements } = setup();
    await service.costs({ group_by: 'model' }, NOW);
    const grouped = statements.find((statement) => statement.sql.includes('GROUP BY'));
    expect(grouped?.sql).toContain("provider || '/' || model");
    expect(grouped?.sql).toContain('sum(input_tokens)');
  });

  it.each(['purpose', 'outcome'] as const)('group_by %s groups by that column', async (groupBy) => {
    const { service, statements } = setup();
    await service.costs({ group_by: groupBy }, NOW);
    expect(statements.find((statement) => statement.sql.includes('GROUP BY'))?.sql).toContain(`SELECT ${groupBy} AS key`);
  });

  it('from > to → 400', async () => {
    expect(await problemStatus(setup().service.costs({ from: '2026-10-21', to: '2026-10-20', group_by: 'day' }, NOW))).toBe(400);
  });

  it('367 days → 400; 366 days → ok', async () => {
    expect(await problemStatus(setup().service.costs({ from: '2025-10-20', to: '2026-10-21', group_by: 'day' }, NOW))).toBe(400);
    await expect(setup().service.costs({ from: '2025-10-21', to: '2026-10-21', group_by: 'day' }, NOW)).resolves.toBeDefined();
  });

  it('only from → to is today', async () => {
    const { service, statements } = setup();
    await service.costs({ from: '2026-10-18', group_by: 'day' }, NOW);
    expect(statements[0].values).toEqual([new Date('2026-10-17T17:00:00.000Z'), new Date('2026-10-20T17:00:00.000Z')]);
  });
});

describe('ReportsService.calls', () => {
  const call = (id: string, over: Record<string, unknown> = {}) => ({
    id, operationId: 'q1', attempt: 1, purpose: 'learner', operation: 'generate_cloze', provider: 'fake', model: 'fake:ok', effort: null, thinking: null,
    maxOutputTokens: 1_200, promptRevision: 1, outcome: 'succeeded', httpStatus: null, providerErrorCode: null, latencyMs: 12,
    inputTokens: 100, cachedInputTokens: 0, outputTokens: 50, reasoningTokens: 0, costUsd: { toFixed: () => '0.00003500' },
    costKnown: true, createdAt: NOW, ...over,
  });

  it('B6#22/B6E65: content present while not expired, null after', async () => {
    const expiresAt = daysFromNow(7);
    const { service, contentArgs } = setup({
      calls: [call('c1'), call('c2')],
      contents: [{ callId: 'c1', request: { instructions: 'x' }, response: '{}', expiresAt }],
    });
    const { items } = await service.calls('q1', NOW);
    expect(items.map((item) => item.id)).toEqual(['c1', 'c2']);
    expect(items[0]).toMatchObject({
      attempt: 1, purpose: 'learner', max_output_tokens: 1_200, prompt_revision: 1, latency_ms: 12, input_tokens: 100,
      cost_usd: '0.00003500', cost_known: true, created_at: NOW.toISOString(),
      content: { request: { instructions: 'x' }, response: '{}', expires_at: expiresAt.toISOString() },
    });
    expect(items[1].content).toBeNull();
    expect(contentArgs).toEqual([{ where: { callId: { in: ['c1', 'c2'] }, expiresAt: { gt: NOW } } }]);
  });

  describe('B6, R7: held-out examples do not show on the calls page', () => {
    const RUN = '11111111-1111-4111-8111-111111111111';
    const [E1, E2] = ['22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333'];
    const contents = (...ids: string[]) => ids.map((callId) => ({ callId, request: { input: 'secret' }, response: '{"x":1}', expiresAt: daysFromNow(7) }));

    it('the call of a hidden example has held_out true and no content; another eval call keeps its content', async () => {
      const { service, heldOut } = setup({
        calls: [
          call('c1', { purpose: 'eval', operationId: `eval-${RUN}-${E1}` }), call('c2', { purpose: 'eval', operationId: `eval-${RUN}-${E2}` }),
          call('c3', { purpose: 'learner', operationId: 'q9' }),
        ],
        contents: contents('c1', 'c2', 'c3'), hidden: [E1],
      });
      const { items } = await service.calls('whatever', NOW);
      expect(items.map((item) => [item.id, item.held_out, item.content === null])).toEqual([['c1', true, true], ['c2', false, false], ['c3', false, false]]);
      expect(heldOut.hiddenIds).toHaveBeenCalledExactlyOnceWith([E1, E2]);
    });

    it('a learner call whose operation id looks like an eval one is not hidden, and no id is asked for it', async () => {
      const { service, heldOut } = setup({
        calls: [call('c1', { purpose: 'learner', operationId: `eval-${RUN}-${E1}` })], contents: contents('c1'), hidden: [E1],
      });
      const { items } = await service.calls('x', NOW);
      expect(items[0]).toMatchObject({ held_out: false, content: { response: '{"x":1}' } });
      expect(heldOut.hiddenIds).not.toHaveBeenCalled();
    });

    it('an eval call whose id is not eval-<run>-<example> (a test call) is not hidden', async () => {
      const { service } = setup({ calls: [call('c1', { purpose: 'test', operationId: 'test-abc' }), call('c2', { purpose: 'eval', operationId: 'eval-abc' })], contents: contents('c1', 'c2') });
      expect((await service.calls('x', NOW)).items.map((item) => item.held_out)).toEqual([false, false]);
    });

    it('a revealed example (no longer hidden) shows its content again', async () => {
      const { service } = setup({ calls: [call('c1', { purpose: 'eval', operationId: `eval-${RUN}-${E1}` })], contents: contents('c1'), hidden: [] });
      expect((await service.calls('x', NOW)).items[0]).toMatchObject({ held_out: false, content: { response: '{"x":1}' } });
    });
  });

  describe('M3-T13, B6, R7: a judge call of a held-out example shows no content either', () => {
    const PASS = '44444444-4444-4444-8444-444444444444';
    const [PI1, PI2, PI3, PI4] = ['a', 'b', 'c', 'd'].map((c) => `${c.repeat(8)}-${c.repeat(4)}-4${c.repeat(3)}-8${c.repeat(3)}-${c.repeat(12)}`);
    const [RI1, RI2] = ['e', 'f'].map((c) => `${c.repeat(8)}-${c.repeat(4)}-4${c.repeat(3)}-8${c.repeat(3)}-${c.repeat(12)}`);
    const [EX_HELD, EX_DEV] = ['22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333'];
    const judgeCall = (id: string, passItem: string) => call(id, { purpose: 'judge', operation: 'judge', operationId: `judge-${PASS}-${passItem}` });
    const contents = (...ids: string[]) => ids.map((callId) => ({ callId, request: { data: { input: 'secret' } }, response: '{"codes":[]}', expiresAt: daysFromNow(7) }));
    const world = {
      passItems: [
        { id: PI1, subjectKind: 'eval_item', subjectId: RI1 }, { id: PI2, subjectKind: 'eval_item', subjectId: RI2 },
        { id: PI3, subjectKind: 'real_question', subjectId: '55555555-5555-4555-8555-555555555555' },
      ],
      runItems: [{ id: RI1, exampleId: EX_HELD }, { id: RI2, exampleId: EX_DEV }], hidden: [EX_HELD],
    };

    it('a judge call of a pass item whose run item is held-out has held_out true and no content; one of a dev item keeps its content', async () => {
      const { service } = setup({ ...world, calls: [judgeCall('j1', PI1), judgeCall('j2', PI2)], contents: contents('j1', 'j2') });
      const { items } = await service.calls('x', NOW);
      expect(items.map((item) => [item.id, item.held_out, item.content === null])).toEqual([['j1', true, true], ['j2', false, false]]);
    });

    it('a judge call of a real question is shown (it is not an example)', async () => {
      const { service } = setup({ ...world, calls: [judgeCall('j3', PI3)], contents: contents('j3') });
      expect((await service.calls('x', NOW)).items[0]).toMatchObject({ held_out: false, content: { response: '{"codes":[]}' } });
    });

    it('hiddenIds is asked once, with the example ids only (those of eval calls and of the run items of judge calls), never a pass item or run item id', async () => {
      const { service, heldOut } = setup({
        ...world, hidden: [],
        calls: [judgeCall('j1', PI1), judgeCall('j2', PI2), judgeCall('j3', PI3), call('c9', { purpose: 'eval', operationId: `eval-${PASS}-${EX_DEV}` })],
        contents: contents('j1', 'j2', 'j3', 'c9'),
      });
      await service.calls('x', NOW);
      expect(heldOut.hiddenIds).toHaveBeenCalledExactlyOnceWith([EX_DEV, EX_HELD, EX_DEV]);
    });

    it('fail closed: a judge call whose pass item or run item is gone (the run was deleted) cannot be traced to an example, so it shows no content', async () => {
      const { service } = setup({
        ...world, calls: [judgeCall('j4', PI4), judgeCall('j1', PI1)], contents: contents('j4', 'j1'), runItems: [],
      });
      expect((await service.calls('x', NOW)).items.map((item) => [item.held_out, item.content])).toEqual([[true, null], [true, null]]);
    });

    it('a call that only looks like a judge one is not hidden: a learner call, or a judge id that is not judge-<pass>-<item>', async () => {
      const { service, heldOut } = setup({
        ...world,
        calls: [call('c1', { purpose: 'learner', operationId: `judge-${PASS}-${PI1}` }), call('c2', { purpose: 'judge', operationId: 'judge-abc' })],
        contents: contents('c1', 'c2'),
      });
      expect((await service.calls('x', NOW)).items.map((item) => item.held_out)).toEqual([false, false]);
      expect(heldOut.hiddenIds).not.toHaveBeenCalled();
    });
  });

  it('an unknown id → items []', async () => {
    await expect(setup().service.calls('nothing', NOW)).resolves.toEqual({ items: [] });
  });
});

describe('ReportsService.callContents (contract §4, M4)', () => {
  const call = (id: string, operationId: string, attempt: 1 | 2, over: Record<string, unknown> = {}) => ({
    id, operationId, attempt, purpose: 'learner', outcome: 'succeeded', createdAt: new Date(NOW.getTime() + attempt * 1000), ...over,
  });
  const content = (callId: string, response: string, expiresAt = daysFromNow(7)) => ({ callId, request: { data: callId }, response, expiresAt });

  it('per id the content of its newest succeeded learner attempt that is still kept; an id with none is absent', async () => {
    const { service } = setup({
      calls: [
        call('a1', 'op1', 1, { outcome: 'timeout' }), call('a2', 'op1', 2),
        call('b1', 'op2', 1),
        call('e1', 'eval-R-E', 1, { purpose: 'eval' }),
      ],
      contents: [content('a1', 'timed out'), content('a2', 'op1 second'), content('b1', 'op2 first', daysFromNow(-1)), content('e1', 'eval')],
    });
    const result = await service.callContents(['op1', 'op2', 'eval-R-E', 'nothing'], NOW);
    expect(result).toEqual(new Map([['op1', { request: { data: 'a2' }, response: 'op1 second' }]]));
  });

  it('two succeeded attempts of one id: the newer one answers', async () => {
    const { service } = setup({
      calls: [call('a1', 'op1', 1), call('a2', 'op1', 2)], contents: [content('a1', 'first'), content('a2', 'second')],
    });
    expect((await service.callContents(['op1'], NOW)).get('op1')).toEqual({ request: { data: 'a2' }, response: 'second' });
  });

  it('a call without a stored response gives a null response (the content row exists, the text does not)', async () => {
    const { service } = setup({ calls: [call('a1', 'op1', 1)], contents: [{ callId: 'a1', request: {}, response: null, expiresAt: daysFromNow(7) }] });
    expect((await service.callContents(['op1'], NOW)).get('op1')).toEqual({ request: {}, response: null });
  });

  it('no id → an empty map and no query', async () => {
    const { service, contentArgs } = setup();
    await expect(service.callContents([], NOW)).resolves.toEqual(new Map());
    expect(contentArgs).toEqual([]);
  });
});
