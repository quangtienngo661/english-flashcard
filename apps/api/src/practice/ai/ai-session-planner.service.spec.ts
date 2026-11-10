import { describe, expect, it, vi } from 'vitest';
import type { AiService } from '../../ai/index.js';
import type { ContentService, Learner, PracticeSense } from '../../content/index.js';
import type { EntitlementsService, EntitlementsSnapshot } from '../../entitlements/index.js';
import type { PracticeQuestion, PrismaClient } from '../../generated/prisma/client.js';
import type { QuestionType } from '../practice.types.js';
import { deploy } from '../testing/ai-senses.js';
import { contentKey } from './ai-inputs.js';
import { AiSessionPlanner } from './ai-session-planner.service.js';
import type { WordChecksRepository } from './word-checks.repository.js';

const learner: Learner = { userId: '00000000-0000-4000-8000-000000000001', nativeLanguage: 'vi' };
const RESETS_AT = '2026-11-01T00:00:00.000Z';

function snapshot(over: { allowed?: boolean; enabled?: boolean; capReached?: boolean; remaining?: number } = {}): EntitlementsSnapshot {
  return {
    features: { 'ai.practice': { allowed: over.allowed ?? true, reason: null }, 'ai.lookup': { allowed: true, reason: null } },
    ai_available: { enabled: over.enabled ?? true, cap_reached: over.capReached ?? false },
    pools: { ai_practice: { limit: 300, used: 0, remaining: over.remaining ?? 300, resets_at: RESETS_AT } },
  } as unknown as EntitlementsSnapshot;
}

function setup(options: {
  snap?: EntitlementsSnapshot | null; notReady?: string[]; senses?: PracticeSense[]; unseen?: string[];
  checks?: Map<string, { contentKey: string; verdict: 'ok' | 'not_recognized' }>;
} = {}) {
  const readiness: string[] = [];
  const ai = {
    isReady: vi.fn(async (op: string) => {
      readiness.push(op);
      return options.notReady?.includes(op) ? { ready: false, reason: 'model-not-set' } : { ready: true };
    }),
  } as unknown as AiService;
  const entitlements = { snapshot: vi.fn(async () => (options.snap === undefined ? snapshot() : options.snap)) };
  const senses = options.senses ?? [];
  const content = {
    practiceSenses: async (_u: string, ids: string[]) => new Map(senses.filter((s) => ids.includes(s.sense_id)).map((s) => [s.sense_id, s])),
    visibleSenseIds: async () => new Set<string>(),
  } as unknown as ContentService;
  const prisma = {
    practiceQuestion: {
      findMany: vi.fn(async ({ where }: { where: { senseId: string } }) =>
        (options.unseen ?? []).includes(where.senseId) ? [{ id: `q-${where.senseId}`, distractorSenseIds: [] } as unknown as PracticeQuestion] : []),
    },
  } as unknown as PrismaClient;
  const wordChecks = { get: async (_u: string, senseId: string) => options.checks?.get(senseId) ?? null } as unknown as WordChecksRepository;
  const planner = new AiSessionPlanner(prisma, ai, entitlements as unknown as EntitlementsService, content, wordChecks);
  return { planner, entitlements, readiness, prisma };
}

const words = (n: number) => Array.from({ length: n }, (_, i) => deploy({ sense_id: `s${i + 1}`, lemma: `w${i + 1}` }));
const availableAll = (ids: string[], types: QuestionType[]) => new Map(ids.map((id) => [id, types]));

