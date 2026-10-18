import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import { LearningService, type PracticeItem } from '../../learning/index.js';
import { WEAK_MIN_WRONG, WEAK_WINDOW } from '../practice.constants.js';

export type SenseStats = { wrong: number; counted: number; last_wrong_at: string | null; last_practiced_at: string | null };

type StatsRow = { sense_id: string; wrong: number; counted: number; last_wrong_at: Date | null; last_practiced_at: Date };

/**
 * Practice numbers per sense, in one statement: the weak-word rule of weak-words.ts (`countedAttempts` + `weakness`) in SQL,
 * over the newest WEAK_WINDOW counted attempts; `last_practiced_at` = newest final result. Feeds the weak source, the
 * most_wrong and least_practiced sorts and GET /weak-words.
 */
@Injectable()
export class PracticeStats {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(LearningService) private readonly learning: LearningService,
  ) {}

  async statsFor(userId: string, senseIds?: string[]): Promise<Map<string, SenseStats>> {
    const only = senseIds === undefined ? Prisma.empty : Prisma.sql`AND i.sense_id = ANY(${senseIds}::uuid[])`;
    const rows = await this.prisma.$queryRaw<StatsRow[]>`
      WITH final AS (
        SELECT i.id, i.sense_id, i.result, i.answered_at, i.hint_level, r.status AS report
        FROM practice_session_items i
        LEFT JOIN practice_reports r ON r.item_id = i.id
        WHERE i.user_id = ${userId}::uuid AND i.result IN ('correct', 'wrong') ${only}
      ), counted AS (
        SELECT sense_id, result, answered_at,
          row_number() OVER (PARTITION BY sense_id ORDER BY answered_at DESC, id DESC) AS rn
        FROM final
        WHERE NOT (result = 'correct' AND hint_level > 0) AND (report IS NULL OR report = 'no_error')
      ), recent AS (
        SELECT sense_id, count(*)::int AS counted, (count(*) FILTER (WHERE result = 'wrong'))::int AS wrong,
          max(answered_at) FILTER (WHERE result = 'wrong') AS last_wrong_at
        FROM counted WHERE rn <= ${WEAK_WINDOW} GROUP BY sense_id
      ), practised AS (
        SELECT sense_id, max(answered_at) AS last_practiced_at FROM final GROUP BY sense_id
      )
      SELECT p.sense_id::text AS sense_id, p.last_practiced_at, COALESCE(r.counted, 0) AS counted, COALESCE(r.wrong, 0) AS wrong,
        r.last_wrong_at
      FROM practised p LEFT JOIN recent r ON r.sense_id = p.sense_id`;
    return new Map(rows.map((row) => [row.sense_id, {
      wrong: row.wrong, counted: row.counted, last_wrong_at: row.last_wrong_at?.toISOString() ?? null,
      last_practiced_at: row.last_practiced_at.toISOString(),
    }]));
  }

  /** Weak senses still in learning and visible (design §8), with their item and numbers. */
  async weakSenses(userId: string): Promise<Array<{ item: PracticeItem; stats: SenseStats }>> {
    const stats = await this.statsFor(userId);
    const weak = [...stats].filter(([, s]) => s.wrong >= WEAK_MIN_WRONG).map(([senseId]) => senseId);
    const items = await this.learning.practiceItems(userId, { kind: 'senses', senseIds: weak });
    return items.map((item) => ({ item, stats: stats.get(item.sense_id)! }));
  }
}
