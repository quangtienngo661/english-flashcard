import { describe, expect, it, vi } from 'vitest';
import { LiveConfigReader } from './live-config.reader.js';

const MODEL = {
  id: '00000000-0000-4000-8000-0000000000b1', provider: 'fake', modelId: 'fake:ok', thinkingOff: 'disabled', maxOutputTokens: 4096,
  priceInput: '1.0000', priceCachedInput: null, priceOutput: '2.0000',
};
const config = (over: Record<string, unknown> = {}) => ({
  id: 'c7', operation: 'generate_cloze', number: 7, version: 0, instructions: 'X', examples: [], modelRef: MODEL.id, effort: 'low', thinking: 'off',
  maxOutputTokens: 1_200, model: MODEL, ...over,
});

function setup(row: unknown) {
  const findUnique = vi.fn(async (_args: unknown) => row);
  return { reader: new LiveConfigReader({ aiLiveConfig: { findUnique } } as never), findUnique };
}

describe('LiveConfigReader.load (design §6.1: the gateway reads the live config on every call, no cache)', () => {
  it('one query: the pointer, its config and the config model; the prompt revision is the config number', async () => {
    const { reader, findUnique } = setup({ operation: 'generate_cloze', config: config() });
    const live = await reader.load('generate_cloze');
    expect(findUnique).toHaveBeenCalledExactlyOnceWith({ where: { operation: 'generate_cloze' }, include: { config: { include: { model: true } } } });
    expect(live).toEqual({
      configId: 'c7', number: 7, prompt: { instructions: 'X', examples: [], revision: 7 },
      selection: {
        operation: 'generate_cloze', modelRef: MODEL.id, provider: 'fake', modelId: 'fake:ok', effort: 'low', thinking: 'disabled', maxOutputTokens: 1_200,
        price: { input: 1, cachedInput: null, output: 2 },
      },
    });
  });

  it('a config without a model has no selection but still a prompt', async () => {
    const { reader } = setup({ operation: 'generate_cloze', config: config({ number: 2, modelRef: null, model: null }) });
    const live = await reader.load('generate_cloze');
    expect(live.selection).toBeNull();
    expect(live.prompt).toEqual({ instructions: 'X', examples: [], revision: 2 });
  });

  it('is read again on every call: a pointer that moved between two calls is seen at once', async () => {
    const findUnique = vi.fn()
      .mockResolvedValueOnce({ operation: 'generate_cloze', config: config({ number: 7 }) })
      .mockResolvedValueOnce({ operation: 'generate_cloze', config: config({ number: 8, instructions: 'Y' }) });
    const reader = new LiveConfigReader({ aiLiveConfig: { findUnique } } as never);
    expect((await reader.load('generate_cloze')).prompt.revision).toBe(7);
    expect((await reader.load('generate_cloze')).prompt).toMatchObject({ revision: 8, instructions: 'Y' });
  });

  it('an operation with no live pointer is a deployment error, named', async () => {
    const { reader } = setup(null);
    await expect(reader.load('lookup_word')).rejects.toThrow('no live config for lookup_word');
  });
});
