import { describe, expect, it } from 'vitest';
import type { AdapterOutcome, AdapterRequest } from '../ai-adapter.js';
import { FAKE_MODELS, FakeAiAdapter } from './fake.adapter.js';

const CLOZE_DATA = {
  word: 'deploy', part_of_speech: 'verb', level: 'B1', meaning_vi: 'triển khai', context_label: null,
};

function request(model: string, overrides: Partial<AdapterRequest> = {}): AdapterRequest {
  return {
    model,
    instructions: 'Write one sentence.',
    data: CLOZE_DATA,
    schema: { name: 'generate_cloze_v1', schema: { type: 'object' } },
    effort: null,
    thinking: null,
    maxOutputTokens: null,
    timeoutMs: 10_000,
    ...overrides,
  };
}

function call(adapter: FakeAiAdapter, req: AdapterRequest): Promise<AdapterOutcome> {
  return adapter.call(req, new AbortController().signal);
}

function okText(outcome: AdapterOutcome): Record<string, unknown> {
  if (outcome.kind !== 'ok') throw new Error(`expected ok, got ${outcome.kind}`);
  return JSON.parse(outcome.text) as Record<string, unknown>;
}

describe('FakeAiAdapter.call', () => {
  it('fake:ok generate_cloze → a sentence with one blank, the word as answer, a Vietnamese translation, usage and a request id', async () => {
    const outcome = await call(new FakeAiAdapter(), request('fake:ok'));
    expect(okText(outcome)).toEqual({
      sentence: 'Lan will ___ it tomorrow.', accepted_answers: ['deploy'], translation_vi: expect.any(String),
    });
    expect(outcome).toMatchObject({
      usage: { inputTokens: 100, cachedInputTokens: 0, outputTokens: 50, reasoningTokens: 0 },
      providerRequestId: 'fake_1',
    });
  });

  it('fake:ok lookup_word → lemma = text, noun, Vietnamese and English text, one example', async () => {
    const outcome = await call(new FakeAiAdapter(), request('fake:ok', {
      data: { text: 'deploy', context_sentence: null }, schema: { name: 'lookup_word_v1', schema: {} },
    }));
    const value = okText(outcome);
    expect(value).toMatchObject({ lemma: 'deploy', part_of_speech: 'noun' });
    expect(Object.keys(value).sort()).toEqual(['definition_en', 'examples', 'lemma', 'meaning_vi', 'part_of_speech']);
    expect(value.meaning_vi).toEqual(expect.any(String));
    expect(value.definition_en).toEqual(expect.any(String));
    expect(value.examples).toHaveLength(1);
  });

  it('fake:ok translate_sentence → "Bản dịch: " + sentence', async () => {
    const outcome = await call(new FakeAiAdapter(), request('fake:ok', {
      data: { sentence: 'I like tea.' }, schema: { name: 'translate_sentence_v1', schema: {} },
    }));
    expect(okText(outcome)).toEqual({ translation_vi: 'Bản dịch: I like tea.' });
  });

  it('request ids count up per adapter', async () => {
    const adapter = new FakeAiAdapter();
    await call(adapter, request('fake:ok'));
    expect(await call(adapter, request('fake:ok'))).toMatchObject({ providerRequestId: 'fake_2' });
  });

  it('fake:two-blanks → ok with a sentence holding two blanks', async () => {
    const value = okText(await call(new FakeAiAdapter(), request('fake:two-blanks')));
    expect(String(value.sentence).match(/___/g)).toHaveLength(2);
  });

  it('fake:bad-json → ok with the text "not json"', async () => {
    const outcome = await call(new FakeAiAdapter(), request('fake:bad-json'));
    expect(outcome).toMatchObject({ kind: 'ok', text: 'not json' });
  });

  it('fake:truncated → truncated', async () => {
    expect(await call(new FakeAiAdapter(), request('fake:truncated'))).toMatchObject({ kind: 'truncated' });
  });

  it('fake:refuse → refused', async () => {
    expect(await call(new FakeAiAdapter(), request('fake:refuse'))).toMatchObject({ kind: 'refused' });
  });

  it('fake:quota → provider_quota with 429', async () => {
    expect(await call(new FakeAiAdapter(), request('fake:quota')))
      .toMatchObject({ kind: 'error', error: 'provider_quota', httpStatus: 429 });
  });

  it('fake:auth → auth with 401', async () => {
    expect(await call(new FakeAiAdapter(), request('fake:auth')))
      .toMatchObject({ kind: 'error', error: 'auth', httpStatus: 401 });
  });

  it('429-then-ok: calls 1, 2, 3 for one data → rate_limited (1000 ms), ok, rate_limited', async () => {
    const adapter = new FakeAiAdapter();
    const rateLimited = { kind: 'error', error: 'rate_limited', httpStatus: 429, retryAfterMs: 1000 };
    expect(await call(adapter, request('fake:429-then-ok'))).toMatchObject(rateLimited);
    okText(await call(adapter, request('fake:429-then-ok')));
    expect(await call(adapter, request('fake:429-then-ok'))).toMatchObject(rateLimited);
  });

  it('503-then-ok: server with 503 and no retry-after, then ok', async () => {
    const adapter = new FakeAiAdapter();
    expect(await call(adapter, request('fake:503-then-ok')))
      .toMatchObject({ kind: 'error', error: 'server', httpStatus: 503, retryAfterMs: null });
    okText(await call(adapter, request('fake:503-then-ok')));
  });

  it('a different data has its own count', async () => {
    const adapter = new FakeAiAdapter();
    expect(await call(adapter, request('fake:429-then-ok'))).toMatchObject({ error: 'rate_limited' });
    const other = request('fake:429-then-ok', { data: { ...CLOZE_DATA, word: 'release' } });
    expect(await call(adapter, other)).toMatchObject({ error: 'rate_limited' });
    okText(await call(adapter, other));
  });

  it('slow resolves only after the signal aborts (abort at 20 ms → result after ≥ 20 ms, timeout)', async () => {
    const controller = new AbortController();
    const started = performance.now();
    setTimeout(() => controller.abort(), 20);
    const outcome = await new FakeAiAdapter().call(request('fake:slow'), controller.signal);
    expect(performance.now() - started).toBeGreaterThanOrEqual(19);
    expect(outcome).toMatchObject({ kind: 'error', error: 'timeout' });
  });

  it('an unknown fake model → model_rejected, never a throw', async () => {
    expect(await call(new FakeAiAdapter(), request('fake:nope')))
      .toMatchObject({ kind: 'error', error: 'model_rejected', httpStatus: 404 });
  });

  it('slow with an already aborted signal → timeout at once', async () => {
    const outcome = await new FakeAiAdapter().call(request('fake:slow'), AbortSignal.abort());
    expect(outcome).toMatchObject({ kind: 'error', error: 'timeout' });
  });
});

describe('FakeAiAdapter.describeModel', () => {
  it.each(FAKE_MODELS)('%s → found with structured outputs', async (model) => {
    expect(await new FakeAiAdapter().describeModel(model, new AbortController().signal)).toEqual({
      kind: 'found',
      info: {
        shutdownAt: null, lifecycle: 'active', effortLevels: [], thinkingOff: null, structuredOutputs: true, maxOutputTokens: 4096,
      },
    });
  });

  it("'fake:nope' → not-found", async () => {
    expect(await new FakeAiAdapter().describeModel('fake:nope', new AbortController().signal)).toEqual({ kind: 'not-found' });
  });
});
