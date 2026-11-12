import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import type { ContentService, Learner } from '../../content/index.js';
import type { EntitlementsService } from '../../entitlements/index.js';
import type { PracticeAiRequest, PracticeQuestion, PracticeSession, PracticeSessionItem, PrismaClient } from '../../generated/prisma/client.js';
import type { LearningService, PracticeItem } from '../../learning/index.js';
import { SETTINGS_DEFAULTS, type AppSettings, type SettingsService } from '../../settings/index.js';
import type { AiQuestionGenerator, GenerateOutcome } from '../ai/ai-question-generator.service.js';
import { AiRequestsRepository } from '../ai/ai-requests.repository.js';
import type { AiSessionPlanner } from '../ai/ai-session-planner.service.js';
import type { AiFailure, QuestionType } from '../practice.types.js';
import type { QuestionBuilder } from '../questions/question-builder.service.js';
import { deploy } from '../testing/ai-senses.js';
import type { PracticeStats } from '../weak/practice-stats.js';
import { SessionsService } from './sessions.service.js';

const learner: Learner = { userId: '00000000-0000-4000-8000-000000000001', nativeLanguage: 'vi' };
const now = new Date('2026-10-21T03:00:00Z');
const REVISION = '00000000-0000-4000-8000-0000000000aa';

/** Equality, `in`, `lt`; `items: { none: {} }` is applied by the caller. */
function matches(row: Record<string, unknown>, where: Record<string, unknown> = {}): boolean {
  return Object.entries(where).every(([key, value]) => {
    if (key === 'items') return true;
    if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
      const v = value as { in?: unknown[]; lt?: Date };
      if (v.in) return v.in.includes(row[key]);
      if (v.lt) return (row[key] as Date) < v.lt;
      return true;
    }
    return row[key] === value;
  });
}

type Options = {
  types: QuestionType[]; senseIds?: string[]; aiSenseIds?: string[]; aiPlanned?: number; clozeSource?: 'ai' | 'own' | 'own_then_ai' | null;
  aiStopped?: string | null; target?: number;
  /** Practice AI count (09/11/2026): the session's stored placement; null = started without ai_count. */
  aiPlacement?: string | null;
  /** Practice settings over the defaults. */
  practice?: Partial<AppSettings['practice']>;
  /** What the generator does with a request. */
  generate?: (request: PracticeAiRequest) => GenerateOutcome | 'ready-free' | Promise<GenerateOutcome | 'ready-free'>;
  aiAvailable?: (senseId: string) => QuestionType[]; prefetch?: number;
  /** The builder finds no rule type for any word (no saved sentence, no other rule type chosen). */
  skipBuild?: boolean;
};

