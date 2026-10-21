import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { AiResult } from '../../ai/index.js';
import type { Clock } from '../../common/clock/clock.js';
import { AppLogger, type LogEntry } from '../../common/logging/app-logger.js';
import type { ContentService, PracticeSense } from '../../content/index.js';
import type { EntitlementsService, ReserveResult } from '../../entitlements/index.js';
import type { LearningService } from '../../learning/index.js';
import type { SettingsService } from '../../settings/index.js';
import type { QuestionType } from '../practice.types.js';
import { candidate, deploy } from '../testing/ai-senses.js';
import { seededRandom } from '../testing/seeded-random.js';
import { AiQuestionGenerator, type StoredAiInput } from './ai-question-generator.service.js';
import { mcqInput } from './ai-inputs.js';
import type { AiQuestionData, AiRequestRow, AiRequestsRepository } from './ai-requests.repository.js';
import type { UnknownFormsRepository } from './unknown-forms.repository.js';
import type { WordChecksRepository, WordVerdict } from './word-checks.repository.js';

const now = new Date('2026-10-21T10:00:00.000Z');
const userId = '11111111-1111-4111-8111-111111111111';
const meta = {
  operation: 'generate_cloze', provider: 'fake', model: 'fake:ok', effort: null, prompt_revision: 2, schema_version: 1, replayed: false,
} as const;
const succeeded = (result: Record<string, unknown>): AiResult => ({ status: 'succeeded', operation_id: 'x', result, meta });
const goodCloze = { sentence: 'We ___ the app every Friday.', accepted_answers: ['deploy'], translation_vi: 'Chúng tôi triển khai.' };
const badCloze = { ...goodCloze, accepted_answers: ['deployment'] };

type Options = {
  type?: QuestionType; sense?: PracticeSense; aiInput?: StoredAiInput; ready?: Awaited<ReturnType<AiQuestionGeneratorDeps['isReady']>>;
  results?: { first?: AiResult; second?: AiResult; wc?: AiResult }; reserve?: ReserveResult;
  confirm?: 'confirmed' | 'released' | 'not-found'; gone?: boolean; wordCheck?: { contentKey: string; verdict: WordVerdict };
  /** Content reads beyond practiceSenses fail: proves a rerun does not pick again. */
  noPicks?: boolean;
};
type AiQuestionGeneratorDeps = { isReady: (op: string) => Promise<{ ready: true } | { ready: false; reason: 'model-not-set'; retry_after_seconds?: number }> };

