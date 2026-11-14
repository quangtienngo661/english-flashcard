import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import type { AppLogger } from '../../common/logging/app-logger.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { OPERATION_ID_PATTERN, type AiResult, type AiService } from '../../ai/index.js';
import type { EntitlementsService } from '../../entitlements/index.js';
import type { WordSense, WordsService } from '../words/words.service.js';
import { AiLookupService, lookupOperationId } from './ai-lookup.service.js';

const USER = '00000000-0000-4000-8000-0000000000c1';
const KEY = 'idem-key-1';
const OP = lookupOperationId(KEY);
const SUGGESTION = {
  part_of_speech: 'noun', lemma: 'Rizz', meaning_vi: 'sức hút', definition_en: 'charm, especially in dating', examples: ['He has rizz.'],
};
const META = { operation: 'lookup_word', provider: 'fake', model: 'fake:ok', effort: null, prompt_revision: 1, schema_version: 1, replayed: false };
const sense = (id: string, scope: 'catalog' | 'private') => ({ sense_id: id, scope }) as unknown as WordSense;

function setup(options: { allowed?: boolean; ready?: boolean; reserve?: unknown; run?: AiResult | Error } = {}) {
  const entitlements = {
    check: vi.fn(async () => (options.allowed ?? true) ? { allowed: true } : { allowed: false, reason: 'plan-required' }),
    reserve: vi.fn(async () => options.reserve ?? { state: 'reserved', expires_at: '2026-10-21T10:02:00Z' }),
    confirm: vi.fn(async () => ({ state: 'confirmed' })),
    release: vi.fn(async () => ({ state: 'released' })),
  };
  const run = options.run ?? { status: 'succeeded', operation_id: OP, result: SUGGESTION, meta: META };
  const ai = {
    isReady: vi.fn(async () => (options.ready ?? true) ? { ready: true } : { ready: false, reason: 'model-not-set' }),
    run: vi.fn(async () => { if (run instanceof Error) throw run; return run; }),
  };
  const words = {
    lookup: vi.fn(async () => ({ senses: [sense('p1', 'private'), sense('c1', 'catalog'), sense('c2', 'catalog')], via_inflection: [] })),
  };
  const logger = { info: vi.fn(), warn: vi.fn() };
  const service = new AiLookupService(ai as unknown as AiService, entitlements as unknown as EntitlementsService,
    words as unknown as WordsService, logger as unknown as AppLogger);
  const lookup = (language: 'vi' | 'en' = 'vi', context: string | null = 'We met at the bank.') =>
    service.lookup({ userId: USER, nativeLanguage: language }, KEY, 'rizz', context);
  return { service, entitlements, ai, words, logger, lookup };
}

async function problem(promise: Promise<unknown>): Promise<ProblemDetailsException> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(ProblemDetailsException);
    return error as ProblemDetailsException;
  }
  throw new Error('expected a problem');
}

describe('lookupOperationId (design §11.1)', () => {
  it("'lookup:' + the first 32 hex of sha256(key); fits OPERATION_ID_PATTERN; same key → same id", () => {
    expect(OP).toBe(`lookup:${createHash('sha256').update(KEY).digest('hex').slice(0, 32)}`);
    expect(OPERATION_ID_PATTERN.test(OP)).toBe(true);
    expect(lookupOperationId(KEY)).toBe(OP);
    expect(lookupOperationId('other')).not.toBe(OP);
  });
});

