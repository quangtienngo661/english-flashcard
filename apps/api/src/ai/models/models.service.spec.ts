import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { Prisma } from '../../generated/prisma/client.js';
import { SETTINGS_DEFAULTS, type SettingsService } from '../../settings/index.js';
import { AiAdapter, type ModelDescription, type ModelInfo } from '../adapters/ai-adapter.js';
import { AiAdapterRegistry } from '../adapters/ai-adapter.registry.js';
import type { AiProviderName } from '../ai.types.js';
import { ModelsService } from './models.service.js';

const NOW = new Date('2026-10-20T03:00:00Z');
const ACTOR = '11111111-1111-4111-8111-111111111111';
const INFO: ModelInfo = {
  shutdownAt: null, lifecycle: 'active', effortLevels: ['low', 'medium', 'high'], thinkingOff: 'disabled', structuredOutputs: true,
  maxOutputTokens: 64_000,
};

class StubAdapter extends AiAdapter {
  description: ModelDescription = { kind: 'found', info: INFO };
  describeModel = vi.fn(async (_modelId: string, _signal: AbortSignal) => this.description);
  constructor(readonly provider: AiProviderName) { super(); }
  call(): never { throw new Error('not used'); }
}

type Row = Record<string, unknown> & { id: string; provider: string; modelId: string };
const p2002 = () => new Prisma.PrismaClientKnownRequestError('unique', { code: 'P2002', clientVersion: 'x' });
const p2003 = () => new Prisma.PrismaClientKnownRequestError('fk', { code: 'P2003', clientVersion: 'x' });
const p2025 = () => new Prisma.PrismaClientKnownRequestError('missing', { code: 'P2025', clientVersion: 'x' });

const PRICE_KEYS = ['priceInput', 'priceCachedInput', 'priceOutput'];
/** Prices come back from the database as Decimal (or null), as numeric(12,4) does. */
const decimals = (data: Record<string, unknown>) => Object.fromEntries(Object.entries(data).map(([key, value]) =>
  [key, PRICE_KEYS.includes(key) && typeof value === 'number' ? new Prisma.Decimal(value) : value]));

/** In-memory `ai_models` and `ai_operation_settings` with the calls the service makes. */
function fakePrisma() {
  const models: Row[] = [];
  const settings: Array<{ operation: string; modelRef: string | null }> = [];
  const find = (where: { id?: string; provider_modelId?: { provider: string; modelId: string } }) => models.find((row) =>
    where.id ? row.id === where.id
      : row.provider === where.provider_modelId?.provider && row.modelId === where.provider_modelId?.modelId) ?? null;
  return {
    models, settings,
    aiModel: {
      findMany: vi.fn(async ({ where }: { where?: { provider?: string } } = {}) =>
        models.filter((row) => !where?.provider || row.provider === where.provider)),
      findUnique: vi.fn(async ({ where }: { where: Parameters<typeof find>[0] }) => find(where)),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        if (find({ provider_modelId: { provider: data.provider as string, modelId: data.modelId as string } })) throw p2002();
        const row = { id: randomUUID(), note: null, hidden: false, priceInput: null, priceCachedInput: null, priceOutput: null, ...decimals(data) } as unknown as Row;
        models.push(row);
        return row;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const row = find(where);
        if (!row) throw p2025();
        Object.assign(row, decimals(data));
        return row;
      }),
      delete: vi.fn(async ({ where }: { where: { id: string } }) => {
        const index = models.findIndex((row) => row.id === where.id);
        if (index < 0) throw p2025();
        if (settings.some((setting) => setting.modelRef === where.id)) throw p2003();
        return models.splice(index, 1)[0];
      }),
    },
    aiOperationSetting: {
      findMany: vi.fn(async ({ where }: { where?: { modelRef?: { in: string[] } | string } } = {}) => settings.filter((s) => {
        const ref = where?.modelRef;
        return ref === undefined || (typeof ref === 'string' ? s.modelRef === ref : s.modelRef !== null && ref.in.includes(s.modelRef));
      })),
    },
  };
}

async function problem(promise: Promise<unknown>): Promise<{ status: number; type: string; violations?: string[] }> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ProblemDetailsException) {
      return { status: error.getStatus(), type: error.problemType, violations: error.extensions?.violations as string[] | undefined };
    }
    throw error;
  }
  throw new Error('expected a problem');
}

