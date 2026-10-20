import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { Prisma } from '../../generated/prisma/client.js';
import { SETTINGS_DEFAULTS, type SettingsService } from '../../settings/index.js';
import { AiAdapter } from '../adapters/ai-adapter.js';
import { AiAdapterRegistry } from '../adapters/ai-adapter.registry.js';
import type { AiProviderName } from '../ai.types.js';
import { OperationSettingsService } from './operation-settings.service.js';

const NOW = new Date('2026-10-20T03:00:00Z');
const ACTOR = '11111111-1111-4111-8111-111111111111';

class StubAdapter extends AiAdapter {
  constructor(readonly provider: AiProviderName) { super(); }
  call(): never { throw new Error('not used'); }
  describeModel(): never { throw new Error('not used'); }
}

type Model = {
  id: string; provider: string; modelId: string; effortLevels: string[]; thinkingOff: string | null; maxOutputTokens: number | null;
  priceInput: Prisma.Decimal | null; priceCachedInput: Prisma.Decimal | null; priceOutput: Prisma.Decimal | null;
};
type Setting = {
  operation: string; modelRef: string | null; effort: string | null; thinking: string | null; maxOutputTokens: number | null;
  version: number; updatedBy: string | null; updatedAt: Date;
};

/** In-memory `ai_operation_settings` (seeded as the migration does), `ai_models` and the change log. */
function fakePrisma() {
  const models: Model[] = [];
  const settings: Setting[] = [
    ['generate_cloze', 1200], ['lookup_word', 1200], ['translate_sentence', 800],
  ].map(([operation, max]) => ({
    operation: operation as string, modelRef: null, effort: null, thinking: null, maxOutputTokens: max as number, version: 0,
    updatedBy: null, updatedAt: new Date('2026-10-19T00:00:00Z'),
  }));
  const changes: Array<Record<string, unknown>> = [];
  const withModel = (setting: Setting) => ({ ...setting, model: models.find((model) => model.id === setting.modelRef) ?? null });
  const client = {
    models, settings, changes,
    aiModel: { findUnique: vi.fn(async ({ where }: { where: { id: string } }) => models.find((model) => model.id === where.id) ?? null) },
    aiOperationSetting: {
      findMany: vi.fn(async () => settings.map(withModel)),
      findUnique: vi.fn(async ({ where }: { where: { operation: string } }) => {
        const setting = settings.find((row) => row.operation === where.operation);
        return setting ? withModel(setting) : null;
      }),
      updateMany: vi.fn(async ({ where, data }: { where: { operation: string; version: number }; data: Record<string, unknown> }) => {
        const setting = settings.find((row) => row.operation === where.operation && row.version === where.version);
        if (!setting) return { count: 0 };
        if (data.modelRef && !models.some((model) => model.id === data.modelRef)) {
          throw new Prisma.PrismaClientKnownRequestError('fk', { code: 'P2003', clientVersion: 'x' });
        }
        const { version, ...rest } = data as { version: { increment: number } };
        Object.assign(setting, rest, { version: setting.version + version.increment });
        return { count: 1 };
      }),
    },
    aiOperationSettingChange: { create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => { changes.push(data); return data; }) },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(client)),
  };
  return client;
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

const body = (patch: Record<string, unknown> = {}) => ({
  expected_version: 0, model_ref: null, effort: null, thinking: null, max_output_tokens: 1200, ...patch,
});