describe('AiLookupService.lookup (design §11.1, B7E19–B7E22, B7E90–B7E95)', () => {
  it('Free (ai.lookup not allowed) → 403 entitlement-required; no readiness, no reserve, no AI', async () => {
    const { entitlements, ai, lookup } = setup({ allowed: false });
    const error = await problem(lookup());
    expect([error.getStatus(), error.problemType]).toEqual([403, 'entitlement-required']);
    expect(entitlements.check).toHaveBeenCalledWith(USER, 'ai.lookup');
    expect(ai.isReady).not.toHaveBeenCalled();
    expect(entitlements.reserve).not.toHaveBeenCalled();
  });

  it('lookup_word not ready → 503 ai-unavailable with the reason; nothing reserved', async () => {
    const { entitlements, ai, lookup } = setup({ ready: false });
    const error = await problem(lookup());
    expect([error.getStatus(), error.problemType, error.extensions]).toEqual([503, 'ai-unavailable', { reason: 'model-not-set' }]);
    expect(ai.isReady).toHaveBeenCalledWith('lookup_word');
    expect(entitlements.reserve).not.toHaveBeenCalled();
  });

  it("reserve refused (quota) → Bước 5's problem; no AI call", async () => {
    const { ai, lookup } = setup({ reserve: { state: 'refused', reason: 'quota-exhausted', resets_at: '2026-11-01T00:00:00Z' } });
    const error = await problem(lookup());
    expect([error.getStatus(), error.problemType, error.extensions]).toEqual([403, 'quota-exhausted', { resets_at: '2026-11-01T00:00:00Z' }]);
    expect(ai.run).not.toHaveBeenCalled();
  });

  it('succeeded → confirm once; suggestion in the learner language; catalog senses first, then private', async () => {
    const { entitlements, ai, words, lookup } = setup();
    const response = await lookup('vi');
    expect(entitlements.reserve).toHaveBeenCalledWith(USER, 'ai_lookup', OP);
    expect(ai.run).toHaveBeenCalledWith('lookup_word', { text: 'rizz', context_sentence: 'We met at the bank.' },
      { operationId: OP, userId: USER, purpose: 'learner' });
    expect(entitlements.confirm).toHaveBeenCalledTimes(1);
    expect(entitlements.confirm).toHaveBeenCalledWith(USER, 'ai_lookup', OP);
    expect(entitlements.release).not.toHaveBeenCalled();
    expect(words.lookup).toHaveBeenCalledWith(USER, 'rizz', 'vi');
    expect(response).toEqual({
      suggestion: {
        part_of_speech: 'noun', lemma: 'Rizz', meaning: { text: 'sức hút', language: 'vi' }, definition_en: 'charm, especially in dating',
        examples: ['He has rizz.'],
      },
      catalog_senses: [sense('c1', 'catalog'), sense('c2', 'catalog'), sense('p1', 'private')],
    });
  });

  it('an English learner sees definition_en as the meaning; no context sentence → null', async () => {
    const { ai, lookup } = setup();
    const response = await lookup('en', null);
    expect(response.suggestion.meaning).toEqual({ text: 'charm, especially in dating', language: 'en' });
    expect(ai.run).toHaveBeenCalledWith('lookup_word', { text: 'rizz', context_sentence: null }, expect.anything());
  });

  it("a reservation already confirmed (a retry after success) still runs: the gateway replays its result", async () => {
    const { entitlements, lookup } = setup({ reserve: { state: 'confirmed' } });
    await lookup();
    expect(entitlements.confirm).toHaveBeenCalledTimes(1);
  });

  it('in_progress → 409 ai-in-progress, Retry-After 2; the reservation is kept', async () => {
    const { entitlements, lookup } = setup({ run: { status: 'in_progress', operation_id: OP } });
    const error = await problem(lookup());
    expect([error.getStatus(), error.problemType, error.retryAfterSeconds]).toEqual([409, 'ai-in-progress', 2]);
    expect(entitlements.release).not.toHaveBeenCalled();
    expect(entitlements.confirm).not.toHaveBeenCalled();
  });

  it.each([
    [{ status: 'transient_failure', operation_id: OP, reason: 'timeout' } as AiResult, true],
    [{ status: 'unavailable', operation_id: OP, reason: 'daily-call-cap' } as AiResult, true],
    [{ status: 'permanent_failure', operation_id: OP, reason: 'refused' } as AiResult, false],
  ])('%o → release, 503 ai-lookup-failed, retryable %s', async (run, retryable) => {
    const { entitlements, lookup } = setup({ run });
    const error = await problem(lookup());
    expect([error.getStatus(), error.problemType, error.extensions]).toEqual([503, 'ai-lookup-failed', { retryable }]);
    expect(entitlements.release).toHaveBeenCalledWith(USER, 'ai_lookup', OP);
    expect(entitlements.confirm).not.toHaveBeenCalled();
  });

  it('an exception from the gateway releases the reservation and is rethrown', async () => {
    const { entitlements, lookup } = setup({ run: new Error('boom') });
    await expect(lookup()).rejects.toThrow('boom');
    expect(entitlements.release).toHaveBeenCalledWith(USER, 'ai_lookup', OP);
  });

  it('SR10, B7E95: the log line has ids and states only, never the text, the context sentence or the suggestion', async () => {
    for (const run of [undefined, { status: 'permanent_failure', operation_id: OP, reason: 'refused' } as AiResult]) {
      const { logger, lookup } = setup({ run });
      await lookup().catch(() => undefined);
      const logged = JSON.stringify([...logger.info.mock.calls, ...logger.warn.mock.calls]);
      expect(logged).toContain(OP);
      for (const secret of ['rizz', 'Rizz', 'We met at the bank', 'sức hút', 'charm']) expect(logged).not.toContain(secret);
    }
  });
});