function setup(options: Options = {}) {
  const sense = options.sense ?? deploy();
  const request: AiRequestRow = {
    id: randomUUID(), userId, sessionId: 'sess-1', senseId: sense.sense_id, type: options.type ?? 'cloze', round: 1, state: 'generating',
    failure: null, aiInput: options.aiInput ?? null, questionId: null, updatedAt: now,
  };
  const calls: string[] = [];
  const runs: Array<{ op: string; id: string; data: unknown }> = [];
  let written: AiQuestionData | null = null;
  const checks = new Map<string, { contentKey: string; verdict: WordVerdict }>();
  if (options.wordCheck) checks.set(sense.sense_id, options.wordCheck);
  const unknown: string[][] = [];
  const logs: LogEntry[] = [];

  const requests = {
    get: async () => ({ ...request }),
    saveInput: async (_id: string, input: unknown) => { request.aiInput = input; calls.push('saveInput'); },
    markFailed: async (_id: string, failure: string) => { calls.push(`failed:${failure}`); },
    writeQuestion: async (_id: string, data: AiQuestionData) => {
      calls.push('write');
      if (options.gone) return null;
      written = data;
      return { questionId: 'q-1' };
    },
    setCharged: async () => { calls.push('charged'); },
    stopSessionAi: async (_s: string, reason: string) => { calls.push(`stop:${reason}`); },
  } as unknown as AiRequestsRepository;
  const ai = {
    isReady: async () => options.ready ?? { ready: true },
    run: async (op: string, data: unknown, o: { operationId: string }) => {
      runs.push({ op, id: o.operationId, data });
      calls.push(`run:${o.operationId.replace(request.id, '')}`);
      if (o.operationId.endsWith(':wc')) return options.results?.wc ?? succeeded({ verdict: 'ok' });
      if (o.operationId.endsWith('#2')) return options.results?.second ?? succeeded(goodCloze);
      return options.results?.first ?? succeeded(goodCloze);
    },
  };
  const entitlements = {
    reserve: async () => { calls.push('reserve'); return options.reserve ?? { state: 'reserved', expires_at: now.toISOString() }; },
    confirm: async () => { calls.push('confirm'); return { state: options.confirm ?? 'confirmed' }; },
    release: async () => { calls.push('release'); return { state: 'released' }; },
  } as unknown as EntitlementsService;
  const refuse = async () => { throw new Error('picked again'); };
  const mates = ['release', 'ship', 'post', 'build'].map((lemma) => candidate({ lemma, gloss_vi: `nghĩa ${lemma}` }));
  const content = {
    practiceSenses: async () => new Map([[sense.sense_id, sense]]),
    practiceCandidates: options.noPicks ? refuse : async () => new Map(mates.map((m) => [m.sense_id, m])),
    practiceLemmaMeanings: options.noPicks ? refuse : async () => new Map(),
    practiceOtherSenses: options.noPicks ? refuse : async () => [],
    practiceRandomMeanings: options.noPicks ? refuse : async () => [],
  } as unknown as ContentService;
  const learning = {
    practiceGroupMates: options.noPicks ? refuse : async () => new Map([[sense.sense_id, mates.map((m) => m.sense_id)]]),
  } as unknown as LearningService;
  const settings = { get: async () => ({ practice: { hintDefinitionMaxChars: 200 } }) } as unknown as SettingsService;
  const wordChecks = {
    get: async (_u: string, senseId: string) => checks.get(senseId) ?? null,
    put: async (_u: string, senseId: string, contentKey: string, verdict: WordVerdict) => {
      calls.push(`check:${verdict}`);
      checks.set(senseId, { contentKey, verdict });
    },
  } as unknown as WordChecksRepository;
  const unknownForms = { record: async (_l: string, forms: string[]) => { unknown.push(forms); } } as unknown as UnknownFormsRepository;
  const generator = new AiQuestionGenerator(ai as never, entitlements, content, learning, settings, requests, wordChecks, unknownForms,
    { now: () => now } as Clock, new AppLogger({ write: (entry) => logs.push(entry) }));
  const run = () => generator.run(request.id, {
    learner: { userId, nativeLanguage: 'vi' }, session: { id: 'sess-1', aiStopped: null }, random: seededRandom(1),
  });
  return { run, calls, runs, request, written: () => written, unknown, logs, checks };
}

