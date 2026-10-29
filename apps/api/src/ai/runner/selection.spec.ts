import { describe, expect, it, vi } from 'vitest';
import { SelectionReader, toSelection, type ModelRow } from './selection.js';

const MODEL_REF = '00000000-0000-4000-8000-0000000000b1';

const model = (overrides: Partial<ModelRow> = {}): ModelRow => ({
  id: MODEL_REF, provider: 'anthropic', modelId: 'claude-haiku-5-5', thinkingOff: 'disabled', maxOutputTokens: 64_000,
  priceInput: '1.0000', priceCachedInput: '0.1000', priceOutput: '5.0000', ...overrides,
});

const setting = (overrides: Partial<{ effort: string | null; thinking: string | null; maxOutputTokens: number | null }> = {}) => ({
  effort: null, thinking: null, maxOutputTokens: 1_200, ...overrides,
});

describe('toSelection (design §6.3)', () => {
  it('copies the model, effort and limit and reads the prices as numbers', () => {
    expect(toSelection('lookup_word', setting({ effort: 'low' }), model())).toEqual({
      operation: 'lookup_word', modelRef: MODEL_REF, provider: 'anthropic', modelId: 'claude-haiku-5-5', effort: 'low',
      thinking: null, maxOutputTokens: 1_200, price: { input: 1, cachedInput: 0.1, output: 5 },
    });
  });

  it("'off' with a between_tools model → between_tools", () => {
    expect(toSelection('lookup_word', setting({ thinking: 'off' }), model({ thinkingOff: 'between_tools' })).thinking)
      .toBe('between_tools');
  });

  it("'off' with a disabled model → disabled", () => {
    expect(toSelection('lookup_word', setting({ thinking: 'off' }), model()).thinking).toBe('disabled');
  });

  it('anthropic with an empty limit → the model’s 64 000', () => {
    expect(toSelection('lookup_word', setting({ maxOutputTokens: null }), model()).maxOutputTokens).toBe(64_000);
  });

  it('D28: anthropic with an empty limit and an unknown model maximum → 16 000', () => {
    expect(toSelection('lookup_word', setting({ maxOutputTokens: null }), model({ maxOutputTokens: null })).maxOutputTokens)
      .toBe(16_000);
  });

  it('openai with an empty limit → null', () => {
    const openai = model({ provider: 'openai', modelId: 'gpt-6-luna', thinkingOff: null, maxOutputTokens: null });
    expect(toSelection('generate_cloze', setting({ maxOutputTokens: null }), openai).maxOutputTokens).toBeNull();
  });

  it('one missing price → price null', () => {
    expect(toSelection('lookup_word', setting(), model({ priceOutput: null })).price).toBeNull();
    expect(toSelection('lookup_word', setting(), model({ priceInput: null })).price).toBeNull();
  });

  it('no cached price → cachedInput null (the input price applies)', () => {
    expect(toSelection('lookup_word', setting(), model({ priceCachedInput: null })).price).toEqual({
      input: 1, cachedInput: null, output: 5,
    });
  });
});

describe('SelectionReader (nhóm B M2: the selection of the live config)', () => {
  function reader(selection: ReturnType<typeof toSelection> | null) {
    const load = vi.fn(async (_op: string) => ({ configId: 'c', number: 3, prompt: { instructions: 'x', examples: [], revision: 3 }, selection }));
    return { reader: new SelectionReader({ load } as never), load };
  }

  it('no model in the live config → null', async () => {
    const { reader: selections } = reader(null);
    await expect(selections.load('generate_cloze')).resolves.toBeNull();
  });

  it('asks the live config reader once and returns its selection as it is', async () => {
    const chosen = toSelection('lookup_word', setting(), model());
    const { reader: selections, load } = reader(chosen);
    await expect(selections.load('lookup_word')).resolves.toBe(chosen);
    expect(load).toHaveBeenCalledExactlyOnceWith('lookup_word');
  });
});
