import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../../common/clock/clock.js';
import type { ContentService, Learner } from '../../content/index.js';
import type { EntitlementsService } from '../../entitlements/index.js';
import type { PracticeAiRequest, PracticeQuestion, PracticeSession, PracticeSessionItem, PrismaClient } from '../../generated/prisma/client.js';
import type { LearningService, PracticeItem } from '../../learning/index.js';
import { SETTINGS_DEFAULTS, type SettingsService } from '../../settings/index.js';
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
  types: QuestionType[]; senseIds?: string[]; aiSenseIds?: string[]; aiPlanned?: number; clozeSource?: 'ai' | 'own' | null;
  aiStopped?: string | null; target?: number;
  /** What the generator does with a request. */
  generate?: (request: PracticeAiRequest) => GenerateOutcome | 'ready-free' | Promise<GenerateOutcome | 'ready-free'>;
  aiAvailable?: (senseId: string) => QuestionType[]; ownClozeAllowed?: boolean;
};

function setup(options: Options) {
  const senseIds = options.senseIds ?? ['s1', 's2'];
  const session: PracticeSession = {
    id: 'sess-1', userId: learner.userId, source: 'all', groupId: null, groupFilter: null, sort: 'queue', types: options.types,
    promptStyle: 'meaning', targetCount: options.target ?? senseIds.length, senseIds, status: 'active', continued: null,
    pendingNotice: null, startedAt: now, lastActivityAt: now, endedAt: null, clozeSource: options.clozeSource ?? null,
    aiPlanned: options.aiPlanned ?? 0, aiSenseIds: options.aiSenseIds ?? [], pendingAiRequestId: null,
    aiStopped: options.aiStopped ?? null, aiNoticeShown: false,
  };
  const questions: PracticeQuestion[] = [];
  const items: PracticeSessionItem[] = [];
  const requests: PracticeAiRequest[] = [];
  const counters = { generate: 0, confirm: 0, charged: 0, built: [] as QuestionType[][] };

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
    availability: async ({ senseIds: ids }: { senseIds: string[] }) =>
      new Map(ids.map((id) => [id, options.aiAvailable ? options.aiAvailable(id) : (['cloze', 'mcq_sentence'] as QuestionType[])])),
    build: async ({ chosenTypes }: { chosenTypes: QuestionType[] }) => {
      counters.built.push(chosenTypes);
      return {
        type: chosenTypes[0], promptStyle: 'meaning', prompt: { kind: 'type_meaning' }, answerKey: { asked_private: false },
        hints: { level1: null, level2: null }, blank: null, distractorSenseIds: [],
      };
    },
  };
  const entitlements = {
    check: async (_u: string, feature: string) => ({ allowed: feature !== 'ai.practice' || options.ownClozeAllowed !== false }),
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
  const service = new SessionsService(prisma, new FakeClock(now), { get: async () => SETTINGS_DEFAULTS } as unknown as SettingsService,
    entitlements as unknown as EntitlementsService, learning as unknown as LearningService, builder as unknown as QuestionBuilder,
    {} as PracticeStats, {} as AiSessionPlanner, generator as unknown as AiQuestionGenerator, aiRequests,
    content as unknown as ContentService);
  const answerLast = () => { items.at(-1)!.result = 'correct'; };
  const questionOf = (item: PracticeSessionItem) => questions.find((q) => q.id === item.questionId)!;
  return { service, session, items, requests, questions, counters, generator, answerLast, questionOf, question };
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
    expect(first).toMatchObject({ state: 'question', item: { type: 'type_word' }, notice: 'ai-fallback', ai_reason: 'rejected' });
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
      .toMatchObject({ state: 'question', notice: 'word-not-recognized', sense_id: 's1', item: { type: 'type_word' } });
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

  it('B7E123: cloze from saved sentences is left out when ai.practice is no longer allowed', async () => {
    const t = setup({ types: ['type_word', 'cloze'], clozeSource: 'own', senseIds: ['s1'], ownClozeAllowed: false });
    await t.service.next(learner, 'sess-1');
    expect(t.counters.built).toEqual([['type_word']]);
    const allowed = setup({ types: ['type_word', 'cloze'], clozeSource: 'own', senseIds: ['s1'] });
    await allowed.service.next(learner, 'sess-1');
    expect(allowed.counters.built).toEqual([['type_word', 'cloze']]);
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
