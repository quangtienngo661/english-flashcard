import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AiRequestsRepository } from '../../../src/practice/ai/ai-requests.repository.js';
import { seedPracticeSense } from '../../support/seed-practice.js';
import { createIntegrationPrisma, type IntegrationPrisma } from '../support/integration-prisma.js';

describe('AiRequestsRepository.writeQuestion with deleting user (SEC-02, A1.3)', () => {
  let db: IntegrationPrisma;
  let repo: AiRequestsRepository;

  beforeAll(async () => {
    db = await createIntegrationPrisma();
    repo = new AiRequestsRepository(db.prisma);
  });

  afterAll(async () => {
    await db?.close();
  });

  async function seedGeneratingRequest(status: 'active' | 'deleting', suffix: string) {
    const now = new Date('2026-11-23T10:00:00Z');
    const user = await db.prisma.user.create({
      data: {
        email: `learner-a13-${suffix}@example.test`,
        timezone: 'Asia/Ho_Chi_Minh',
        status,
        ...(status === 'deleting' ? { deletingSince: now, deletingBy: 'self' } : {}),
      },
      select: { id: true },
    });
    const { senseId } = await seedPracticeSense(db.prisma, {
      lemma: `worda13${suffix}`,
      glossVi: 'nghia thu',
      definitionEn: 'test sense',
      examples: ['A simple example sentence.'],
    });
    const session = await db.prisma.practiceSession.create({
      data: {
        userId: user.id,
        source: 'all',
        sort: 'overdue_first',
        types: ['cloze'],
        promptStyle: 'sentence',
        targetCount: 1,
        senseIds: [senseId],
        status: 'active',
        startedAt: now,
        lastActivityAt: now,
        clozeSource: 'ai',
        aiPlanned: 1,
        aiSenseIds: [senseId],
      },
      select: { id: true },
    });
    const request = await db.prisma.practiceAiRequest.create({
      data: {
        userId: user.id,
        sessionId: session.id,
        senseId,
        type: 'cloze',
        round: 1,
        state: 'generating',
      },
      select: { id: true },
    });
    const sense = await db.prisma.sense.findUniqueOrThrow({
      where: { id: senseId },
      select: { liveRevisionId: true },
    });
    return {
      userId: user.id,
      senseId,
      senseRevisionId: sense.liveRevisionId!,
      requestId: request.id,
      now,
    };
  }

  function questionData(seed: { userId: string; senseId: string; senseRevisionId: string; now: Date }) {
    return {
      built: {
        type: 'cloze' as const,
        promptStyle: 'sentence' as const,
        blank: { text: 'word', base: true },
        prompt: { kind: 'cloze' as const, sentence: 'Fill in the ____.' },
        answerKey: {
          kind: 'type_word' as const,
          main: 'word',
          accepted: ['word'],
          reveal: { lemma: 'word', meaning: 'nghia thu', definition_en: 'test sense' },
          asked_private: false,
        },
        hints: { level1: null, level2: null },
        distractorSenseIds: [],
      },
      userId: seed.userId,
      senseId: seed.senseId,
      senseRevisionId: seed.senseRevisionId,
      contentKey: null,
      aiMeta: { call_operation_id: randomUUID() },
      createdAt: seed.now,
    };
  }

  it('control: writes the question when the user is active', async () => {
    const seed = await seedGeneratingRequest('active', 'active');
    const result = await repo.writeQuestion(seed.requestId, questionData(seed));

    expect(result).toEqual({ questionId: expect.any(String) });
    const count = await db.prisma.practiceQuestion.count({ where: { userId: seed.userId } });
    expect(count).toBe(1);
  });

  it('skips writing the question and returns null when the user is deleting', async () => {
    const seed = await seedGeneratingRequest('deleting', 'deleting');
    const result = await repo.writeQuestion(seed.requestId, questionData(seed));

    expect(result).toBeNull();
    const count = await db.prisma.practiceQuestion.count({ where: { userId: seed.userId } });
    expect(count).toBe(0);
  });
});