describe('OperationSettingsService', () => {
  let prisma: ReturnType<typeof fakePrisma>;
  let registry: AiAdapterRegistry;
  let service: OperationSettingsService;
  const addModel = (patch: Partial<Model>): Model => {
    const model: Model = {
      id: randomUUID(), provider: 'anthropic', modelId: 'claude-haiku-5-5', effortLevels: ['low', 'medium', 'high', 'xhigh', 'max'],
      thinkingOff: 'disabled', maxOutputTokens: 64_000, priceInput: new Prisma.Decimal(2), priceCachedInput: null,
      priceOutput: new Prisma.Decimal(10), ...patch,
    };
    prisma.models.push(model);
    return model;
  };

  beforeEach(() => {
    prisma = fakePrisma();
    registry = new AiAdapterRegistry();
    registry.register(new StubAdapter('anthropic')); registry.register(new StubAdapter('fake'));
    const settings = { get: vi.fn(async () => SETTINGS_DEFAULTS) } as unknown as SettingsService;
    service = new OperationSettingsService(prisma as never, new FakeClock(NOW), registry, settings);
  });

  it('B6#1: list on a new database → three operations without a model, version 0, input fields per operation', async () => {
    expect((await service.list()).items).toEqual([
      { operation: 'generate_cloze', model: null, effort: null, thinking: null, max_output_tokens: 1200, version: 0,
        input_fields: ['word', 'part_of_speech', 'level', 'meaning_vi', 'context_label'], estimate: null },
      { operation: 'lookup_word', model: null, effort: null, thinking: null, max_output_tokens: 1200, version: 0,
        input_fields: ['text', 'context_sentence'], estimate: null },
      { operation: 'translate_sentence', model: null, effort: null, thinking: null, max_output_tokens: 800, version: 0,
        input_fields: ['sentence'], estimate: null },
    ]);
  });

  it('a put sets the choice, bumps the version and returns the item with its estimate', async () => {
    const model = addModel({});
    const item = await service.put(ACTOR, 'generate_cloze', body({ model_ref: model.id, effort: 'low', thinking: 'off' }));
    expect(item).toMatchObject({
      operation: 'generate_cloze', model: { id: model.id, provider: 'anthropic', model_id: 'claude-haiku-5-5' }, effort: 'low',
      thinking: 'off', max_output_tokens: 1200, version: 1,
    });
    // 600 × 2 + 1 200 × 10 = 13 200 per million.
    expect(item.estimate?.max_call_usd).toBe('0.01320000');
    expect(prisma.settings[0]).toMatchObject({ updatedBy: ACTOR, updatedAt: NOW });
  });

  it('B6E39: two puts with version 0 → the second 409 operation-settings-conflict', async () => {
    const model = addModel({});
    await service.put(ACTOR, 'generate_cloze', body({ model_ref: model.id }));
    expect(await problem(service.put(ACTOR, 'generate_cloze', body({ model_ref: model.id, effort: 'high' }))))
      .toMatchObject({ status: 409, type: 'operation-settings-conflict' });
    expect(prisma.changes).toHaveLength(1);
  });

  it('B6E37 through the service → 400 with the violation path', async () => {
    const model = addModel({});
    expect(await problem(service.put(ACTOR, 'generate_cloze', body({ model_ref: model.id, effort: 'xhigh', thinking: 'off' }))))
      .toEqual({ status: 400, type: 'validation-failed', violations: ['thinking: off needs effort high or below'] });
    expect(prisma.aiOperationSetting.updateMany).not.toHaveBeenCalled();
  });

  it('unknown model_ref → 400 (also when the model is deleted before the write)', async () => {
    expect(await problem(service.put(ACTOR, 'generate_cloze', body({ model_ref: randomUUID() }))))
      .toEqual({ status: 400, type: 'validation-failed', violations: ['model_ref: not found'] });
    const model = addModel({});
    prisma.aiModel.findUnique.mockResolvedValueOnce(model);
    prisma.models.length = 0;
    expect(await problem(service.put(ACTOR, 'generate_cloze', body({ model_ref: model.id }))))
      .toEqual({ status: 400, type: 'validation-failed', violations: ['model_ref: not found'] });
  });

  it('model_ref null → turned off, version + 1, one change row with old and new values', async () => {
    const model = addModel({});
    await service.put(ACTOR, 'lookup_word', body({ model_ref: model.id, effort: 'medium' }));
    const item = await service.put(ACTOR, 'lookup_word', body({ expected_version: 1, max_output_tokens: null }));
    expect(item).toMatchObject({ model: null, effort: null, max_output_tokens: null, version: 2 });
    expect(prisma.changes).toHaveLength(2);
    expect(prisma.changes[1]).toEqual({
      operation: 'lookup_word', changedBy: ACTOR, changedAt: NOW,
      oldValue: { model_ref: model.id, effort: 'medium', thinking: null, max_output_tokens: 1200 },
      newValue: { model_ref: null, effort: null, thinking: null, max_output_tokens: null },
    });
  });

  it('turning off refuses an effort or thinking choice without a model', async () => {
    expect((await problem(service.put(ACTOR, 'lookup_word', body({ effort: 'low' })))).violations)
      .toEqual(['effort: not offered by this model']);
  });

  it('provider not registered → 409', async () => {
    const model = addModel({ provider: 'openai', modelId: 'gpt-6-luna' });
    expect(await problem(service.put(ACTOR, 'generate_cloze', body({ model_ref: model.id }))))
      .toMatchObject({ status: 409, type: 'provider-not-configured' });
  });

  it('B6E85: anthropic with max_output_tokens null and a known model maximum → accepted', async () => {
    const model = addModel({});
    const item = await service.put(ACTOR, 'generate_cloze', body({ model_ref: model.id, max_output_tokens: null }));
    expect(item.max_output_tokens).toBeNull();
    // The call sends the model's maximum: 600 × 2 + 64 000 × 10 = 641 200 per million.
    expect(item.estimate?.max_call_usd).toBe('0.64120000');
  });

  it('D28: the same with an unknown maximum → accepted, estimate uses 16 000', async () => {
    const model = addModel({ maxOutputTokens: null });
    const item = await service.put(ACTOR, 'generate_cloze', body({ model_ref: model.id, max_output_tokens: null }));
    expect(item.max_output_tokens).toBeNull();
    expect(item.estimate?.max_call_usd).toBe('0.16120000');
  });

  it('bad bodies → 400 before any read', async () => {
    for (const bad of [{ ...body(), expected_version: -1 }, { ...body(), thinking: 'on' }, { ...body(), extra: 1 },
      { ...body(), model_ref: 'x' }, { ...body(), max_output_tokens: 1.5 }]) {
      expect((await problem(service.put(ACTOR, 'generate_cloze', bad as never))).status).toBe(400);
    }
    expect(prisma.aiModel.findUnique).not.toHaveBeenCalled();
  });
});