describe('AiSessionPlanner.gate (design §6.1 step 2)', () => {
  it('no Bước 7 type → the snapshot is not read (Bước 4 unchanged)', async () => {
    const t = setup();
    expect(await t.planner.gate(learner.userId, ['type_word', 'mcq_definition'], null)).toBeNull();
    expect(t.entitlements.snapshot).not.toHaveBeenCalled();
  });

  it.each<[QuestionType[], 'ai' | 'own' | 'own_then_ai' | null]>([
    [['cloze'], 'ai'], [['type_word', 'mcq_sentence'], null], [['cloze'], 'own_then_ai'], [['type_word', 'cloze'], 'own_then_ai'],
  ])(
    'B7E1: Free (ai.practice not allowed) with %o (%s) → 403 entitlement-required', async (types, source) => {
      const t = setup({ snap: snapshot({ allowed: false }) });
      await expect(t.planner.gate(learner.userId, types, source)).rejects.toMatchObject({ status: 403, problemType: 'entitlement-required' });
    });

  it('A3-1: Free with typing + own cloze → null, the snapshot is not read', async () => {
    const t = setup({ snap: snapshot({ allowed: false }) });
    await expect(t.planner.gate(learner.userId, ['type_word', 'cloze'], 'own')).resolves.toBeNull();
    expect(t.entitlements.snapshot).not.toHaveBeenCalled();
    expect(t.readiness).toEqual([]);
  });

  it('B7E4: cloze from saved sentences only → no AI check, no readiness asked', async () => {
    const t = setup({ snap: snapshot({ enabled: false }) });
    await expect(t.planner.gate(learner.userId, ['cloze'], 'own')).resolves.toBeNull();
    expect(t.readiness).toEqual([]);
    expect(t.entitlements.snapshot).not.toHaveBeenCalled();
  });

  it('B7E5, B7E6: AI off or the system cap reached → 503 ai-unavailable without seconds', async () => {
    for (const snap of [snapshot({ enabled: false }), snapshot({ capReached: true })]) {
      const t = setup({ snap });
      await expect(t.planner.gate(learner.userId, ['cloze'], 'ai'))
        .rejects.toMatchObject({ status: 503, problemType: 'ai-unavailable', retryAfterSeconds: undefined });
    }
  });

  it('cloze with source own_then_ai is an AI cloze at the gate: AI off → 503, and generate_cloze is asked once', async () => {
    const off = setup({ snap: snapshot({ enabled: false }) });
    await expect(off.planner.gate(learner.userId, ['type_word', 'cloze'], 'own_then_ai'))
      .rejects.toMatchObject({ status: 503, problemType: 'ai-unavailable' });
    const t = setup();
    await expect(t.planner.gate(learner.userId, ['type_word', 'cloze'], 'own_then_ai')).resolves.toMatchObject({ pools: expect.anything() });
    expect(t.readiness).toEqual(['generate_cloze']);
  });

  it('B7E117: a chosen operation without a model → 503 ai-unavailable, reason model-not-set; each chosen op is asked', async () => {
    const t = setup({ notReady: ['generate_sentence_mcq'] });
    await expect(t.planner.gate(learner.userId, ['cloze', 'mcq_sentence', 'type_word'], 'ai'))
      .rejects.toMatchObject({ status: 503, problemType: 'ai-unavailable', extensions: { reason: 'model-not-set' } });
    expect(t.readiness).toEqual(['generate_cloze', 'generate_sentence_mcq']);
  });
});

