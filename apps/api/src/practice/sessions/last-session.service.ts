import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { dateString } from '../../common/time/local-date.js';
import type { PrismaClient } from '../../generated/prisma/client.js';

export type LastSessionView = {
  id: string;
  group_id: string | null;
  local_date: string;
  last_answer_at: string;
  finished: boolean;
  questions: number;
  correct: number;
  wrong_count: number;
  wrong_lemmas: string[];
};

const WRONG_LEMMAS_MAX = 4;

/**
 * "Lần luyện gần nhất" on Hôm nay (design giao diện mới §10.5): the practice session with the newest graded answer. Counts are read
 * here with one query, not through `PracticeReviewsService.summary`, which locks the session (`reviewableSession`) for a read the
 * learner does not act on.
 */
@Injectable()
export class LastSessionService {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  async last(userId: string): Promise<LastSessionView | null> {
    const newest = await this.prisma.practiceSessionItem.findFirst({
      where: { userId, result: { in: ['correct', 'wrong'] }, session: { kind: 'practice' } },
      orderBy: [{ answeredAt: 'desc' }, { id: 'desc' }],
      select: { sessionId: true, localDate: true, answeredAt: true },
    });
    if (newest === null) return null;
    const [session, items] = await Promise.all([
      this.prisma.practiceSession.findUniqueOrThrow({
        where: { id: newest.sessionId },
        select: { id: true, groupId: true, status: true },
      }),
      this.prisma.$queryRaw<Array<{ result: 'correct' | 'wrong'; lemma: string | null }>>`
        SELECT i.result, q.answer_key->'reveal'->>'lemma' AS lemma
        FROM practice_session_items i JOIN practice_questions q ON q.id = i.question_id
        WHERE i.session_id = ${newest.sessionId}::uuid AND i.result IN ('correct', 'wrong')
        ORDER BY i.answered_at, i.id`,
    ]);
    const wrong = items.filter((i) => i.result === 'wrong');
    const wrongLemmas = [...new Set(wrong.map((i) => i.lemma).filter((l): l is string => l !== null))];
    return {
      id: session.id,
      group_id: session.groupId,
      local_date: dateString(newest.localDate!),
      last_answer_at: newest.answeredAt!.toISOString(),
      finished: session.status === 'finished',
      questions: items.length,
      correct: items.length - wrong.length,
      wrong_count: wrong.length,
      wrong_lemmas: wrongLemmas.slice(0, WRONG_LEMMAS_MAX),
    };
  }
}