function setup(options: Options) {
  const senseIds = options.senseIds ?? ['s1', 's2'];
  const session: PracticeSession = {
    id: 'sess-1', userId: learner.userId, kind: 'practice', source: 'all', groupId: null, groupFilter: null, sort: 'queue', types: options.types,
    promptStyle: 'meaning', targetCount: options.target ?? senseIds.length, senseIds, status: 'active', continued: null,
    pendingNotice: null, startedAt: now, lastActivityAt: now, endedAt: null, clozeSource: options.clozeSource ?? null,
    aiPlanned: options.aiPlanned ?? 0, aiSenseIds: options.aiSenseIds ?? [], pendingAiRequestId: null,
    aiStopped: options.aiStopped ?? null, aiNoticeShown: false, aiPlacement: options.aiPlacement ?? null,
  };
  const questions: PracticeQuestion[] = [];
  const items: PracticeSessionItem[] = [];
  const requests: PracticeAiRequest[] = [];
  const counters = { generate: 0, confirm: 0, charged: 0, built: [] as QuestionType[][], availability: [] as Array<Record<string, unknown>> };

  const question = (data: Partial<PracticeQuestion>): PracticeQuestion => {
    const row = {
      id: randomUUID(), userId: learner.userId, senseId: 's1', type: 'type_word', promptStyle: 'meaning', blank: null, schemaVersion: 1,
      prompt: {}, answerKey: { asked_private: false }, hints: { level1: null, level2: null }, distractorSenseIds: [], createdAt: now,
      source: 'rule', aiRequestId: null, aiMeta: null, aiCharged: false, senseRevisionId: null, contentKey: null, ...data,
    } as PracticeQuestion;
    questions.push(row);
    return row;
  };
  const withQuestion = (item: PracticeSessionItem) => ({ ...item, question: questions.find((q) => q.id === item.questionId)! });

  const tx = {
    $queryRaw: async () => [{ id: session.id }],
    $executeRaw: async () => 0,
    practiceSession: {
      findUniqueOrThrow: async () => ({ ...session }),
      update: async ({ data }: { data: Partial<PracticeSession> }) => { Object.assign(session, data); return { ...session }; },
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Partial<PracticeSession> }) => {
        if (!matches(session as unknown as Record<string, unknown>, where)) return { count: 0 };
        Object.assign(session, data);
        return { count: 1 };
      },
    },
    practiceSessionItem: {
      findMany: async ({ include }: { include?: unknown }) => {
        const sorted = [...items].sort((a, b) => a.position - b.position);
        return include ? sorted.map(withQuestion) : sorted;
      },
      create: async ({ data }: { data: Partial<PracticeSessionItem> }) => {
        const row = {
          id: randomUUID(), answeredAt: null, answerRaw: null, answerNormalized: null, answersTried: [], tries: 0, skipped: false,
          result: null, hintLevel: 0, localDate: null, reviewAction: null, ...data,
        } as PracticeSessionItem;
        items.push(row);
        return withQuestion(row);
      },
      updateMany: async ({ where, data }: { where: { id: string }; data: Partial<PracticeSessionItem> }) => {
        const row = items.find((i) => i.id === where.id);
        if (row) Object.assign(row, data);
        return { count: row ? 1 : 0 };
      },
    },
    practiceQuestion: {
      create: async ({ data }: { data: Partial<PracticeQuestion> }) => question(data),
      findMany: async ({ where }: { where: Record<string, unknown> }) =>
        questions.filter((q) => matches(q as unknown as Record<string, unknown>, where) && !items.some((i) => i.questionId === q.id)),
      updateMany: async ({ where, data }: { where: { id: string }; data: Partial<PracticeQuestion> }) => {
        const row = questions.find((q) => q.id === where.id);
        if (row) Object.assign(row, data);
        counters.charged++;
        return { count: 1 };
      },
    },
    practiceAiRequest: {
      create: async ({ data }: { data: Partial<PracticeAiRequest> }) => {
        const row = {
          id: randomUUID(), failure: null, aiInput: null, questionId: null, createdAt: new Date(now.getTime() + requests.length),
          updatedAt: now, ...data,
        } as PracticeAiRequest;
        requests.push(row);
        return row;
      },
      findUnique: async ({ where }: { where: { id: string } }) => requests.find((r) => r.id === where.id) ?? null,
      findFirst: async ({ where }: { where: Record<string, unknown> }) =>
        [...requests].reverse().find((r) => matches(r as unknown as Record<string, unknown>, where)) ?? null,
      findMany: async ({ where }: { where: Record<string, unknown> }) =>
        requests.filter((r) => matches(r as unknown as Record<string, unknown>, where)),
      updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Partial<PracticeAiRequest> }) => {
        const rows = requests.filter((r) => matches(r as unknown as Record<string, unknown>, where));
        rows.forEach((r) => Object.assign(r, data));
        return { count: rows.length };
      },
    },
  };
  // One transaction at a time: the session row lock of lockOpen.
  let chain: Promise<unknown> = Promise.resolve();
  const prisma = {
    ...tx,
    practiceSession: { ...tx.practiceSession, findFirst: async () => ({ ...session }), updateMany: async () => ({ count: 0 }) },
    $transaction: (fn: (t: typeof tx) => Promise<unknown>) => {
      const run = chain.then(() => fn(tx));
      chain = run.catch(() => undefined);
      return run;
    },
  } as unknown as PrismaClient;

  const aiRequests = new AiRequestsRepository(prisma);
  const sense = (id: string) => deploy({ sense_id: id, lemma: `w-${id}`, live_revision_id: REVISION });
  const generator = {
    run: vi.fn(async (requestId: string): Promise<GenerateOutcome> => {
      counters.generate++;
      const request = requests.find((r) => r.id === requestId)!;
      const outcome = options.generate ? await options.generate(request) : { state: 'ready' as const, questionId: '' };
      if (outcome !== 'ready-free' && outcome.state !== 'ready') {
        if (outcome.state === 'failed') Object.assign(request, { state: 'failed', failure: outcome.failure });
        return outcome;
      }
      const q = question({ senseId: request.senseId, type: request.type, source: 'ai', aiRequestId: request.id,
        aiCharged: outcome !== 'ready-free', senseRevisionId: REVISION });
      Object.assign(request, { state: 'ready', questionId: q.id });
      return { state: 'ready', questionId: q.id };
    }),
  };
  const builder = {
    availability: async (input: { senseIds: string[] }) => {
      counters.availability.push(input);
      return new Map(input.senseIds.map((id) => [id, options.aiAvailable ? options.aiAvailable(id) : (['cloze', 'mcq_sentence'] as QuestionType[])]));
    },
    build: async ({ chosenTypes }: { chosenTypes: QuestionType[] }) => {
      counters.built.push(chosenTypes);
      if (options.skipBuild) return { skip: 'no-type' as const };
      return {
        type: chosenTypes[0], promptStyle: 'meaning', prompt: { kind: 'type_meaning' }, answerKey: { asked_private: false },
        hints: { level1: null, level2: null }, blank: null, distractorSenseIds: [],
      };
    },
  };
  const entitlements = {
    check: vi.fn(async (_u: string, _feature: string) => ({ allowed: true })),
    confirm: vi.fn(async () => { counters.confirm++; return { state: 'confirmed' }; }),
  };
  const learning = {
    practiceItems: async () => senseIds.map((id) => ({ sense_id: id }) as PracticeItem),
    practiceCheck: async () => ({ groupExists: true, item: null }),
  };
  const content = {
    practiceSenses: async (_u: string, ids: string[]) => new Map(ids.map((id) => [id, sense(id)])),
    visibleSenseIds: async (_u: string, ids: string[]) => new Set(ids),
  };
  const settings = { ...SETTINGS_DEFAULTS, practice: { ...SETTINGS_DEFAULTS.practice, aiPrefetchCount: options.prefetch ?? 2, ...options.practice } };
  const service = new SessionsService(prisma, new FakeClock(now), { get: async () => settings } as unknown as SettingsService,
    entitlements as unknown as EntitlementsService, learning as unknown as LearningService, builder as unknown as QuestionBuilder,
    {} as PracticeStats, {} as AiSessionPlanner, generator as unknown as AiQuestionGenerator, aiRequests,
    content as unknown as ContentService);
  const answerLast = () => { items.at(-1)!.result = 'correct'; };
  const questionOf = (item: PracticeSessionItem) => questions.find((q) => q.id === item.questionId)!;
  return { service, session, items, requests, questions, counters, generator, entitlements, answerLast, questionOf, question };
}