describe('AiSessionPlanner.plan (design §6.1 steps 3–5)', () => {
  const types: QuestionType[] = ['type_word', 'cloze'];

  it('B7E45: typing + AI cloze, 10 words → ai_planned 5, words 2, 4, 6, 8, 10 marked', async () => {
    const senses = words(10);
    const ids = senses.map((s) => s.sense_id);
    const t = setup({ senses });
    expect(await t.planner.plan(learner, { types, clozeSource: 'ai', count: 10, kept: ids, available: availableAll(ids, types) }, snapshot()))
      .toEqual({ aiPlanned: 5, aiSenseIds: ['s2', 's4', 's6', 's8', 's10'] });
  });

  it('B7E46: 10 questions, 4 words → 4 marked, ai_planned 5', async () => {
    const senses = words(4);
    const ids = senses.map((s) => s.sense_id);
    const t = setup({ senses });
    expect(await t.planner.plan(learner, { types, clozeSource: 'ai', count: 10, kept: ids, available: availableAll(ids, types) }, snapshot()))
      .toEqual({ aiPlanned: 5, aiSenseIds: ids });
  });

  it('only words that can take an AI type are marked (R5: 2 of 10 → 2)', async () => {
    const senses = words(10);
    const ids = senses.map((s) => s.sense_id);
    const available = new Map(ids.map((id) => [id, ['s3', 's7'].includes(id) ? types : ['type_word'] as QuestionType[]]));
    const t = setup({ senses });
    expect(await t.planner.plan(learner, { types, clozeSource: 'ai', count: 10, kept: ids, available }, snapshot()))
      .toEqual({ aiPlanned: 2, aiSenseIds: ['s3', 's7'] });
  });

  it('B7E2: 3 units left, 5 needed → 403 ai-quota-insufficient with remaining, needed, resets_at', async () => {
    const senses = words(10);
    const ids = senses.map((s) => s.sense_id);
    const t = setup({ senses });
    await expect(t.planner.plan(learner, { types, clozeSource: 'ai', count: 10, kept: ids, available: availableAll(ids, types) },
      snapshot({ remaining: 3 }))).rejects.toMatchObject({
      status: 403, problemType: 'ai-quota-insufficient', extensions: { remaining: 3, needed: 5, resets_at: RESETS_AT },
    });
  });

  it('B7E3: 3 units left, 2 marked words have an unseen AI question → needed 3, opens', async () => {
    const senses = words(10);
    const ids = senses.map((s) => s.sense_id);
    const t = setup({ senses, unseen: ['s1', 's5'] });
    const plan = await t.planner.plan(learner, { types, clozeSource: 'ai', count: 10, kept: ids, available: availableAll(ids, types) },
      snapshot({ remaining: 3 }));
    expect(plan.aiPlanned).toBe(5);
    expect(plan.aiSenseIds.slice(0, 2)).toEqual(['s1', 's4']);
    expect(plan.aiSenseIds).toContain('s5');
  });

  it('B7E4: cloze from saved sentences only → 0 planned, nothing marked, no unit needed', async () => {
    const t = setup({ senses: words(3) });
    expect(await t.planner.plan(learner, { types, clozeSource: 'own', count: 3, kept: ['s1', 's2', 's3'],
      available: availableAll(['s1', 's2', 's3'], types) }, snapshot({ remaining: 0 }))).toEqual({ aiPlanned: 0, aiSenseIds: [] });
  });

  it('A3-3: Pro with own cloze + meaning_in_sentence → only meaning_in_sentence words are planned and need units', async () => {
    const types: QuestionType[] = ['cloze', 'meaning_in_sentence'];
    const senses = words(6);
    const ids = senses.map((s) => s.sense_id);
    const available = new Map(ids.map((id) => [id, ['s5', 's6'].includes(id) ? types : ['cloze'] as QuestionType[]]));
    const t = setup({ senses });
    const input = { types, clozeSource: 'own' as const, count: 6, kept: ids, available };
    expect(await t.planner.plan(learner, input, snapshot({ remaining: 2 })))
      .toEqual({ aiPlanned: 2, aiSenseIds: ['s5', 's6'] });
    expect(t.prisma.practiceQuestion.findMany).toHaveBeenCalledTimes(2);
    for (const senseId of ['s5', 's6']) {
      expect(t.prisma.practiceQuestion.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ senseId, type: { in: ['meaning_in_sentence'] } }),
      }));
    }
    await expect(t.planner.plan(learner, input, snapshot({ remaining: 1 }))).rejects.toMatchObject({
      status: 403, problemType: 'ai-quota-insufficient', extensions: { remaining: 1, needed: 2 },
    });
  });

  it('own_then_ai: only words whose AI-side availability has the cloze are marked; a saved-sentence word needs no unit', async () => {
    const senses = words(4);
    const ids = senses.map((s) => s.sense_id);
    // s1 and s3 have a saved sentence, so the AI side does not offer them the cloze (the session service asks with clozeRole 'ai').
    const available = new Map<string, QuestionType[]>([['s1', []], ['s2', ['cloze']], ['s3', []], ['s4', ['cloze']]]);
    const t = setup({ senses });
    const input = { types: ['cloze'] as QuestionType[], clozeSource: 'own_then_ai' as const, count: 4, kept: ids, available };
    expect(await t.planner.plan(learner, input, snapshot({ remaining: 2 }))).toEqual({ aiPlanned: 2, aiSenseIds: ['s2', 's4'] });
    await expect(t.planner.plan(learner, input, snapshot({ remaining: 1 }))).rejects.toMatchObject({
      status: 403, problemType: 'ai-quota-insufficient', extensions: { remaining: 1, needed: 2 },
    });
  });

  it('a marked private word not checked for its content needs check_private_word ready; a checked one does not', async () => {
    const priv = deploy({ sense_id: 's1', scope: 'private' });
    const t = setup({ senses: [priv], notReady: ['check_private_word'] });
    await expect(t.planner.plan(learner, { types: ['cloze'], clozeSource: 'ai', count: 1, kept: ['s1'],
      available: availableAll(['s1'], ['cloze']) }, snapshot())).rejects.toMatchObject({ status: 503, problemType: 'ai-unavailable' });
    const checks = new Map([['s1', { contentKey: contentKey(priv.lemma, priv.pos, priv.gloss_vi!), verdict: 'ok' as const }]]);
    const checked = setup({ senses: [priv], notReady: ['check_private_word'], checks });
    await expect(checked.planner.plan(learner, { types: ['cloze'], clozeSource: 'ai', count: 1, kept: ['s1'],
      available: availableAll(['s1'], ['cloze']) }, snapshot())).resolves.toEqual({ aiPlanned: 1, aiSenseIds: ['s1'] });
  });
});

