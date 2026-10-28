import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { dayRange } from '../../common/time/day-range.js';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';

/** The admin's fixed day, the same zone as the AI dashboard's days. */
const REPORT_ZONE = 'Asia/Ho_Chi_Minh';
const DEFAULT_DAYS = 30;

export type AiQualityReport = {
  from: string;
  to: string;
  /** Every question asked in the range, by source and type; `answered` counts a final correct or wrong (void counts nowhere). */
  questions: Array<{ source: string; type: string; asked: number; answered: number; correct: number; skipped: number; hinted: number }>;
  /** AI questions being made for a slot: how many ended ready or failed, and why. */
  ai_requests: Array<{ type: string; state: string; failure: string | null; count: number }>;
  /** Sessions that planned AI questions, by why AI stopped in them (`null` = it never stopped). */
  ai_sessions: Array<{ stopped: string | null; count: number }>;
  reports: Array<{ source: string; total: number; open: number; no_error: number; fixed: number; refunded: number }>;
  ai_report_reasons: Array<{ reason: string; label_vi: string; label_en: string; count: number }>;
  unknown_forms: { new_forms: number; rejected_seen: number };
  word_checks: Array<{ verdict: string; count: number }>;
};

/** Practice's part of the AI dashboard (owner 28/10/2026): totals only, no sentence and no learner. */
@Injectable()
export class AiQualityService {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  async report(query: { from?: string; to?: string }, now: Date): Promise<AiQualityReport> {
    const range = dayRange(query, REPORT_ZONE, now, DEFAULT_DAYS);
    const within = (column: string) => Prisma.sql`${Prisma.raw(column)} >= ${range.start} AND ${Prisma.raw(column)} < ${range.end}`;
    const [questions, aiRequests, aiSessions, reports, reasons, [forms], wordChecks] = await Promise.all([
      this.prisma.$queryRaw<AiQualityReport['questions']>(Prisma.sql`
        SELECT q.source, q.type, count(*)::int AS asked,
          (count(*) FILTER (WHERE i.result IN ('correct', 'wrong')))::int AS answered,
          (count(*) FILTER (WHERE i.result = 'correct'))::int AS correct,
          (count(*) FILTER (WHERE i.skipped))::int AS skipped,
          (count(*) FILTER (WHERE i.hint_level > 0))::int AS hinted
        FROM practice_session_items i JOIN practice_questions q ON q.id = i.question_id
        WHERE ${within('i.asked_at')} GROUP BY 1, 2 ORDER BY 1, 2`),
      this.prisma.$queryRaw<AiQualityReport['ai_requests']>(Prisma.sql`
        SELECT type, state, failure, count(*)::int AS count FROM practice_ai_requests
        WHERE ${within('created_at')} GROUP BY 1, 2, 3 ORDER BY 1, 2, 3`),
      this.prisma.$queryRaw<AiQualityReport['ai_sessions']>(Prisma.sql`
        SELECT ai_stopped AS stopped, count(*)::int AS count FROM practice_sessions
        WHERE ai_planned > 0 AND ${within('started_at')} GROUP BY 1 ORDER BY 1 NULLS FIRST`),
      this.prisma.$queryRaw<AiQualityReport['reports']>(Prisma.sql`
        SELECT question_source AS source, count(*)::int AS total,
          (count(*) FILTER (WHERE status = 'open'))::int AS open,
          (count(*) FILTER (WHERE status = 'no_error'))::int AS no_error,
          (count(*) FILTER (WHERE status = 'fixed'))::int AS fixed,
          (count(*) FILTER (WHERE refunded))::int AS refunded
        FROM practice_reports WHERE ${within('created_at')} GROUP BY 1 ORDER BY 1`),
      this.prisma.$queryRaw<AiQualityReport['ai_report_reasons']>(Prisma.sql`
        SELECT r.reason, rr.label_vi, rr.label_en, count(*)::int AS count
        FROM practice_reports r JOIN practice_report_reasons rr ON rr.code = r.reason
        WHERE r.question_source = 'ai' AND ${within('r.created_at')} GROUP BY 1, 2, 3 ORDER BY 4 DESC, 1`),
      this.prisma.$queryRaw<Array<AiQualityReport['unknown_forms']>>(Prisma.sql`
        SELECT (count(*) FILTER (WHERE ${within('first_seen_at')}))::int AS new_forms,
          (count(*) FILTER (WHERE ${within('last_seen_at')}))::int AS rejected_seen
        FROM practice_unknown_forms`),
      this.prisma.$queryRaw<AiQualityReport['word_checks']>(Prisma.sql`
        SELECT verdict, count(*)::int AS count FROM practice_word_checks WHERE ${within('checked_at')} GROUP BY 1 ORDER BY 1`),
    ]);
    return {
      from: range.from, to: range.to, questions, ai_requests: aiRequests, ai_sessions: aiSessions, reports,
      ai_report_reasons: reasons, unknown_forms: forms ?? { new_forms: 0, rejected_seen: 0 }, word_checks: wordChecks,
    };
  }
}