const failed = (failure: AiFailure): GenerateOutcome => ({ state: 'failed', failure });

describe('next with AI slots (design §6.3, §6.5)', () => {
  it('round 1: an unmarked word gets a rule type; the marked word goes through a request, the generator and G', async () => {
    const t = setup({ types: ['type_word', 'cloze'], clozeSource: 'ai', aiSenseIds: ['s2'], aiPlanned: 1 });
    const first = await t.service.next(learner, 'sess-1');
    expect(first).toMatchObject({ state: 'question', item: { type: 'type_word' } });
    expect(t.counters.built).toEqual([['type_word']]);
    t.answerLast();
    const second = await t.service.next(learner, 'sess-1');
    expect(second).toMatchObject({ state: 'question' });
    expect(t.requests).toHaveLength(1);
    expect(t.generator.run).toHaveBeenCalledTimes(1);
    expect(t.questionOf(t.items[1])).toMatchObject({ source: 'ai', senseId: 's2' });
    expect(t.session.pendingAiRequestId).toBeNull();
    // Charged at H: no late confirm.
    expect(t.counters.confirm).toBe(0);
  });

  it('B7E16, B7E112: two next calls on the same slot at once → one request, one generator run, one item', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const t = setup({ types: ['cloze'], clozeSource: 'ai', senseIds: ['s1'], aiSenseIds: ['s1'], aiPlanned: 1,
      generate: async () => { await gate; return { state: 'ready', questionId: '' }; } });
    const a = t.service.next(learner, 'sess-1');
    const b = t.service.next(learner, 'sess-1');
    const later = await b;
    expect(later).toMatchObject({ state: 'preparing', retry_after_seconds: 2 });
    release();
    expect(await a).toMatchObject({ state: 'question' });
    expect(t.requests).toHaveLength(1);
    expect(t.generator.run).toHaveBeenCalledTimes(1);
    expect(t.items).toHaveLength(1);
    // A third call returns the same item, never a second one.
    expect(await t.service.next(learner, 'sess-1')).toMatchObject({ state: 'question', item: { item_id: t.items[0].id } });
    expect(t.items).toHaveLength(1);
  });

  it('B7E111: a pointer to a fresh generating request → preparing, no planning, no run', async () => {
    const t = setup({ types: ['cloze'], clozeSource: 'ai', senseIds: ['s1', 's2'], aiSenseIds: ['s1', 's2'], aiPlanned: 2 });
    const request = { id: randomUUID(), userId: learner.userId, sessionId: 'sess-1', senseId: 's2', type: 'cloze', round: 1,
      state: 'generating', failure: null, aiInput: null, questionId: null, createdAt: now, updatedAt: now } as PracticeAiRequest;
    t.requests.push(request);
    t.session.pendingAiRequestId = request.id;
    expect(await t.service.next(learner, 'sess-1')).toMatchObject({ state: 'preparing' });
    expect(t.generator.run).not.toHaveBeenCalled();
    expect(t.requests).toHaveLength(1);
    expect(t.items).toHaveLength(0);
  });

  it('B7E32: a pointer to a generating request older than 2 minutes is taken over and run', async () => {
    const t = setup({ types: ['cloze'], clozeSource: 'ai', senseIds: ['s1'], aiSenseIds: ['s1'], aiPlanned: 1 });
    const request = { id: randomUUID(), userId: learner.userId, sessionId: 'sess-1', senseId: 's1', type: 'cloze', round: 1,
      state: 'generating', failure: null, aiInput: null, questionId: null, createdAt: now,
      updatedAt: new Date(now.getTime() - 180_000) } as PracticeAiRequest;
    t.requests.push(request);
    t.session.pendingAiRequestId = request.id;
    expect(await t.service.next(learner, 'sess-1')).toMatchObject({ state: 'question' });
    expect(t.generator.run).toHaveBeenCalledWith(request.id, expect.anything());
  });

  it('B7E48: AI-only, the AI fails → ai_unavailable; again without retry_ai → no call; with retry_ai → a new request', async () => {
    let outcome: GenerateOutcome = failed('ai-failed');
    const t = setup({ types: ['cloze'], clozeSource: 'ai', senseIds: ['s1'], aiSenseIds: ['s1'], aiPlanned: 1, generate: () => outcome });
    expect(await t.service.next(learner, 'sess-1')).toMatchObject({ state: 'ai_unavailable', reason: 'ai-failed' });
    expect(await t.service.next(learner, 'sess-1')).toMatchObject({ state: 'ai_unavailable', reason: 'ai-failed' });
    expect(t.generator.run).toHaveBeenCalledTimes(1);
    outcome = { state: 'ready', questionId: '' };
    expect(await t.service.next(learner, 'sess-1', true)).toMatchObject({ state: 'question' });
    expect(t.requests).toHaveLength(2);
    expect(t.generator.run).toHaveBeenCalledTimes(2);
  });

  it('B7E49: mixed session, AI fails at two words → rule types for both; ai-fallback notice only the first time', async () => {
    const t = setup({ types: ['type_word', 'cloze'], clozeSource: 'ai', senseIds: ['s1', 's2'], aiSenseIds: ['s1', 's2'], aiPlanned: 2,
      generate: () => failed('rejected') });
    const first = await t.service.next(learner, 'sess-1');
    expect(first).toMatchObject({ state: 'question', item: { type: 'type_word' }, notice: 'ai-fallback', ai_reason: 'ai-failed' });
    t.answerLast();
    const second = await t.service.next(learner, 'sess-1');
    expect(second).toMatchObject({ state: 'question', item: { type: 'type_word' } });
    expect(second).not.toHaveProperty('notice');
    expect(t.items.map((i) => i.senseId)).toEqual(['s1', 's2']);
  });

  it('B7E98: word not recognized → rule type with notice word-not-recognized and the sense id', async () => {
    const t = setup({ types: ['type_word', 'meaning_in_sentence'], senseIds: ['s1'], aiSenseIds: ['s1'], aiPlanned: 1,
      generate: () => failed('word-not-recognized') });
    expect(await t.service.next(learner, 'sess-1'))
      .toMatchObject({ state: 'question', notice: 'word-not-recognized', sense_id: 's1', lemma: 'w-s1', item: { type: 'type_word' } });
  });

  it('B7E13: AI stopped for the session → mixed: rule types without calling AI; AI-only: ai_unavailable with the reason', async () => {
    const mixed = setup({ types: ['type_word', 'cloze'], clozeSource: 'ai', aiSenseIds: ['s1', 's2'], aiPlanned: 2, aiStopped: 'quota-exhausted' });
    expect(await mixed.service.next(learner, 'sess-1')).toMatchObject({ state: 'question', item: { type: 'type_word' } });
    expect(mixed.generator.run).not.toHaveBeenCalled();
    const only = setup({ types: ['cloze'], clozeSource: 'ai', aiSenseIds: ['s1', 's2'], aiPlanned: 2, aiStopped: 'quota-exhausted' });
    expect(await only.service.next(learner, 'sess-1')).toMatchObject({ state: 'ai_unavailable', reason: 'quota-exhausted' });
  });

  it('B7E15: an unseen AI question of the word is asked: no request, no run, no confirm', async () => {
    const t = setup({ types: ['cloze'], clozeSource: 'ai', senseIds: ['s1'], aiSenseIds: ['s1'], aiPlanned: 1 });
    const unseen = t.question({ senseId: 's1', type: 'cloze', source: 'ai', senseRevisionId: REVISION, aiCharged: true });
    expect(await t.service.next(learner, 'sess-1')).toMatchObject({ state: 'question' });
    expect(t.items[0].questionId).toBe(unseen.id);
    expect(t.requests).toHaveLength(0);
    expect(t.generator.run).not.toHaveBeenCalled();
    expect(t.counters.confirm).toBe(0);
  });

  it('B7E33: a question written but not charged is confirmed late at G', async () => {
    const t = setup({ types: ['cloze'], clozeSource: 'ai', senseIds: ['s1'], aiSenseIds: ['s1'], aiPlanned: 1, generate: () => 'ready-free' });
    expect(await t.service.next(learner, 'sess-1')).toMatchObject({ state: 'question' });
    expect(t.counters.confirm).toBe(1);
    expect(t.questionOf(t.items[0]).aiCharged).toBe(true);
  });

  it('B7E47: a marked word that no longer takes an AI type gets a rule type', async () => {
    const t = setup({ types: ['type_word', 'cloze'], clozeSource: 'ai', senseIds: ['s1'], aiSenseIds: ['s1'], aiPlanned: 1, aiAvailable: () => [] });
    expect(await t.service.next(learner, 'sess-1')).toMatchObject({ state: 'question', item: { type: 'type_word' } });
    expect(t.requests).toHaveLength(0);
  });

  it('B7E113: a request made ahead that failed → mixed: rule type at once, no new call', async () => {
    const t = setup({ types: ['type_word', 'cloze'], clozeSource: 'ai', senseIds: ['s1'], aiSenseIds: ['s1'], aiPlanned: 1 });
    t.requests.push({ id: randomUUID(), userId: learner.userId, sessionId: 'sess-1', senseId: 's1', type: 'cloze', round: 1, state: 'failed',
      failure: 'ai-failed', aiInput: null, questionId: null, createdAt: now, updatedAt: now } as PracticeAiRequest);
    expect(await t.service.next(learner, 'sess-1')).toMatchObject({ state: 'question', item: { type: 'type_word' } });
    expect(t.generator.run).not.toHaveBeenCalled();
  });

  describe('cloze with source own_then_ai (a saved sentence first, else AI)', () => {
    // The real builder decides per word; here s1 has a saved sentence and is not marked for AI, s2 has none and is.
    it('round 1: the word with a saved sentence is asked from it with no AI call; the marked word goes through AI', async () => {
      // The AI side offers the cloze only (the mock would otherwise also offer mcq_sentence and the request type would be random).
      const t = setup({ types: ['cloze'], clozeSource: 'own_then_ai', aiSenseIds: ['s2'], aiPlanned: 1, aiAvailable: () => ['cloze'] });
      expect(await t.service.next(learner, 'sess-1')).toMatchObject({ state: 'question', item: { type: 'cloze' } });
      expect(t.counters.built).toEqual([['cloze']]);
      expect(t.questionOf(t.items[0])).toMatchObject({ source: 'own_sentence', senseId: 's1' });
      expect(t.requests).toHaveLength(0);
      t.answerLast();
      expect(await t.service.next(learner, 'sess-1')).toMatchObject({ state: 'question', item: { type: 'cloze' } });
      expect(t.requests).toHaveLength(1);
      expect(t.requests[0]).toMatchObject({ senseId: 's2', type: 'cloze' });
      expect(t.questionOf(t.items[1])).toMatchObject({ source: 'ai', senseId: 's2' });
      expect(t.counters.built).toEqual([['cloze']]);
    });

    it('the AI slot asks the builder about the AI side only: cloze with clozeRole ai', async () => {
      const t = setup({ types: ['cloze'], clozeSource: 'own_then_ai', senseIds: ['s2'], aiSenseIds: ['s2'], aiPlanned: 1 });
      await t.service.next(learner, 'sess-1');
      expect(t.counters.availability).toHaveLength(1);
      expect(t.counters.availability[0]).toMatchObject({ chosenTypes: ['cloze'], clozeSource: 'own_then_ai', clozeRole: 'ai' });
    });

    it('prepare makes requests only for words the AI side offers: cloze with clozeRole ai', async () => {
      const t = setup({ types: ['type_word', 'cloze'], clozeSource: 'own_then_ai', senseIds: ['s1', 's2', 's3'], aiSenseIds: ['s2', 's3'],
        aiPlanned: 2, aiAvailable: (id) => (id === 's3' ? [] : ['cloze']) });
      expect(await t.service.prepare(learner, 'sess-1')).toEqual({ prepared: 1, already_ready: 0, failed: 0 });
      expect(t.requests.map((r) => r.senseId)).toEqual(['s2']);
      expect(t.counters.availability.length).toBeGreaterThan(0);
      for (const call of t.counters.availability) {
        expect(call).toMatchObject({ chosenTypes: ['cloze'], clozeSource: 'own_then_ai', clozeRole: 'ai' });
      }
    });

    it('the AI fails for a word: the fallback is built from the rule types, and the saved-sentence cloze is one of them', async () => {
      const t = setup({ types: ['type_word', 'cloze'], clozeSource: 'own_then_ai', senseIds: ['s1'], aiSenseIds: ['s1'], aiPlanned: 1,
        generate: () => failed('ai-failed') });
      expect(await t.service.next(learner, 'sess-1'))
        .toMatchObject({ state: 'question', item: { type: 'type_word' }, notice: 'ai-fallback', ai_reason: 'ai-failed' });
      expect(t.counters.built).toEqual([['type_word', 'cloze']]);
    });

    it('a word that is not marked is built from the rule types too, so a saved sentence can come up', async () => {
      const t = setup({ types: ['type_word', 'cloze'], clozeSource: 'own_then_ai', senseIds: ['s1'], aiSenseIds: [], aiPlanned: 0 });
      await t.service.next(learner, 'sess-1');
      expect(t.counters.built).toEqual([['type_word', 'cloze']]);
      expect(t.requests).toHaveLength(0);
    });

    it('known limit: cloze only and the AI fails for a word with no saved sentence → the word is skipped, no ai_unavailable screen', async () => {
      const t = setup({ types: ['cloze'], clozeSource: 'own_then_ai', senseIds: ['s1'], aiSenseIds: ['s1'], aiPlanned: 1, skipBuild: true,
        aiAvailable: () => ['cloze'], generate: () => failed('ai-failed') });
      const result = await t.service.next(learner, 'sess-1');
      expect(result.state).toBe('waiting_continue');
      expect(t.items).toHaveLength(0);
      expect(t.generator.run).toHaveBeenCalledTimes(1);
    });

    it('the AI is not asked once it has stopped for the session; the saved-sentence cloze still is', async () => {
      const t = setup({ types: ['cloze'], clozeSource: 'own_then_ai', senseIds: ['s1', 's2'], aiSenseIds: ['s2'], aiPlanned: 1, aiStopped: 'quota-exhausted' });
      expect(await t.service.next(learner, 'sess-1')).toMatchObject({ state: 'question', item: { type: 'cloze' } });
      expect(t.generator.run).not.toHaveBeenCalled();
      expect(t.counters.built).toEqual([['cloze']]);
    });
  });

  it('A3-4: own cloze stays after ai.practice is lost mid-session', async () => {
    const t = setup({ types: ['type_word', 'cloze'], clozeSource: 'own' });
    await t.service.next(learner, 'sess-1');
    t.answerLast();
    t.entitlements.check.mockImplementation(async (_u, feature) => ({ allowed: feature !== 'ai.practice' }));
    await t.service.next(learner, 'sess-1');
    expect(t.counters.built).toEqual([['type_word', 'cloze'], ['type_word', 'cloze']]);
    expect(t.generator.run).not.toHaveBeenCalled();
    expect(t.counters.confirm).toBe(0);
  });

  it('round ≥ 2 never exceeds ai_planned: an AI-only session with its budget spent finishes instead of asking AI', async () => {
    const t = setup({ types: ['cloze'], clozeSource: 'ai', senseIds: ['s1'], aiSenseIds: ['s1'], aiPlanned: 1, target: 3 });
    await t.service.next(learner, 'sess-1');
    t.answerLast();
    t.session.continued = true;
    const after = await t.service.next(learner, 'sess-1');
    expect(after.state).toBe('finished');
    expect(t.generator.run).toHaveBeenCalledTimes(1);
  });
});

