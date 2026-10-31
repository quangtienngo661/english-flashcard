import { describe, expect, it } from 'vitest';
import type { AiOperation } from '../../ai.types.js';
import { OPERATIONS, parseOutput } from '../../operations/operations.js';
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

  // Bước 7 plan Task 5 and plan choice 2: each new schema under fake:ok passes the gate's own check.
  const SENSE = { word: 'deploy', part_of_speech: 'verb', level: 'B2', meaning_vi: 'triển khai', context_label: null };
  const NEW_OPS = [
    { op: 'generate_meaning_question', data: { ...SENSE, other_meanings_vi: ['điều quân', 'trì hoãn', 'giao hàng'] } },
    { op: 'generate_sentence_mcq', data: { ...SENSE, answer_form: 'deployed', candidates: ['delivered', 'debugged', 'delayed', 'deleted'] } },
    { op: 'check_private_word', data: { word: 'rizz', part_of_speech: 'noun', meaning_vi: 'sức hút' } },
  ] as const;
  const run = (model: string, op: AiOperation, data: Record<string, unknown>) =>
    call(new FakeAiAdapter(), request(model, { data, schema: OPERATIONS[op].outputSchema }));
  const parsed = async (model: string, op: AiOperation, data: Record<string, unknown>) => {
    const outcome = await run(model, op, data);
    if (outcome.kind !== 'ok') throw new Error(`expected ok, got ${outcome.kind}`);
    const check = parseOutput(op, outcome.text);
    if (!check.ok) throw new Error(`${op}: ${check.problem}`);
    return check.value;
  };

  it.each(NEW_OPS)('fake:ok $op passes parseOutput', async ({ op, data }) => {
    await parsed('fake:ok', op, data);
  });

  it('fake:ok generate_meaning_question → the word itself in the sentence; generate_sentence_mcq → the first three candidates', async () => {
    const meaning = await parsed('fake:ok', 'generate_meaning_question', NEW_OPS[0].data);
    expect(meaning).toMatchObject({ sentence: 'Lan deploy it today.', word_in_sentence: 'deploy' });
    const mcq = await parsed('fake:ok', 'generate_sentence_mcq', NEW_OPS[1].data);
    expect(mcq).toMatchObject({ sentence: 'Lan ___ it today.', distractors: ['delivered', 'debugged', 'delayed'] });
    expect(await parsed('fake:ok', 'check_private_word', NEW_OPS[2].data)).toEqual({ verdict: 'ok' });
  });

  it('fake:bad-form → passes the gate, but the answer is not a form of the word, a distractor is outside candidates and the word is absent', async () => {
    const cloze = await parsed('fake:bad-form', 'generate_cloze', CLOZE_DATA);
    expect(cloze.accepted_answers).toEqual(['deployment']);
    const mcq = await parsed('fake:bad-form', 'generate_sentence_mcq', NEW_OPS[1].data);
    const candidates: readonly string[] = NEW_OPS[1].data.candidates;
    expect((mcq.distractors as string[]).filter((item) => !candidates.includes(item))).toHaveLength(1);
    const meaning = await parsed('fake:bad-form', 'generate_meaning_question', NEW_OPS[0].data);
    expect(String(meaning.sentence)).not.toContain(String(meaning.word_in_sentence));
    expect(await parsed('fake:bad-form', 'check_private_word', NEW_OPS[2].data)).toEqual({ verdict: 'ok' });
  });

  it("fake:not-recognized → verdict 'not_recognized'; other operations as fake:ok", async () => {
    expect(await parsed('fake:not-recognized', 'check_private_word', NEW_OPS[2].data)).toEqual({ verdict: 'not_recognized' });
    expect(await parsed('fake:not-recognized', 'generate_cloze', CLOZE_DATA)).toMatchObject({ accepted_answers: ['deploy'] });
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

describe('FakeAiAdapter — the judge operation (nhóm B M3, E13)', () => {
  const judgeRequest = (model: string, accepted: string[], codes = ['single_answer']): AdapterRequest => request(model, {
    data: {
      target_operation: 'generate_cloze', input: CLOZE_DATA, output: { sentence: 'We ___ it.', accepted_answers: accepted, translation_vi: 'x' },
      criteria: codes.map((code) => ({ code, question: 'Q' })), context: null,
    },
    schema: { name: 'judge_v1', schema: { type: 'object' } },
  });

  it('fake:ok passes an output whose answers do not end in ment, and the answer passes the gateway rules', async () => {
    const text = okText(await call(new FakeAiAdapter(), judgeRequest('fake:ok', ['deploy'])));
    expect(text).toEqual({ codes: ['single_answer'], verdicts: ['pass'], reasons: ['fake judge'] });
    expect(parseOutput('judge', JSON.stringify(text))).toEqual({ ok: true, value: { codes: ['single_answer'], verdicts: ['pass'], reasons: ['fake judge'] } });
  });

  it('fake:ok fails every criterion of an output whose answer ends in ment (the mark of fake:bad-form)', async () => {
    const text = okText(await call(new FakeAiAdapter(), judgeRequest('fake:ok', ['deployment'], ['single_answer', 'natural'])));
    expect(text).toEqual({
      codes: ['single_answer', 'natural'], verdicts: ['fail_major', 'fail_major'], reasons: ['fake judge', 'fake judge'],
    });
    expect(parseOutput('judge', JSON.stringify(text)).ok).toBe(true);
  });

  it('fake:bad-form fails every criterion whatever the output', async () => {
    const text = okText(await call(new FakeAiAdapter(), judgeRequest('fake:bad-form', ['deploy'], ['single_answer', 'natural'])));
    expect(text).toEqual({
      codes: ['single_answer', 'natural'], verdicts: ['fail_major', 'fail_major'],
      reasons: ['fake: another word fits', 'fake: another word fits'],
    });
    expect(parseOutput('judge', JSON.stringify(text)).ok).toBe(true);
  });

  it('an output without accepted_answers (another operation) passes', async () => {
    const outcome = await call(new FakeAiAdapter(), request('fake:ok', {
      data: { target_operation: 'translate_sentence', input: { sentence: 'Hi' }, output: { translation_vi: 'Chào' }, criteria: [{ code: 'natural', question: 'Q' }], context: null },
      schema: { name: 'judge_v1', schema: { type: 'object' } },
    }));
    expect(okText(outcome)).toEqual({ codes: ['natural'], verdicts: ['pass'], reasons: ['fake judge'] });
  });
});
