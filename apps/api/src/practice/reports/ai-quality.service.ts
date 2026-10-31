import { Inject, Injectable } from '@nestjs/common';
import { AiService, type JudgeScoreGroup } from '../../ai/index.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { dayRange } from '../../common/time/day-range.js';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import { metaOf } from '../quality/real-questions.js';
import { latestRealPasses, realScoreGroups, type RealLatestRow, type ScoredQuestion } from './real-judge-summary.js';

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
  /** By source and status: `confirmed` is a confirmed AI error (F11, counted since nhóm B M5); `refunded` counts reports whose AI unit was given back. */
  reports: Array<{ source: string; total: number; open: number; no_error: number; fixed: number; confirmed: number; refunded: number }>;
  ai_report_reasons: Array<{ reason: string; label_vi: string; label_en: string; count: number }>;
  unknown_forms: { new_forms: number; rejected_seen: number };
  word_checks: Array<{ verdict: string; count: number }>;
  /**
   * Per AI question type: `first_answers` = AI answers that came back valid on the first try; `second_tries` = those that Practice's
   * rules rejected and the AI was asked again. A type with no answer in the range has no row.
   */
  ai_second_tries: Array<{ type: string; first_answers: number; second_tries: number }>;
  /**
   * The judge's scores of real questions made in the range (nhóm B M5), by operation, (config number, model), judge revision and criterion; the config
   * number and model are the ones the question was made with (`ai_meta`). Counts only.
   */
  real_judge_scores: JudgeScoreGroup[];
  /** Per operation the latest finished real-question pass: one row per criterion with the verdict counts of that pass. */
  real_judge_latest: RealLatestRow[];
};

/** The most question ids one lookup binds (the database limits the parameters of a statement). */
const QUESTION_LOOKUP_CHUNK = 5000;

/** The AI operation behind each AI question type (the generator's table, read the other way). */
const TYPE_OF_OPERATION: Record<string, string> = {
  generate_cloze: 'cloze', generate_meaning_question: 'meaning_in_sentence', generate_sentence_mcq: 'mcq_sentence',
};

/** Practice's part of the AI dashboard (owner 28/10/2026): totals only, no sentence and no learner. */
@Injectable()
export class AiQualityService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(AiService) private readonly ai: AiService,
  ) {}

  async report(query: { from?: string; to?: string }, now: Date): Promise<AiQualityReport> {
    const range = dayRange(query, REPORT_ZONE, now, DEFAULT_DAYS);
    const within = (column: string) => Prisma.sql`${Prisma.raw(column)} >= ${range.start} AND ${Prisma.raw(column)} < ${range.end}`;
    const [questions, aiRequests, aiSessions, reports, reasons, [forms], wordChecks, secondTries, realScores] = await Promise.all([
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
          (count(*) FILTER (WHERE status = 'confirmed'))::int AS confirmed,
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
      this.ai.secondTries({ start: range.start, end: range.end }),
      this.ai.realJudgeScores({ start: range.start, end: range.end }),
    ]);
    const scored = await this.scoredQuestions(realScores);
    return {
      from: range.from, to: range.to, questions, ai_requests: aiRequests, ai_sessions: aiSessions, reports,
      ai_report_reasons: reasons, unknown_forms: forms ?? { new_forms: 0, rejected_seen: 0 }, word_checks: wordChecks,
      ai_second_tries: secondTries.flatMap(({ operation, first_answers, second_tries }) => (
        TYPE_OF_OPERATION[operation] ? [{ type: TYPE_OF_OPERATION[operation], first_answers, second_tries }] : []
      )),
      real_judge_scores: realScoreGroups(scored), real_judge_latest: latestRealPasses(scored),
    };
  }

  /**
   * Each score with the operation, config number and model of its question's AI call (`ai_meta`, only Practice has it). A score whose question
   * is gone (its account was deleted) or whose `ai_meta` names no operation is left out.
   */
  private async scoredQuestions(scores: Awaited<ReturnType<AiService['realJudgeScores']>>): Promise<ScoredQuestion[]> {
    if (scores.length === 0) return [];
    const ids = [...new Set(scores.map((score) => score.subjectId))];
    const meta = new Map<string, ReturnType<typeof metaOf>>();
    for (let from = 0; from < ids.length; from += QUESTION_LOOKUP_CHUNK) {
      const rows = await this.prisma.practiceQuestion.findMany({
        where: { id: { in: ids.slice(from, from + QUESTION_LOOKUP_CHUNK) } }, select: { id: true, aiMeta: true },
      });
      for (const row of rows) meta.set(row.id, metaOf(row.aiMeta));
    }
    return scores.flatMap((score) => {
      const found = meta.get(score.subjectId);
      return found?.operation ? [{ ...score, operation: found.operation, configNumber: found.config_number, model: found.model }] : [];
    });
  }
}