describe('even placement in later rounds (practice ai count §5, 09/11/2026)', () => {
  const words = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'];
  const marked = ['s3', 's6', 's8'];

  /**
   * Fixed mode, target 20 on 8 words, continued, ai_planned 8. Round 1 is done with its 3 AI items; round 2 items follow, the first
   * `aiPlaced − 3` of them AI. Every item is answered.
   */
  function later(state: { answered: number; aiPlaced: number; aiPlacement?: string | null; settingsPlacement?: 'even' | 'random' | 'learner' }) {
    const t = setup({
      types: ['type_word', 'cloze'], clozeSource: 'ai', senseIds: words, aiSenseIds: marked, aiPlanned: 8, target: 20,
      aiPlacement: state.aiPlacement === undefined ? 'even' : state.aiPlacement,
      practice: state.settingsPlacement ? { aiPlacement: state.settingsPlacement } : undefined,
    });
    t.session.continued = true;
    let laterAi = state.aiPlaced - marked.length;
    for (let n = 0; n < state.answered; n++) {
      const senseId = words[n % words.length];
      const round = n < words.length ? 1 : 2;
      const ai = round === 1 ? marked.includes(senseId) : laterAi-- > 0;
      const q = t.question({ senseId, type: ai ? 'cloze' : 'type_word', source: ai ? 'ai' : 'rule' });
      t.items.push({
        id: randomUUID(), sessionId: 'sess-1', userId: learner.userId, questionId: q.id, senseId, round, position: n + 1, askedAt: now,
        answeredAt: now, answerRaw: 'x', answerNormalized: 'x', answersTried: [], tries: 1, skipped: false, result: 'correct', hintLevel: 0,
        localDate: null, reviewAction: null, maxRetries: null, alternative: null, alternativeSenseId: null,
        alternativeReviewAction: null, sessionWordTries: 0,
      } as unknown as PracticeSessionItem);
    }
    return t;
  }

  /** Whether the next question is an AI one, with Math.random pinned so the old r ÷ q chance would answer the other way. */
  async function nextIsAi(t: ReturnType<typeof later>, random: number): Promise<boolean> {
    const spy = vi.spyOn(Math, 'random').mockReturnValue(random);
    try {
      const result = await t.service.next(learner, 'sess-1');
      if (result.state !== 'question') throw new Error(`expected a question, got ${result.state}`);
      return result.item.ai;
    } finally {
      spy.mockRestore();
    }
  }

  it('even: the 9th question (answered 8, budget 5) is an AI question', async () => {
    // r ÷ q = 5 ÷ 12 ≈ 0.42; random 0.99 would say no.
    expect(await nextIsAi(later({ answered: 8, aiPlaced: 3 }), 0.99)).toBe(true);
  });

  it('even: answered 9 with 4 AI placed (budget 4) → the 10th question is not AI', async () => {
    // r ÷ q = 4 ÷ 11; random 0 would say yes.
    expect(await nextIsAi(later({ answered: 9, aiPlaced: 4 }), 0)).toBe(false);
  });

  it('even: answered 16, budget 4 → the 17th question is AI', async () => {
    expect(await nextIsAi(later({ answered: 16, aiPlaced: 4 }), 0.99)).toBe(true);
  });

  it('review focus 5: settings changed to random after start: the session still follows its stored even placement', async () => {
    expect(await nextIsAi(later({ answered: 8, aiPlaced: 3, settingsPlacement: 'random' }), 0.99)).toBe(true);
  });

  it('legacy session (aiPlacement null) keeps the r ÷ q chance', async () => {
    // answered 12, 4 AI placed: r ÷ q = 4 ÷ 8 = 0.5; random 0.99 → not AI.
    expect(await nextIsAi(later({ answered: 12, aiPlaced: 4, aiPlacement: null }), 0.99)).toBe(false);
  });
});

