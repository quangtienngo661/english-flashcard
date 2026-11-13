import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { LastSessionService } from './last-session.service.js';
import { SessionsController } from './sessions.controller.js';

type Item = { result: 'correct' | 'wrong'; lemma: string };

/** `newest` is the last graded item (null: none); `items` the session's graded items in answer order. */
function build(newest: Record<string, unknown> | null, session: Record<string, unknown>, items: Item[]) {
  const prisma = {
    practiceSessionItem: { findFirst: vi.fn(async () => newest) },
    practiceSession: { findUniqueOrThrow: vi.fn(async () => session) },
    $queryRaw: vi.fn(async () => items.map((i) => ({ result: i.result, lemma: i.lemma }))),
  } as unknown as PrismaClient & { practiceSessionItem: { findFirst: ReturnType<typeof vi.fn> } };
  return { service: new LastSessionService(prisma), prisma };
}

const newest = {
  sessionId: 'p1',
  localDate: new Date('2026-11-08T00:00:00Z'),
  answeredAt: new Date('2026-11-08T03:04:05Z'),
};

describe('LastSessionService.last (giao diện mới §10.5)', () => {
  it('no graded item → null; the newest graded practice item is looked up by answered_at, id', async () => {
    const { service, prisma } = build(null, {}, []);
    expect(await service.last('u1')).toBeNull();
    expect(prisma.practiceSessionItem.findFirst).toHaveBeenCalledExactlyOnceWith({
      where: { userId: 'u1', result: { in: ['correct', 'wrong'] }, session: { kind: 'practice' } },
      orderBy: [{ answeredAt: 'desc' }, { id: 'desc' }],
      select: { sessionId: true, localDate: true, answeredAt: true },
    });
  });

  it('2 correct and 3 wrong with wrong lemmas a, b, a → wrong_count 3, wrong_lemmas [a, b]', async () => {
    const items: Item[] = [
      { result: 'correct', lemma: 'x' },
      { result: 'wrong', lemma: 'a' },
      { result: 'wrong', lemma: 'b' },
      { result: 'correct', lemma: 'y' },
      { result: 'wrong', lemma: 'a' },
    ];
    const { service } = build(newest, { id: 'p1', groupId: 'g1', status: 'finished' }, items);
    expect(await service.last('u1')).toEqual({
      id: 'p1',
      group_id: 'g1',
      local_date: '2026-11-08',
      last_answer_at: '2026-11-08T03:04:05.000Z',
      finished: true,
      questions: 5,
      correct: 2,
      wrong_count: 3,
      wrong_lemmas: ['a', 'b'],
    });
  });

  it('five distinct wrong lemmas → the first four; abandoned → not finished; no group → null', async () => {
    const items: Item[] = ['a', 'b', 'c', 'd', 'e'].map((lemma) => ({ result: 'wrong', lemma }));
    const { service } = build(newest, { id: 'p1', groupId: null, status: 'abandoned' }, items);
    const view = await service.last('u1');
    expect(view).toMatchObject({ group_id: null, finished: false, wrong_count: 5, wrong_lemmas: ['a', 'b', 'c', 'd'] });
  });
});

describe('GET /v1/practice/sessions/last', () => {
  it('sets 204 and returns nothing when there is no session', async () => {
    const last = vi.fn(async () => null);
    const controller = new SessionsController({} as never, { last } as never);
    const res = { status: vi.fn() };
    const out = await controller.last({ userId: 'u1', nativeLanguage: 'vi' }, res as never);
    expect(out).toBeUndefined();
    expect(res.status).toHaveBeenCalledExactlyOnceWith(204);
    expect(last).toHaveBeenCalledExactlyOnceWith('u1');
  });
});
