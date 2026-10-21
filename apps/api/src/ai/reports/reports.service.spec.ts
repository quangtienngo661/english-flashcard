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
  lastErrors?: Array<{ operation: string; created_at: Date; outcome: string; http_status: number | null }>;
  today?: { failed_calls: number; failed_cost_usd: string; cost_usd: string };
  grouped?: Array<Record<string, unknown>>;
  total?: Record<string, unknown>;
  calls?: Array<Record<string, unknown>>;
  contents?: Array<{ callId: string; request: unknown; response: string | null; expiresAt: Date }>;
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
    aiOperationSetting: {
      findMany: vi.fn(async () => AI_OPERATIONS.map((operation) => ({
        operation, effort: operation === 'generate_cloze' ? 'low' : null, thinking: null, maxOutputTokens: 1_200,
        modelRef: models[operation]?.id ?? null, model: models[operation],
      }))),
    },
    aiCall: { findMany: vi.fn(async () => input.calls ?? []) },
    aiCallContent: {
      findMany: vi.fn(async (args: unknown) => {
        contentArgs.push(args);
        return input.contents ?? [];
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
      return [input.today ?? { failed_calls: 0, failed_cost_usd: '0.00000000', cost_usd: '0.00000000' }];
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
  const service = new ReportsService(prisma, { get: async () => settings } as unknown as SettingsService, readiness, registry, ledger);
  return { service, statements, counted, contentArgs };
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
        generate_cloze: { ready: true, selection: {} as never },
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
      lastErrors: [{ operation: 'generate_cloze', created_at: at, outcome: 'provider-quota', http_status: 429 }],
    });
    const { operations } = await service.status(NOW);
    expect(operations[0].last_error).toEqual({ at: at.toISOString(), outcome: 'provider-quota', http_status: 429 });
    expect(operations[1].last_error).toBeNull();
    const distinct = statements.find((statement) => statement.sql.includes('DISTINCT ON'));
    expect(distinct?.sql).toContain("WHERE outcome <> 'succeeded'");
    expect(distinct?.sql).toContain('ORDER BY operation, created_at DESC');
  });

  it('plan review #2: an invalid-shape call shows as last_error and in failed_calls', async () => {
    const at = new Date('2026-10-20T04:00:00.000Z');
    const { service } = setup({
      lastErrors: [{ operation: 'lookup_word', created_at: at, outcome: 'invalid-shape', http_status: null }],
      today: { failed_calls: 1, failed_cost_usd: '0.00003500', cost_usd: '0.00010500' },
    });
    const report = await service.status(NOW);
    expect(report.operations[1].last_error).toEqual({ at: at.toISOString(), outcome: 'invalid-shape', http_status: null });
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
    const { service } = setup({ today: { failed_calls: 3, failed_cost_usd: '0.01000000', cost_usd: '1.28120000' } });
    expect((await service.status(NOW)).today).toEqual({
      calls: 42, cap: 3_000, failed_calls: 3, failed_cost_usd: '0.01000000', cost_usd: '1.28120000', cost_vnd: 33_439,
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
  const call = (id: string) => ({
    id, attempt: 1, purpose: 'learner', operation: 'generate_cloze', provider: 'fake', model: 'fake:ok', effort: null, thinking: null,
    maxOutputTokens: 1_200, promptRevision: 1, outcome: 'succeeded', httpStatus: null, providerErrorCode: null, latencyMs: 12,
    inputTokens: 100, cachedInputTokens: 0, outputTokens: 50, reasoningTokens: 0, costUsd: { toFixed: () => '0.00003500' },
    costKnown: true, createdAt: NOW,
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

  it('an unknown id → items []', async () => {
    await expect(setup().service.calls('nothing', NOW)).resolves.toEqual({ items: [] });
  });
});