describe('current with AI slots (design §6.8)', () => {
  it('B7E65: a slot still generating → item null, preparing true; the generator is never called', async () => {
    const t = setup({ types: ['cloze'], clozeSource: 'ai', senseIds: ['s1'], aiSenseIds: ['s1'], aiPlanned: 1 });
    const request = { id: randomUUID(), userId: learner.userId, sessionId: 'sess-1', senseId: 's1', type: 'cloze', round: 1,
      state: 'generating', failure: null, aiInput: null, questionId: null, createdAt: now,
      updatedAt: new Date(now.getTime() - 600_000) } as PracticeAiRequest;
    t.requests.push(request);
    t.session.pendingAiRequestId = request.id;
    expect(await t.service.current(learner)).toMatchObject({ item: null, preparing: true });
    expect(t.generator.run).not.toHaveBeenCalled();
  });

  it('B7E64, B7E65: a pending notice with the next word AI → preparing true, the notice kept, no request made, no pointer set', async () => {
    const t = setup({ types: ['cloze'], clozeSource: 'ai', senseIds: ['s1'], aiSenseIds: ['s1'], aiPlanned: 1 });
    t.session.pendingNotice = 'word-not-found';
    expect(await t.service.current(learner)).toEqual({
      session: expect.anything(), item: null, notice: 'word-not-found', preparing: true,
    });
    expect(t.requests).toHaveLength(0);
    expect(t.session.pendingAiRequestId).toBeNull();
    expect(t.generator.run).not.toHaveBeenCalled();
  });

  it('a ready slot is attached by current (G) and returned', async () => {
    const t = setup({ types: ['cloze'], clozeSource: 'ai', senseIds: ['s1'], aiSenseIds: ['s1'], aiPlanned: 1 });
    const q = t.question({ senseId: 's1', type: 'cloze', source: 'ai', aiCharged: true });
    const request = { id: randomUUID(), userId: learner.userId, sessionId: 'sess-1', senseId: 's1', type: 'cloze', round: 1,
      state: 'ready', failure: null, aiInput: null, questionId: q.id, createdAt: now, updatedAt: now } as PracticeAiRequest;
    t.requests.push(request);
    t.session.pendingAiRequestId = request.id;
    const result = await t.service.current(learner);
    expect(result).toMatchObject({ preparing: false, item: { type: 'cloze' } });
    expect(t.items[0].questionId).toBe(q.id);
    expect(t.session.pendingAiRequestId).toBeNull();
  });
});