describe("AiSessionPlanner.plan with the learner's ai count (practice ai count §4–§5, 09/11/2026)", () => {
  const types: QuestionType[] = ['type_word', 'cloze'];
  const ten = () => {
    const senses = words(10);
    return { senses, ids: senses.map((s) => s.sense_id) };
  };

  it('aiCount 3, count 10, 10 capable words, none unseen, even → aiPlanned 3, the 4th, 7th and 10th words marked', async () => {
    const { senses, ids } = ten();
    const t = setup({ senses });
    expect(await t.planner.plan(learner, { types, clozeSource: 'ai', count: 10, kept: ids, available: availableAll(ids, types),
      aiCount: 3, placement: 'even' }, snapshot())).toEqual({ aiPlanned: 3, aiSenseIds: ['s4', 's7', 's10'] });
  });

  it('aiCount 3, random with random () => 0 → the first three capable words marked', async () => {
    const { senses, ids } = ten();
    const t = setup({ senses });
    expect(await t.planner.plan(learner, { types, clozeSource: 'ai', count: 10, kept: ids, available: availableAll(ids, types),
      aiCount: 3, placement: 'random', random: () => 0 }, snapshot())).toEqual({ aiPlanned: 3, aiSenseIds: ['s1', 's2', 's3'] });
  });

  it('aiCount 5, count 3, only 3 capable words: remaining 2 → 403 needed 3; remaining 3 → aiPlanned 3', async () => {
    const senses = words(3);
    const ids = senses.map((s) => s.sense_id);
    const t = setup({ senses });
    const input = { types, clozeSource: 'ai' as const, count: 3, kept: ids, available: availableAll(ids, types), aiCount: 5, placement: 'even' as const };
    await expect(t.planner.plan(learner, input, snapshot({ remaining: 2 }))).rejects.toMatchObject({
      status: 403, problemType: 'ai-quota-insufficient', extensions: { remaining: 2, needed: 3 },
    });
    expect(await t.planner.plan(learner, input, snapshot({ remaining: 3 }))).toEqual({ aiPlanned: 3, aiSenseIds: ids });
  });

  it('aiCount 4, count 10, 10 capable, words 1 and 2 have an unseen question, even, remaining 1 → 403 ai-quota-insufficient with remaining 1, needed 2', async () => {
    const { senses, ids } = ten();
    const t = setup({ senses, unseen: ['s1', 's2'] });
    await expect(t.planner.plan(learner, { types, clozeSource: 'ai', count: 10, kept: ids, available: availableAll(ids, types),
      aiCount: 4, placement: 'even' }, snapshot({ remaining: 1 }))).rejects.toMatchObject({
      status: 403, problemType: 'ai-quota-insufficient', extensions: { remaining: 1, needed: 2, resets_at: RESETS_AT },
    });
    expect(await t.planner.plan(learner, { types, clozeSource: 'ai', count: 10, kept: ids, available: availableAll(ids, types),
      aiCount: 4, placement: 'even' }, snapshot({ remaining: 2 }))).toEqual({ aiPlanned: 4, aiSenseIds: ['s1', 's2', 's6', 's10'] });
  });

  it('count 20 on 8 kept words, aiCount 8, even → 3 words marked, aiPlanned 8', async () => {
    const senses = words(8);
    const ids = senses.map((s) => s.sense_id);
    const t = setup({ senses });
    const plan = await t.planner.plan(learner, { types, clozeSource: 'ai', count: 20, kept: ids, available: availableAll(ids, types),
      aiCount: 8, placement: 'even' }, snapshot());
    expect(plan).toEqual({ aiPlanned: 8, aiSenseIds: ['s3', 's6', 's8'] });
  });

  it('final review I1: own_then_ai, 4 words of which 1 is AI-capable, count 10, aiCount 5 → aiPlanned 3; 3 units open the session', async () => {
    const senses = words(4);
    const ids = senses.map((s) => s.sense_id);
    const t = setup({ senses });
    const available = new Map<string, QuestionType[]>(ids.map((id) => [id, id === 's4' ? ['cloze'] : []]));
    expect(await t.planner.plan(learner, { types: ['cloze'], clozeSource: 'own_then_ai', count: 10, kept: ids, available,
      aiCount: 5, placement: 'even' }, snapshot({ remaining: 3 }))).toEqual({ aiPlanned: 3, aiSenseIds: ['s4'] });
  });

  it('aiCount 0 → aiPlanned 0 and no unseen-question lookup', async () => {
    const { senses, ids } = ten();
    const t = setup({ senses });
    expect(await t.planner.plan(learner, { types, clozeSource: 'ai', count: 10, kept: ids, available: availableAll(ids, types),
      aiCount: 0, placement: 'even' }, snapshot({ remaining: 0 }))).toEqual({ aiPlanned: 0, aiSenseIds: [] });
    expect(t.prisma.practiceQuestion.findMany).not.toHaveBeenCalled();
  });

  it('own_then_ai: no word is AI-capable on the AI side (all have saved sentences), aiCount 3 → aiPlanned 0', async () => {
    const senses = words(3);
    const ids = senses.map((s) => s.sense_id);
    const t = setup({ senses });
    const available = new Map<string, QuestionType[]>(ids.map((id) => [id, []]));
    expect(await t.planner.plan(learner, { types: ['cloze'], clozeSource: 'own_then_ai', count: 3, kept: ids, available,
      aiCount: 3, placement: 'even' }, snapshot({ remaining: 0 }))).toEqual({ aiPlanned: 0, aiSenseIds: [] });
  });

  it('aiCount undefined keeps the old split: count 10, 4 types of which 2 AI → aiPlanned 5', async () => {
    const { senses, ids } = ten();
    const four: QuestionType[] = ['type_word', 'mcq_definition', 'cloze', 'mcq_sentence'];
    const t = setup({ senses });
    expect(await t.planner.plan(learner, { types: four, clozeSource: 'ai', count: 10, kept: ids, available: availableAll(ids, four) }, snapshot()))
      .toEqual({ aiPlanned: 5, aiSenseIds: ['s2', 's4', 's6', 's8', 's10'] });
  });
});
