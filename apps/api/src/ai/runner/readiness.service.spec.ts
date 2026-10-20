import { describe, expect, it } from 'vitest';
import { SETTINGS_DEFAULTS, type AppSettings, type SettingsService } from '../../settings/index.js';
import { AiAdapter, type AdapterOutcome, type ModelDescription } from '../adapters/ai-adapter.js';
import { AiAdapterRegistry } from '../adapters/ai-adapter.registry.js';
import type { AiOperation, AiProviderName } from '../ai.types.js';
import type { CallLedger } from './call-ledger.service.js';
import { ReadinessService } from './readiness.service.js';
import type { Selection, SelectionReader } from './selection.js';

// 2026-10-20T10:00Z is 17:00 in Vietnam: 7 h (25 200 s) until the next Vietnam midnight.
const NOW = new Date('2026-10-20T10:00:00.000Z');

class StubAdapter extends AiAdapter {
  constructor(readonly provider: AiProviderName) {
    super();
  }
  async call(): Promise<AdapterOutcome> {
    throw new Error('readiness never calls a provider');
  }
  async describeModel(): Promise<ModelDescription> {
    throw new Error('readiness never calls a provider');
  }
}

const selectionOf = (operation: AiOperation, provider: AiProviderName): Selection => ({
  operation, modelRef: '00000000-0000-4000-8000-0000000000b1', provider, modelId: `${provider}-model`, effort: null, thinking: null,
  maxOutputTokens: 1_200, price: null,
});

type Setup = {
  aiEnabled?: boolean;
  cap?: number | null;
  count?: number;
  providers?: AiProviderName[];
  selections?: Partial<Record<AiOperation, Selection | null>>;
};

function setup(input: Setup = {}) {
  const settings: AppSettings = {
    ...SETTINGS_DEFAULTS,
    entitlements: { ...SETTINGS_DEFAULTS.entitlements, aiEnabled: input.aiEnabled ?? true },
    ai: { ...SETTINGS_DEFAULTS.ai, dailyProviderCallsCap: input.cap === undefined ? 3_000 : input.cap },
  };
  const registry = new AiAdapterRegistry();
  for (const provider of input.providers ?? ['openai', 'anthropic', 'fake']) registry.register(new StubAdapter(provider));
  const selections = {
    generate_cloze: selectionOf('generate_cloze', 'openai'),
    lookup_word: selectionOf('lookup_word', 'anthropic'),
    translate_sentence: selectionOf('translate_sentence', 'anthropic'),
    ...input.selections,
  };
  const counted: Date[] = [];
  const readiness = new ReadinessService(
    { get: async () => settings } as unknown as SettingsService,
    { load: async (op: AiOperation) => selections[op] } as unknown as SelectionReader,
    registry,
    {
      countToday: async (now: Date) => {
        counted.push(now);
        return input.count ?? 0;
      },
    } as unknown as CallLedger,
  );
  return { readiness, counted };
}

describe('ReadinessService.check', () => {
  it('B6E29: switch off → ai-disabled', async () => {
    const { readiness } = setup({ aiEnabled: false });
    await expect(readiness.check('generate_cloze', 'learner', NOW)).resolves.toEqual({ ready: false, reason: 'ai-disabled' });
  });

  it('B6E29: the switch is checked before the model', async () => {
    const { readiness } = setup({ aiEnabled: false, selections: { generate_cloze: null } });
    await expect(readiness.check('generate_cloze', 'learner', NOW)).resolves.toEqual({ ready: false, reason: 'ai-disabled' });
  });

  it('B6E32: no model → model-not-set', async () => {
    const { readiness } = setup({ selections: { generate_cloze: null } });
    await expect(readiness.check('generate_cloze', 'learner', NOW)).resolves.toEqual({ ready: false, reason: 'model-not-set' });
  });

  it('B6E33: the generate_cloze model is on openai and the registry has no openai → provider-not-configured, while lookup_word on anthropic is ready', async () => {
    const { readiness } = setup({ providers: ['anthropic', 'fake'] });
    await expect(readiness.check('generate_cloze', 'learner', NOW)).resolves.toEqual({
      ready: false, reason: 'provider-not-configured',
    });
    await expect(readiness.check('lookup_word', 'learner', NOW)).resolves.toEqual({
      ready: true, selection: selectionOf('lookup_word', 'anthropic'),
    });
  });

  it('B6E87: 3 000 calls today with cap 3 000 → daily-call-cap with the seconds until Vietnam midnight', async () => {
    const { readiness, counted } = setup({ cap: 3_000, count: 3_000 });
    await expect(readiness.check('generate_cloze', 'learner', NOW)).resolves.toEqual({
      ready: false, reason: 'daily-call-cap', retry_after_seconds: 25_200,
    });
    expect(counted).toEqual([NOW]);
  });

  it('2 999 → ready', async () => {
    const { readiness } = setup({ cap: 3_000, count: 2_999 });
    await expect(readiness.check('generate_cloze', 'learner', NOW)).resolves.toMatchObject({ ready: true });
  });

  it('cap null → ready with 1 000 000 calls, without counting', async () => {
    const { readiness, counted } = setup({ cap: null, count: 1_000_000 });
    await expect(readiness.check('generate_cloze', 'learner', NOW)).resolves.toMatchObject({ ready: true });
    expect(counted).toEqual([]);
  });

  it('cap 0 → daily-call-cap without retry_after_seconds', async () => {
    const { readiness } = setup({ cap: 0, count: 0 });
    await expect(readiness.check('generate_cloze', 'learner', NOW)).resolves.toEqual({ ready: false, reason: 'daily-call-cap' });
  });

  it.each(['test', 'eval'] as const)('B6E31/B6E89: purpose %s ignores the switch and the cap', async (purpose) => {
    const { readiness, counted } = setup({ aiEnabled: false, cap: 3_000, count: 5_000 });
    await expect(readiness.check('generate_cloze', purpose, NOW)).resolves.toEqual({
      ready: true, selection: selectionOf('generate_cloze', 'openai'),
    });
    expect(counted).toEqual([]);
  });

  it.each(['test', 'eval'] as const)('purpose %s still needs a model and a registered provider', async (purpose) => {
    await expect(setup({ selections: { generate_cloze: null } }).readiness.check('generate_cloze', purpose, NOW))
      .resolves.toEqual({ ready: false, reason: 'model-not-set' });
    await expect(setup({ providers: ['anthropic'] }).readiness.check('generate_cloze', purpose, NOW))
      .resolves.toEqual({ ready: false, reason: 'provider-not-configured' });
  });

  it('B6E90: ten checks at count = cap − 1 all pass (counting takes no lock)', async () => {
    const { readiness } = setup({ cap: 3_000, count: 2_999 });
    const results = await Promise.all(Array.from({ length: 10 }, () => readiness.check('generate_cloze', 'learner', NOW)));
    expect(results.every((result) => result.ready)).toBe(true);
  });
});