describe('prepare (design §6.4)', () => {
  const marked = { types: ['type_word', 'cloze'] as QuestionType[], clozeSource: 'ai' as const, senseIds: ['s1', 's2', 's3', 's4'],
    aiSenseIds: ['s2', 's3', 's4'] };

  it('K = 2 → requests for the next two marked words, run now; the pending pointer is never set', async () => {
    const t = setup({ ...marked, aiPlanned: 3 });
    expect(await t.service.prepare(learner, 'sess-1')).toEqual({ prepared: 2, already_ready: 0, failed: 0 });
    expect(t.requests.map((r) => r.senseId)).toEqual(['s2', 's3']);
    expect(t.session.pendingAiRequestId).toBeNull();
    // next uses the question made ahead for s2 without another run (s1 is a rule question first).
    await t.service.next(learner, 'sess-1');
    t.answerLast();
    await t.service.next(learner, 'sess-1');
    expect(t.generator.run).toHaveBeenCalledTimes(2);
    expect(t.questionOf(t.items[1])).toMatchObject({ source: 'ai', senseId: 's2' });
  });

  it('budget 1 → one request; ai_stopped → none; K = 0 → none', async () => {
    const one = setup({ ...marked, aiPlanned: 1 });
    expect((await one.service.prepare(learner, 'sess-1')).prepared).toBe(1);
    const stopped = setup({ ...marked, aiPlanned: 3, aiStopped: 'ai-unavailable' });
    expect(await stopped.service.prepare(learner, 'sess-1')).toEqual({ prepared: 0, already_ready: 0, failed: 0 });
    const off = setup({ ...marked, aiPlanned: 3, prefetch: 0 });
    expect(await off.service.prepare(learner, 'sess-1')).toEqual({ prepared: 0, already_ready: 0, failed: 0 });
    expect(stopped.requests).toHaveLength(0);
    expect(off.requests).toHaveLength(0);
  });

  it('B7E17: two prepare calls at once → one request per word; the second counts them as already ready', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const t = setup({ ...marked, aiPlanned: 3, generate: async () => { await gate; return { state: 'ready', questionId: '' }; } });
    const a = t.service.prepare(learner, 'sess-1');
    const b = t.service.prepare(learner, 'sess-1');
    release();
    const [first, second] = await Promise.all([a, b]);
    expect(first).toEqual({ prepared: 2, already_ready: 0, failed: 0 });
    expect(second).toEqual({ prepared: 0, already_ready: 2, failed: 0 });
    expect(t.requests).toHaveLength(2);
  });

  it('a failed generation is counted; next then falls back at once for that word (B7E113)', async () => {
    const t = setup({ ...marked, aiPlanned: 3, prefetch: 1, generate: () => failed('ai-failed') });
    expect(await t.service.prepare(learner, 'sess-1')).toEqual({ prepared: 0, already_ready: 0, failed: 1 });
    await t.service.next(learner, 'sess-1');
    t.answerLast();
    expect(await t.service.next(learner, 'sess-1')).toMatchObject({ state: 'question', item: { type: 'type_word' } });
    expect(t.generator.run).toHaveBeenCalledTimes(1);
  });
});

