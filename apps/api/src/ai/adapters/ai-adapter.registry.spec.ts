import { describe, expect, it } from 'vitest';
import { testConfig } from '../../../test/support/test-config.js';
import { AdaptersRegistrar } from './adapters.registrar.js';
import { AnthropicAdapter } from './anthropic/anthropic.adapter.js';
import { AiAdapter, type AdapterOutcome, type ModelDescription } from './ai-adapter.js';
import { AiAdapterRegistry } from './ai-adapter.registry.js';
import { FakeAiAdapter } from './fake/fake.adapter.js';
import { OpenAiAdapter } from './openai/openai.adapter.js';

class StubAdapter extends AiAdapter {
  constructor(readonly provider: 'openai' | 'anthropic') {
    super();
  }
  async call(): Promise<AdapterOutcome> {
    return { kind: 'ok', text: '{}', usage: null, providerRequestId: null };
  }
  async describeModel(): Promise<ModelDescription> {
    return { kind: 'not-found' };
  }
}

function aiConfig(fakeEnabled: boolean) {
  return testConfig({ ai: { openaiApiKey: null, anthropicApiKey: null, fakeEnabled } });
}

describe('AiAdapterRegistry', () => {
  it('finds a registered adapter by provider and lists the registered providers', () => {
    const registry = new AiAdapterRegistry();
    const openai = new StubAdapter('openai');
    registry.register(openai);
    expect(registry.get('openai')).toBe(openai);
    expect(registry.providers()).toEqual(['openai']);
  });

  it('get of an unregistered provider is undefined', () => {
    const registry = new AiAdapterRegistry();
    registry.register(new StubAdapter('openai'));
    expect(registry.get('anthropic')).toBeUndefined();
    expect(registry.get('fake')).toBeUndefined();
  });
});

describe('AdaptersRegistrar', () => {
  it('registers the fake provider when the fake is enabled', () => {
    const registry = new AiAdapterRegistry();
    new AdaptersRegistrar(aiConfig(true), registry).onModuleInit();
    expect(registry.get('fake')).toBeInstanceOf(FakeAiAdapter);
    expect(registry.providers()).toEqual(['fake']);
  });

  it('registers OpenAI only when its key is set', () => {
    const registry = new AiAdapterRegistry();
    const config = testConfig({ ai: { openaiApiKey: 'sk-test', anthropicApiKey: null, fakeEnabled: false } });
    new AdaptersRegistrar(config, registry).onModuleInit();
    expect(registry.get('openai')).toBeInstanceOf(OpenAiAdapter);
    expect(registry.providers()).toEqual(['openai']);
  });

  it('registers Anthropic only when its key is set', () => {
    const registry = new AiAdapterRegistry();
    const config = testConfig({ ai: { openaiApiKey: null, anthropicApiKey: 'sk-ant-test', fakeEnabled: false } });
    new AdaptersRegistrar(config, registry).onModuleInit();
    expect(registry.get('anthropic')).toBeInstanceOf(AnthropicAdapter);
    expect(registry.providers()).toEqual(['anthropic']);
  });

  it('registers nothing when the fake is disabled and no key is set', () => {
    const registry = new AiAdapterRegistry();
    new AdaptersRegistrar(aiConfig(false), registry).onModuleInit();
    expect(registry.get('fake')).toBeUndefined();
    expect(registry.providers()).toEqual([]);
  });
});
