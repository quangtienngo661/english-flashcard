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
      findMany: async ({ where }: { where: { senseId: string } }) =>
        (options.unseen ?? []).includes(where.senseId) ? [{ id: `q-${where.senseId}`, distractorSenseIds: [] } as unknown as PracticeQuestion] : [],
    },
  } as unknown as PrismaClient;
  const wordChecks = { get: async (_u: string, senseId: string) => options.checks?.get(senseId) ?? null } as unknown as WordChecksRepository;
  const planner = new AiSessionPlanner(prisma, ai, entitlements as unknown as EntitlementsService, content, wordChecks);
  return { planner, entitlements, readiness };
}

const words = (n: number) => Array.from({ length: n }, (_, i) => deploy({ sense_id: `s${i + 1}`, lemma: `w${i + 1}` }));
const availableAll = (ids: string[], types: QuestionType[]) => new Map(ids.map((id) => [id, types]));

describe('AiSessionPlanner.gate (design §6.1 step 2)', () => {
  it('no Bước 7 type → the snapshot is not read (Bước 4 unchanged)', async () => {
    const t = setup();
    expect(await t.planner.gate(learner.userId, ['type_word', 'mcq_definition'], null)).toBeNull();
    expect(t.entitlements.snapshot).not.toHaveBeenCalled();
  });

  it.each<[QuestionType[], 'ai' | 'own' | null]>([[['cloze'], 'own'], [['cloze'], 'ai'], [['type_word', 'mcq_sentence'], null]])(
    'B7E1: Free (ai.practice not allowed) with %o (%s) → 403 entitlement-required', async (types, source) => {
      const t = setup({ snap: snapshot({ allowed: false }) });
      await expect(t.planner.gate(learner.userId, types, source)).rejects.toMatchObject({ status: 403, problemType: 'entitlement-required' });
    });

  it('B7E4: cloze from saved sentences only → no AI check, no readiness asked', async () => {
    const t = setup({ snap: snapshot({ enabled: false }) });
    await expect(t.planner.gate(learner.userId, ['type_word', 'cloze'], 'own')).resolves.not.toBeNull();
    expect(t.readiness).toEqual([]);
  });

  it('B7E5, B7E6: AI off or the system cap reached → 503 ai-unavailable without seconds', async () => {
    for (const snap of [snapshot({ enabled: false }), snapshot({ capReached: true })]) {
      const t = setup({ snap });
      await expect(t.planner.gate(learner.userId, ['cloze'], 'ai'))
        .rejects.toMatchObject({ status: 503, problemType: 'ai-unavailable', retryAfterSeconds: undefined });
    }
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