describe('ModelsService', () => {
  let prisma: ReturnType<typeof fakePrisma>;
  let registry: AiAdapterRegistry;
  let anthropic: StubAdapter; let openai: StubAdapter; let fake: StubAdapter;
  let service: ModelsService;
  const clock = new FakeClock(NOW);

  beforeEach(() => {
    prisma = fakePrisma();
    registry = new AiAdapterRegistry();
    anthropic = new StubAdapter('anthropic'); openai = new StubAdapter('openai'); fake = new StubAdapter('fake');
    registry.register(anthropic); registry.register(openai); registry.register(fake);
    const settings = { get: vi.fn(async () => SETTINGS_DEFAULTS) } as unknown as SettingsService;
    service = new ModelsService(prisma as never, clock, registry, settings);
  });

  it('adds a found model with its information and a view of it', async () => {
    const view = await service.add(ACTOR, { provider: 'anthropic', model_id: 'claude-haiku-5-5', price_input: 0.1, price_output: 0.5 });
    expect(anthropic.describeModel).toHaveBeenCalledWith('claude-haiku-5-5', expect.any(AbortSignal));
    expect(prisma.aiModel.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      provider: 'anthropic', modelId: 'claude-haiku-5-5', effortLevels: ['low', 'medium', 'high'], thinkingOff: 'disabled',
      structuredOutputs: true, maxOutputTokens: 64_000, lifecycle: 'active', shutdownAt: null, infoCheckedAt: NOW, createdBy: ACTOR,
    }) });
    expect(view).toMatchObject({
      provider: 'anthropic', model_id: 'claude-haiku-5-5', effort_choices: ['low', 'medium', 'high'], thinking_off_available: true,
      structured_outputs: true, max_output_tokens: 64_000, price: { input: '0.1000', cached_input: null, output: '0.5000' },
      info_checked_at: NOW.toISOString(), used_by: [],
    });
  });

  it("B6E96: 'gpt-6-luna/../x' → 400, describeModel not called", async () => {
    expect(await problem(service.add(ACTOR, { provider: 'openai', model_id: 'gpt-6-luna/../x' })))
      .toEqual({ status: 400, type: 'validation-failed', violations: [expect.stringMatching(/^model_id: /)] });
    expect(openai.describeModel).not.toHaveBeenCalled();
  });

  it('a price with more than 4 decimals or above the maximum → 400 before the provider', async () => {
    for (const price_input of [0.12345, 1001, -1]) {
      expect((await problem(service.add(ACTOR, { provider: 'openai', model_id: 'gpt-6-luna', price_input }))).status).toBe(400);
    }
    expect(openai.describeModel).not.toHaveBeenCalled();
  });

  it('B6E34/B6#12: not-found → 422, nothing inserted', async () => {
    openai.description = { kind: 'not-found' };
    expect(await problem(service.add(ACTOR, { provider: 'openai', model_id: 'gpt-9' })))
      .toMatchObject({ status: 422, type: 'model-not-found' });
    expect(prisma.aiModel.create).not.toHaveBeenCalled();
  });

  it('B6E86: anthropic without structured outputs → 422 model-not-supported', async () => {
    anthropic.description = { kind: 'found', info: { ...INFO, structuredOutputs: false } };
    expect(await problem(service.add(ACTOR, { provider: 'anthropic', model_id: 'claude-old' })))
      .toMatchObject({ status: 422, type: 'model-not-supported' });
    expect(prisma.aiModel.create).not.toHaveBeenCalled();
  });

  it('B6E94: unavailable → 503 provider-unavailable', async () => {
    openai.description = { kind: 'unavailable' };
    expect(await problem(service.add(ACTOR, { provider: 'openai', model_id: 'gpt-6-luna' })))
      .toMatchObject({ status: 503, type: 'provider-unavailable' });
  });

  it('not-configured → 409', async () => {
    openai.description = { kind: 'not-configured' };
    expect(await problem(service.add(ACTOR, { provider: 'openai', model_id: 'gpt-6-luna' })))
      .toMatchObject({ status: 409, type: 'provider-not-configured' });
  });

  it('fake while the fake is off → 409 provider-not-configured', async () => {
    const withoutFake = new AiAdapterRegistry();
    withoutFake.register(openai);
    service = new ModelsService(prisma as never, clock, withoutFake, { get: async () => SETTINGS_DEFAULTS } as never);
    expect(await problem(service.add(ACTOR, { provider: 'fake', model_id: 'fake:ok' })))
      .toMatchObject({ status: 409, type: 'provider-not-configured' });
    expect(fake.describeModel).not.toHaveBeenCalled();
  });

  it('duplicate → 409 model-exists (before the provider, and on a unique violation)', async () => {
    await service.add(ACTOR, { provider: 'openai', model_id: 'gpt-6-luna' });
    expect(await problem(service.add(ACTOR, { provider: 'openai', model_id: 'gpt-6-luna' })))
      .toMatchObject({ status: 409, type: 'model-exists' });
    expect(openai.describeModel).toHaveBeenCalledTimes(1);
    prisma.aiModel.findUnique.mockResolvedValueOnce(null);
    expect(await problem(service.add(ACTOR, { provider: 'openai', model_id: 'gpt-6-luna' })))
      .toMatchObject({ status: 409, type: 'model-exists' });
  });

  it('fake:ok → prices 0', async () => {
    const view = await service.add(ACTOR, { provider: 'fake', model_id: 'fake:ok', price_input: 3, price_output: 9 });
    expect(view.price).toEqual({ input: '0.0000', cached_input: '0.0000', output: '0.0000' });
  });

  it('refresh updates the information', async () => {
    const added = await service.add(ACTOR, { provider: 'anthropic', model_id: 'claude-haiku-5-5' });
    clock.set(new Date('2026-10-21T03:00:00Z'));
    anthropic.description = { kind: 'found', info: { ...INFO, lifecycle: 'deprecated', shutdownAt: new Date('2026-11-01T00:00:00Z') } };
    const view = await service.refresh(added.id);
    expect(view).toMatchObject({ lifecycle: 'deprecated', shutdown_at: '2026-11-01T00:00:00.000Z', info_checked_at: '2026-10-21T03:00:00.000Z' });
    clock.set(NOW);
  });

  it('refresh: unavailable → 503', async () => {
    const added = await service.add(ACTOR, { provider: 'openai', model_id: 'gpt-6-luna' });
    openai.description = { kind: 'unavailable' };
    expect(await problem(service.refresh(added.id))).toMatchObject({ status: 503, type: 'provider-unavailable' });
  });

  it('refresh: not-found → 422', async () => {
    const added = await service.add(ACTOR, { provider: 'openai', model_id: 'gpt-6-luna' });
    openai.description = { kind: 'not-found' };
    expect(await problem(service.refresh(added.id))).toMatchObject({ status: 422, type: 'model-not-found' });
  });

  it('B6E38/B6#13: delete a model in use → 409 model-in-use (also when the foreign key catches a late choice)', async () => {
    const added = await service.add(ACTOR, { provider: 'openai', model_id: 'gpt-6-luna' });
    prisma.settings.push({ operation: 'generate_cloze', modelRef: added.id });
    expect(await problem(service.remove(added.id))).toMatchObject({ status: 409, type: 'model-in-use' });
    expect(prisma.aiModel.delete).not.toHaveBeenCalled();
    prisma.aiOperationSetting.findMany.mockResolvedValueOnce([]);
    expect(await problem(service.remove(added.id))).toMatchObject({ status: 409, type: 'model-in-use' });
    expect(prisma.models).toHaveLength(1);
  });

  it('delete a model not in use removes it', async () => {
    const added = await service.add(ACTOR, { provider: 'openai', model_id: 'gpt-6-luna' });
    await service.remove(added.id);
    expect(prisma.models).toHaveLength(0);
  });

  it('plan review #4: update, refresh, delete of an unknown id → 404 not-found', async () => {
    const unknown = randomUUID();
    for (const call of [() => service.update(unknown, { note: 'x' }), () => service.refresh(unknown), () => service.remove(unknown)]) {
      expect(await problem(call())).toMatchObject({ status: 404, type: 'not-found' });
    }
    const added = await service.add(ACTOR, { provider: 'openai', model_id: 'gpt-6-luna' });
    prisma.aiModel.findUnique.mockResolvedValueOnce(prisma.models[0] ?? null);
    prisma.models.length = 0;
    expect(await problem(service.update(added.id, { note: 'x' }))).toMatchObject({ status: 404, type: 'not-found' });
  });

  it('update sets only the given prices and note; null clears', async () => {
    const added = await service.add(ACTOR, { provider: 'openai', model_id: 'gpt-6-luna', price_input: 1, price_output: 2, note: 'a' });
    const view = await service.update(added.id, { price_output: 3, note: null });
    expect(view).toMatchObject({ price: { input: '1.0000', cached_input: null, output: '3.0000' }, note: null });
    expect((await service.update(added.id, { price_input: null })).price).toBeNull();
  });

  it('D40: a new model is not hidden; update({ hidden }) stores the admin flag and the view shows it', async () => {
    const added = await service.add(ACTOR, { provider: 'openai', model_id: 'gpt-6-luna' });
    expect((await service.list()).items[0]).toMatchObject({ hidden: false });
    const view = await service.update(added.id, { hidden: true });
    expect(view.hidden).toBe(true);
    expect(prisma.models[0]!.hidden).toBe(true);
    expect((await service.update(added.id, { hidden: false })).hidden).toBe(false);
  });

  it('D40: update without hidden leaves the flag alone; a non-boolean → 400', async () => {
    const added = await service.add(ACTOR, { provider: 'openai', model_id: 'gpt-6-luna' });
    await service.update(added.id, { hidden: true });
    expect((await service.update(added.id, { note: 'n' })).hidden).toBe(true);
    expect(await problem(service.update(added.id, { hidden: 'yes' as never }))).toMatchObject({ status: 400, type: 'validation-failed' });
  });

  it('D40: the provider refresh never writes the hidden flag (the admin owns it)', async () => {
    const added = await service.add(ACTOR, { provider: 'openai', model_id: 'gpt-6-luna' });
    await service.update(added.id, { hidden: true });
    await service.refresh(added.id);
    const data = prisma.aiModel.update.mock.calls.at(-1)![0].data as Record<string, unknown>;
    expect(data).not.toHaveProperty('hidden');
    expect(prisma.models[0]!.hidden).toBe(true);
  });

  it('list estimates per call and per 1 000 calls in VND when priced', async () => {
    await service.add(ACTOR, { provider: 'openai', model_id: 'gpt-6-luna', price_input: 0.1, price_output: 0.5 });
    openai.description = { kind: 'found', info: { ...INFO, maxOutputTokens: null } };
    await service.add(ACTOR, { provider: 'openai', model_id: 'gpt-unpriced' });
    await service.add(ACTOR, { provider: 'anthropic', model_id: 'claude-sonnet-5-5', price_input: 2, price_output: 10 });
    anthropic.description = { kind: 'found', info: { ...INFO, maxOutputTokens: null } };
    await service.add(ACTOR, { provider: 'anthropic', model_id: 'claude-unknown-max', price_input: 2, price_output: 10 });
    const items = (await service.list()).items;
    const byId = Object.fromEntries(items.map((item) => [item.model_id, item]));
    // 600 × 0.1 + 500 × 0.5 = 310 per million = $0.00031 ≈ 8.091đ; 1 000 calls ≈ 8 091đ; max call 600 in + 64 000 out.
    expect(byId['gpt-6-luna'].estimate).toEqual({
      per_call_usd: '0.00031000', per_call_vnd: 8, per_day_1000_vnd: 8091, max_call_usd: '0.03206000', max_call_vnd: 837,
    });
    expect(byId['gpt-unpriced'].estimate).toBeNull();
    // D28: Anthropic without a known maximum is estimated with 16 000.
    expect(byId['claude-unknown-max'].estimate?.max_call_usd).toBe('0.16120000');
    expect(byId['claude-sonnet-5-5'].estimate?.max_call_usd).toBe('0.64120000');
    expect((await service.list('anthropic')).items.map((item) => item.model_id)).toEqual(['claude-sonnet-5-5', 'claude-unknown-max']);
  });

  it('list names the operations that use each model', async () => {
    const added = await service.add(ACTOR, { provider: 'openai', model_id: 'gpt-6-luna' });
    prisma.settings.push({ operation: 'lookup_word', modelRef: added.id }, { operation: 'generate_cloze', modelRef: added.id });
    expect((await service.list()).items[0].used_by).toEqual(['generate_cloze', 'lookup_word']);
  });
});