describe('AiQuestionGenerator (design §6.5 B–H)', () => {
  it('B: operation not ready → failed ai-unavailable, session AI stopped, nothing reserved or called', async () => {
    const t = setup({ ready: { ready: false, reason: 'model-not-set', retry_after_seconds: 30 } });
    expect(await t.run()).toEqual({ state: 'failed', failure: 'ai-unavailable', retryAfterSeconds: 30 });
    expect(t.calls).toEqual(['failed:ai-unavailable', 'stop:ai-unavailable']);
  });

  it('B7E98, B7E23: a private word checked as not recognized → failed, verdict stored, check under :wc, no unit held', async () => {
    const t = setup({ sense: deploy({ scope: 'private' }), results: { wc: succeeded({ verdict: 'not_recognized' }) } });
    expect(await t.run()).toEqual({ state: 'failed', failure: 'word-not-recognized' });
    expect(t.calls).toEqual(['run::wc', 'check:not_recognized', 'failed:word-not-recognized']);
    expect(t.runs[0].op).toBe('check_private_word');
  });

  it('a private word already checked ok for the same content is not checked again', async () => {
    const first = setup({ sense: deploy({ scope: 'private' }) });
    await first.run();
    const key = first.checks.values().next().value!.contentKey;
    const t = setup({ sense: deploy({ scope: 'private' }), wordCheck: { contentKey: key, verdict: 'ok' } });
    expect(await t.run()).toEqual({ state: 'ready', questionId: 'q-1' });
    expect(t.calls).not.toContain('run::wc');
    expect(t.written()?.contentKey).toBe(key);
  });

  it('B7E99: the check call fails → failed ai-failed, nothing stored, no unit held', async () => {
    const t = setup({ sense: deploy({ scope: 'private' }), results: { wc: { status: 'transient_failure', operation_id: 'x', reason: 'timeout' } } });
    expect(await t.run()).toEqual({ state: 'failed', failure: 'ai-failed' });
    expect(t.calls).toEqual(['run::wc', 'failed:ai-failed']);
    expect(t.checks.size).toBe(0);
  });

  it.each([
    [{ state: 'refused', reason: 'plan-required' } as ReserveResult, { state: 'failed', failure: 'plan-required' }],
    [{ state: 'refused', reason: 'quota-exhausted', resets_at: '2026-11-01T00:00:00.000Z' } as ReserveResult,
      { state: 'failed', failure: 'quota-exhausted', resetsAt: '2026-11-01T00:00:00.000Z' }],
    [{ state: 'refused', reason: 'ai-unavailable', retry_after_seconds: 60 } as ReserveResult,
      { state: 'failed', failure: 'ai-unavailable', retryAfterSeconds: 60 }],
  ])('E: reserve refused (%o) → failed with that reason, session AI stopped, no call', async (reserve, outcome) => {
    const t = setup({ reserve });
    expect(await t.run()).toEqual(outcome);
    const failure = (outcome as { failure: string }).failure;
    expect(t.calls).toEqual(['saveInput', 'reserve', `failed:${failure}`, `stop:${failure}`]);
  });

  it('B7E7: succeeded and checked → reserve, run, question written from the saved input, confirm, charged', async () => {
    const t = setup();
    expect(await t.run()).toEqual({ state: 'ready', questionId: 'q-1' });
    expect(t.calls).toEqual(['saveInput', 'reserve', 'run:', 'write', 'confirm', 'charged']);
    expect(t.runs[0]).toMatchObject({ op: 'generate_cloze', id: t.request.id, data: (t.request.aiInput as StoredAiInput).data });
    expect(t.written()).toMatchObject({
      senseRevisionId: (t.request.aiInput as StoredAiInput).senseRevisionId, contentKey: null,
      aiMeta: { ...meta, call_operation_id: t.request.id },
    });
    expect(t.written()?.built.answerKey).toMatchObject({ main: 'deploy', translation_vi: goodCloze.translation_vi });
  });

  it('B7E8, B7E34: rejected, then #2 passes → one reserve and one confirm; unknown form recorded; call id #2 stored', async () => {
    const t = setup({ results: { first: succeeded(badCloze) } });
    expect(await t.run()).toEqual({ state: 'ready', questionId: 'q-1' });
    expect(t.calls).toEqual(['saveInput', 'reserve', 'run:', 'run:#2', 'write', 'confirm', 'charged']);
    expect(t.runs[1].data).toEqual(t.runs[0].data);
    expect(t.unknown).toEqual([['deployment']]);
    expect(t.written()?.aiMeta).toMatchObject({ call_operation_id: `${t.request.id}#2` });
  });

  it('B7E9: rejected twice → release, failed rejected', async () => {
    const t = setup({ results: { first: succeeded(badCloze), second: succeeded(badCloze) } });
    expect(await t.run()).toEqual({ state: 'failed', failure: 'rejected' });
    expect(t.calls).toEqual(['saveInput', 'reserve', 'run:', 'run:#2', 'release', 'failed:rejected']);
  });

  it('B7E11: in_progress → preparing, the unit stays held', async () => {
    const t = setup({ results: { first: { status: 'in_progress', operation_id: 'x' } } });
    expect(await t.run()).toEqual({ state: 'preparing' });
    expect(t.calls).toEqual(['saveInput', 'reserve', 'run:']);
  });

  it('B7E40: input-mismatch → release, failed input-mismatch, logged as a warning', async () => {
    const t = setup({ results: { first: { status: 'permanent_failure', operation_id: 'x', reason: 'input-mismatch' } } });
    expect(await t.run()).toEqual({ state: 'failed', failure: 'input-mismatch' });
    expect(t.calls).toEqual(['saveInput', 'reserve', 'run:', 'release', 'failed:input-mismatch']);
    expect(t.logs).toContainEqual(expect.objectContaining({ level: 'warn', event: 'ai_question_failed', ai_state: 'input-mismatch' }));
  });

  it.each<[AiResult, string]>([
    [{ status: 'transient_failure', operation_id: 'x', reason: 'busy' }, 'ai-failed'],
    [{ status: 'permanent_failure', operation_id: 'x', reason: 'refused' }, 'ai-failed'],
  ])('B7E10, B7E41: %o → release, failed %s', async (first, failure) => {
    const t = setup({ results: { first } });
    expect(await t.run()).toEqual({ state: 'failed', failure });
    expect(t.calls).toEqual(['saveInput', 'reserve', 'run:', 'release', `failed:${failure}`]);
  });

  it('B7E10: unavailable at the call → release, failed ai-unavailable, session AI stopped', async () => {
    const t = setup({ results: { first: { status: 'unavailable', operation_id: 'x', reason: 'daily-call-cap', retry_after_seconds: 120 } } });
    expect(await t.run()).toEqual({ state: 'failed', failure: 'ai-unavailable', retryAfterSeconds: 120 });
    expect(t.calls).toEqual(['saveInput', 'reserve', 'run:', 'release', 'failed:ai-unavailable', 'stop:ai-unavailable']);
  });

  it('B7E116, B7E115: the request is gone at H → nothing confirmed, released, logged', async () => {
    const t = setup({ gone: true });
    expect(await t.run()).toEqual({ state: 'failed', failure: 'ai-failed' });
    expect(t.calls).toEqual(['saveInput', 'reserve', 'run:', 'write', 'release']);
    expect(t.logs).toContainEqual(expect.objectContaining({ event: 'ai_request_gone' }));
  });

  it('B7E12: confirm says released → the question is given, not charged, logged', async () => {
    const t = setup({ confirm: 'released' });
    expect(await t.run()).toEqual({ state: 'ready', questionId: 'q-1' });
    expect(t.calls).toEqual(['saveInput', 'reserve', 'run:', 'write', 'confirm']);
    expect(t.logs).toContainEqual(expect.objectContaining({ event: 'ai_confirm_not_charged', ai_state: 'released' }));
  });

  it('B7E32, B7E114: a rerun after a stale claim sends the saved ai_input again under the same id, without picking again', async () => {
    const sense = deploy();
    const mates = ['released', 'shipped', 'posted'].map((form) => candidate({ lemma: form.replace(/p?ed$/, '') }));
    const form = { answerForm: 'deployed', candidates: ['released', 'shipped', 'posted'], senses: mates };
    const aiInput: StoredAiInput = {
      senseRevisionId: 'rev-old', contentKey: null, type: 'mcq_sentence', data: mcqInput(sense, 'deployed', form.candidates), form,
    };
    const t = setup({
      type: 'mcq_sentence', sense, aiInput, noPicks: true,
      results: { first: succeeded({ sentence: 'Yesterday we ___ the app.', distractors: ['released', 'shipped', 'posted'], translation_vi: 'x' }) },
    });
    expect(await t.run()).toEqual({ state: 'ready', questionId: 'q-1' });
    expect(t.calls).toEqual(['reserve', 'run:', 'write', 'confirm', 'charged']);
    expect(t.runs[0]).toMatchObject({ op: 'generate_sentence_mcq', id: t.request.id, data: aiInput.data });
    expect(t.written()?.senseRevisionId).toBe('rev-old');
    expect(t.written()?.built.distractorSenseIds).toEqual(mates.map((m) => m.sense_id));
  });

  it('a request already ready or failed is not run again', async () => {
    const t = setup();
    t.request.state = 'ready';
    t.request.questionId = 'q-0';
    expect(await t.run()).toEqual({ state: 'ready', questionId: 'q-0' });
    expect(t.calls).toEqual([]);
  });
});