describe('AI failures as the app sees them (design §6.5 A, §6.6 rows 1 and 4)', () => {
  // A private word checked as not recognized no longer takes an AI type (availability), as in the real builder.
  const setupFailing = (types: QuestionType[], failure: AiFailure) => {
    let rejected = false;
    return setup({
      types, clozeSource: 'ai', senseIds: ['s1'], aiSenseIds: ['s1'], aiPlanned: 1, prefetch: 1,
      aiAvailable: () => (rejected ? [] : ['cloze']),
      generate: () => {
        rejected = failure === 'word-not-recognized';
        return failed(failure);
      },
    });
  };
  const mixed: QuestionType[] = ['type_word', 'cloze'];
  const aiOnly: QuestionType[] = ['cloze'];

  it('mixed × failed in prepare × AI error → rule type for the word, ai-fallback with ai-failed, shown once', async () => {
    const t = setupFailing(mixed, 'rejected');
    expect((await t.service.prepare(learner, 'sess-1')).failed).toBe(1);
    expect(await t.service.next(learner, 'sess-1'))
      .toMatchObject({ state: 'question', item: { type: 'type_word' }, notice: 'ai-fallback', ai_reason: 'ai-failed' });
    expect(t.session.aiNoticeShown).toBe(true);
    expect(t.generator.run).toHaveBeenCalledTimes(1);
  });

  it('mixed × failed in prepare × word not recognized → rule type with word-not-recognized and the sense id', async () => {
    const t = setupFailing(mixed, 'word-not-recognized');
    await t.service.prepare(learner, 'sess-1');
    expect(await t.service.next(learner, 'sess-1'))
      .toMatchObject({ state: 'question', item: { type: 'type_word' }, notice: 'word-not-recognized', sense_id: 's1' });
  });

  it('AI-only × failed in prepare × AI error → ai_unavailable, reason ai-failed, no new call', async () => {
    const t = setupFailing(aiOnly, 'input-mismatch');
    await t.service.prepare(learner, 'sess-1');
    expect(await t.service.next(learner, 'sess-1')).toMatchObject({ state: 'ai_unavailable', reason: 'ai-failed' });
    expect(t.generator.run).toHaveBeenCalledTimes(1);
  });

  it('AI-only × failed in prepare × word not recognized → ai_unavailable ai-failed with word-not-recognized and the sense id', async () => {
    const t = setupFailing(aiOnly, 'word-not-recognized');
    await t.service.prepare(learner, 'sess-1');
    expect(await t.service.next(learner, 'sess-1'))
      .toMatchObject({ state: 'ai_unavailable', reason: 'ai-failed', notice: 'word-not-recognized', sense_id: 's1', lemma: 'w-s1' });
  });

  it('AI-only × failed in next × rejected twice → ai_unavailable, reason ai-failed', async () => {
    const t = setupFailing(aiOnly, 'rejected');
    expect(await t.service.next(learner, 'sess-1')).toMatchObject({ state: 'ai_unavailable', reason: 'ai-failed' });
  });

  it('AI-only × failed in next × word not recognized → ai_unavailable ai-failed with word-not-recognized and the sense id', async () => {
    const t = setupFailing(aiOnly, 'word-not-recognized');
    expect(await t.service.next(learner, 'sess-1'))
      .toMatchObject({ state: 'ai_unavailable', reason: 'ai-failed', notice: 'word-not-recognized', sense_id: 's1', lemma: 'w-s1' });
  });

  it('mixed × failed in next × word not recognized → rule type with word-not-recognized (B7E98)', async () => {
    const t = setupFailing(mixed, 'word-not-recognized');
    expect(await t.service.next(learner, 'sess-1'))
      .toMatchObject({ state: 'question', item: { type: 'type_word' }, notice: 'word-not-recognized', sense_id: 's1' });
  });

  it('a public reason is kept as is: quota-exhausted in an AI-only session', async () => {
    const t = setupFailing(aiOnly, 'quota-exhausted');
    expect(await t.service.next(learner, 'sess-1')).toMatchObject({ state: 'ai_unavailable', reason: 'quota-exhausted' });
  });
});
