import { describe, expect, it, vi } from 'vitest';
import { SETTINGS_DEFAULTS, type SettingsService } from '../../settings/index.js';
import { OperationSettingsService } from './operation-settings.service.js';

const MODEL = {
  id: '00000000-0000-4000-8000-0000000000b1', provider: 'openai', modelId: 'gpt-6-luna', maxOutputTokens: 64_000,
  priceInput: '0.1', priceCachedInput: null, priceOutput: '0.5',
};
const live = (operation: string, config: Record<string, unknown>, version = 0) => ({
  operation, configId: `c-${operation}`, version,
  config: { id: `c-${operation}`, effort: null, thinking: null, maxOutputTokens: 1_200, modelRef: null, model: null, ...config },
});

function setup(rows: unknown[]) {
  const findMany = vi.fn(async (_args: unknown) => rows);
  const prisma = { aiLiveConfig: { findMany } };
  const settings = { get: vi.fn(async () => SETTINGS_DEFAULTS) } as unknown as SettingsService;
  return { service: new OperationSettingsService(prisma as never, settings), findMany };
}

describe('OperationSettingsService.list (nhóm B M2: the choices are those of the live configs)', () => {
  it('one item per live config, a→z: its model, effort, thinking and token limit; the version is the pointer\'s', async () => {
    const { service, findMany } = setup([
      live('generate_cloze', { effort: 'low', thinking: 'off', maxOutputTokens: 900, modelRef: MODEL.id, model: MODEL }, 4),
      live('lookup_word', {}, 0),
    ]);
    const { items } = await service.list();
    expect(findMany).toHaveBeenCalledExactlyOnceWith({ include: { config: { include: { model: true } } }, orderBy: { operation: 'asc' } });
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({
      operation: 'generate_cloze', model: { id: MODEL.id, provider: 'openai', model_id: 'gpt-6-luna' }, effort: 'low', thinking: 'off',
      max_output_tokens: 900, version: 4, input_fields: ['word', 'part_of_speech', 'level', 'meaning_vi', 'context_label'],
    });
    expect(items[0]!.estimate).not.toBeNull();
    expect(items[1]).toMatchObject({ operation: 'lookup_word', model: null, effort: null, thinking: null, version: 0, estimate: null });
  });

  it('an operation without a model has no estimate; thinking other than off reads as null', async () => {
    const { service } = setup([live('translate_sentence', { thinking: 'weird' })]);
    expect((await service.list()).items[0]).toMatchObject({ model: null, thinking: null, estimate: null });
  });
});
