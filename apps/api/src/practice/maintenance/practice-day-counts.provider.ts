import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { dateString } from '../../common/time/local-date.js';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import type { PracticeDayCount, PracticeDayCounts, PracticeDaySession } from '../../learning/index.js';

/**
 * Practice's side of the study calendar port (design giao diện mới §10.2): graded answers per local day, with the practice
 * history filter (`result IN ('correct','wrong')`, sessions of kind `practice`, `history.service.ts`), so a recall session
 * ("Ôn") never counts here.
 */
@Injectable()
export class PracticeDayCountsProvider implements PracticeDayCounts {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  async countByLocalDate(userId: string, from: string, to: string): Promise<PracticeDayCount[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{ date: Date; sessions: bigint | number; questions: bigint | number; correct: bigint | number }>
    >(Prisma.sql`
      SELECT i.local_date AS date, COUNT(DISTINCT i.session_id) AS sessions, COUNT(*) AS questions,
        COUNT(*) FILTER (WHERE i.result = 'correct') AS correct
      FROM practice_session_items i JOIN practice_sessions s ON s.id = i.session_id
      WHERE i.user_id = ${userId}::uuid AND i.result IN ('correct', 'wrong') AND s.kind = 'practice'
        AND i.local_date BETWEEN ${from}::date AND ${to}::date
      GROUP BY i.local_date ORDER BY i.local_date`);
    return rows.map((row) => ({
      date: dateString(row.date),
      sessions: Number(row.sessions),
      questions: Number(row.questions),
      correct: Number(row.correct),
    }));
  }

  async sessionsOfDay(userId: string, date: string): Promise<PracticeDaySession[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        session_id: string;
        first_position: number;
        last_position: number;
        questions: bigint | number;
        correct: bigint | number;
      }>
    >(Prisma.sql`
      SELECT i.session_id::text AS session_id, MIN(i.position) AS first_position, MAX(i.position) AS last_position,
        COUNT(*) AS questions, COUNT(*) FILTER (WHERE i.result = 'correct') AS correct
      FROM practice_session_items i JOIN practice_sessions s ON s.id = i.session_id
      WHERE i.user_id = ${userId}::uuid AND i.result IN ('correct', 'wrong') AND s.kind = 'practice'
        AND i.local_date = ${date}::date
      GROUP BY i.session_id ORDER BY MIN(i.answered_at), i.session_id`);
    return rows.map((row) => ({
      sessionId: row.session_id,
      firstPosition: Number(row.first_position),
      lastPosition: Number(row.last_position),
      questions: Number(row.questions),
      correct: Number(row.correct),
    }));
  }
}
