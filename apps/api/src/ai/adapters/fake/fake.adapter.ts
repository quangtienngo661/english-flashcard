import { createHash } from 'node:crypto';
import { AiAdapter, type AdapterOutcome, type AdapterRequest, type ModelDescription, type Usage } from '../ai-adapter.js';

/** The fake's models are scenarios (design §4.3). */
export const FAKE_MODELS = [
  'fake:ok', 'fake:slow', 'fake:two-blanks', 'fake:bad-json', 'fake:truncated', 'fake:429-then-ok', 'fake:503-then-ok',
  'fake:refuse', 'fake:quota', 'fake:auth', 'fake:bad-form', 'fake:not-recognized',
] as const;

const FAKE_USAGE: Usage = { inputTokens: 100, cachedInputTokens: 0, outputTokens: 50, reasoningTokens: 0 };

type Data = Record<string, unknown>;

/** A valid answer for the operation whose output schema is `<operation>_v1`, built from `data`. */
function okValue(schemaName: string, data: Data): Record<string, unknown> {
  switch (schemaName) {
    case 'generate_cloze_v1':
      return {
        sentence: 'Lan will ___ it tomorrow.', accepted_answers: [String(data.word)], translation_vi: 'Lan sẽ làm việc đó vào ngày mai.',
      };
    case 'lookup_word_v1':
      return {
        part_of_speech: 'noun', lemma: String(data.text), meaning_vi: 'nghĩa giả', definition_en: 'a fake meaning',
        examples: [`This is ${String(data.text)}.`],
      };
    case 'translate_sentence_v1':
      return { translation_vi: `Bản dịch: ${String(data.sentence)}` };
    case 'generate_meaning_question_v1':
      return {
        sentence: `Lan ${String(data.word)} it today.`, word_in_sentence: String(data.word), translation_vi: 'Hôm nay Lan làm việc đó.',
      };
    case 'generate_sentence_mcq_v1':
      return {
        sentence: 'Lan ___ it today.', distractors: (data.candidates as string[]).slice(0, 3), translation_vi: 'Hôm nay Lan làm việc đó.',
      };
    case 'check_private_word_v1':
      return { verdict: 'ok' };
    default:
      return {};
  }
}

/**
 * Bước 7 plan choice 2: an answer that passes the gate but breaks Practice's rules — a cloze answer that is not a form of the
 * word, an MCQ distractor outside `candidates`, a `word_in_sentence` absent from the sentence. Other operations as `fake:ok`.
 */
function badFormValue(schemaName: string, data: Data): Record<string, unknown> {
  const value = okValue(schemaName, data);
  switch (schemaName) {
    case 'generate_cloze_v1':
      return { ...value, accepted_answers: [`${String(data.word)}ment`] };
    case 'generate_sentence_mcq_v1':
      return { ...value, distractors: [...(value.distractors as string[]).slice(0, 2), 'outsider'] };
    case 'generate_meaning_question_v1':
      return { ...value, word_in_sentence: `${String(data.word)}zz` };
    default:
      return value;
  }
}

/**
 * The fake provider (design §4.3), registered only when `AI_FAKE_ENABLED`. `*-then-ok` fail on every odd call per
 * `(model, data)`, so each new operation sees "fail, then ok" (plan choice 16); the counts live in this process only.
 */
export class FakeAiAdapter extends AiAdapter {
  readonly provider = 'fake';
  private readonly calls = new Map<string, number>();
  private requests = 0;

  async call(req: AdapterRequest, signal: AbortSignal): Promise<AdapterOutcome> {
    const providerRequestId = `fake_${++this.requests}`;
    const data = (req.data ?? {}) as Data;
    const ok = (text: string): AdapterOutcome => ({ kind: 'ok', text, usage: FAKE_USAGE, providerRequestId });
    const error = (kind: 'rate_limited' | 'server' | 'provider_quota' | 'auth' | 'timeout', httpStatus: number | null,
      retryAfterMs: number | null = null): AdapterOutcome =>
      ({ kind: 'error', error: kind, httpStatus, providerErrorCode: null, retryAfterMs, providerRequestId });

    switch (req.model) {
      case 'fake:ok':
        return ok(JSON.stringify(okValue(req.schema.name, data)));
      case 'fake:slow':
        await new Promise<void>((resolve) => {
          if (signal.aborted) resolve();
          else signal.addEventListener('abort', () => resolve(), { once: true });
        });
        return error('timeout', null);
      case 'fake:two-blanks':
        return ok(JSON.stringify({ ...okValue('generate_cloze_v1', data), sentence: 'Lan will ___ it ___.' }));
      case 'fake:bad-json':
        return ok('not json');
      case 'fake:truncated':
        return { kind: 'truncated', text: '{"sentence": "Lan will', usage: FAKE_USAGE, providerRequestId };
      case 'fake:429-then-ok':
        return this.isOddCall(req) ? error('rate_limited', 429, 1000) : ok(JSON.stringify(okValue(req.schema.name, data)));
      case 'fake:503-then-ok':
        return this.isOddCall(req) ? error('server', 503) : ok(JSON.stringify(okValue(req.schema.name, data)));
      case 'fake:refuse':
        return { kind: 'refused', text: null, usage: FAKE_USAGE, providerRequestId };
      case 'fake:quota':
        return error('provider_quota', 429);
      case 'fake:auth':
        return error('auth', 401);
      case 'fake:bad-form':
        return ok(JSON.stringify(badFormValue(req.schema.name, data)));
      case 'fake:not-recognized':
        return ok(JSON.stringify(req.schema.name === 'check_private_word_v1'
          ? { verdict: 'not_recognized' } : okValue(req.schema.name, data)));
      default:
        return { kind: 'error', error: 'model_rejected', httpStatus: 404, providerErrorCode: null, retryAfterMs: null, providerRequestId };
    }
  }

  async describeModel(modelId: string, _signal: AbortSignal): Promise<ModelDescription> {
    if (!(FAKE_MODELS as readonly string[]).includes(modelId)) return { kind: 'not-found' };
    return {
      kind: 'found',
      info: {
        shutdownAt: null, lifecycle: 'active', effortLevels: [], thinkingOff: null, structuredOutputs: true, maxOutputTokens: 4096,
      },
    };
  }

  private isOddCall(req: AdapterRequest): boolean {
    const key = `${req.model}|${createHash('sha256').update(JSON.stringify(req.data) ?? '').digest('hex')}`;
    const count = (this.calls.get(key) ?? 0) + 1;
    this.calls.set(key, count);
    return count % 2 === 1;
  }
}
