import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import type { StoredAiInput } from '../ai/ai-question-generator.service.js';
import type { AnswerKey } from '../practice.types.js';
import type { ConfigPair, SourceRef } from './real-judge.types.js';
import type { PracticeAiOperation, RealQuestionRow } from './real-questions.js';

type WindowArgs = { since: Date; operation: PracticeAiOperation; config: ConfigPair | null; userIds: string[] | null };

/**
 * What the add-to-examples endpoints need of a report or a question: either may have been cleaned up, so `answerKey` (the question row) and
 * `aiInput` (the request) can be null. `ownerId` is the learner who was asked; `snapshot` is the report's masked copy (null for a question).
 */
export type SourceRow = {
  senseId: string; ownerId: string; aiMeta: unknown; questionSource: string; reportStatus: string | null; snapshot: unknown | null;
  answerKey: AnswerKey | null; aiInput: StoredAiInput | null;
};

type SourceRecord = {
  sense_id: string; owner_id: string; ai_meta: unknown; question_source: string; report_status: string | null; snapshot: unknown | null;
  answer_key: AnswerKey | null; ai_input: StoredAiInput | null;
};

type WindowRow = {
  id: string; user_id: string; sense_id: string; created_at: Date; ai_meta: unknown; answer_key: AnswerKey; ai_input: StoredAiInput | null;
  session_sense_ids: string[] | null;
};

/** The AI questions made since `since` for one operation, optionally by one config pair and by given users only (the conditions both reads share). */
function conditions(args: { since: Date; operation: PracticeAiOperation; userIds: string[] | null }): Prisma.Sql[] {
  return [
    Prisma.sql`q.source = 'ai'`,
    Prisma.sql`q.created_at >= ${args.since}`,
    Prisma.sql`q.ai_meta->>'operation' = ${args.operation}`,
    ...(args.userIds === null ? [] : [Prisma.sql`q.user_id = ANY(${args.userIds}::uuid[])`]),
  ];
}

/**
 * What Practice reads to pick real AI questions (nhóm B M4, design §7.1): its own tables only. A question's request and session may be gone
 * (cleaned up after `AI_REQUEST_RETENTION_DAYS`), so both are joined loosely. The window is read whole, without a new index (E9, `ASSUMPTION`:
 * fine at today's volume, the window being at most 30 days).
 */
@Injectable()
export class RealQuestionsRepository {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  /** Newest first. `aiInput` is the data sent to the AI (null once its request was cleaned up); `sessionSenseIds` the session's first round. */
  async window(args: WindowArgs): Promise<RealQuestionRow[]> {
    const where = [
      ...conditions(args),
      ...(args.config === null ? [] : [
        Prisma.sql`(q.ai_meta->>'prompt_revision')::int = ${args.config.number}`, Prisma.sql`q.ai_meta->>'model' = ${args.config.model}`,
      ]),
    ];
    const rows = await this.prisma.$queryRaw<WindowRow[]>(Prisma.sql`
      SELECT q.id::text AS id, q.user_id::text AS user_id, q.sense_id::text AS sense_id, q.created_at, q.ai_meta, q.answer_key, r.ai_input,
        s.sense_ids::text[] AS session_sense_ids
      FROM practice_questions q
      LEFT JOIN practice_ai_requests r ON r.id::text = q.ai_request_id
      LEFT JOIN practice_sessions s ON s.id = r.session_id
      WHERE ${Prisma.join(where, ' AND ')}
      ORDER BY q.created_at DESC, q.id DESC`);
    return rows.map((row) => ({
      id: row.id, userId: row.user_id, senseId: row.sense_id, createdAt: row.created_at, aiMeta: row.ai_meta, answerKey: row.answer_key,
      aiInput: row.ai_input, sessionSenseIds: row.session_sense_ids ?? [],
    }));
  }

  /**
   * A report (its question found by the request id the report kept, its request by that id) or a question (its request by its request id); null for an
   * unknown id. The meta is the question's while it exists, else the copy the report took.
   */
  async source(ref: SourceRef): Promise<SourceRow | null> {
    const [row] = 'report_id' in ref
      ? await this.prisma.$queryRaw<SourceRecord[]>(Prisma.sql`
        SELECT rep.sense_id::text AS sense_id, rep.user_id::text AS owner_id, COALESCE(q.ai_meta, rep.ai_meta) AS ai_meta, rep.question_source AS question_source,
          rep.status AS report_status, rep.question_snapshot AS snapshot, q.answer_key, r.ai_input
        FROM practice_reports rep
        LEFT JOIN practice_questions q ON q.ai_request_id = rep.ai_operation_id
        LEFT JOIN practice_ai_requests r ON r.id::text = rep.ai_operation_id
        WHERE rep.id = ${ref.report_id}::uuid`)
      : await this.prisma.$queryRaw<SourceRecord[]>(Prisma.sql`
        SELECT q.sense_id::text AS sense_id, q.user_id::text AS owner_id, q.ai_meta, q.source AS question_source, NULL::text AS report_status,
          NULL::jsonb AS snapshot, q.answer_key, r.ai_input
        FROM practice_questions q
        LEFT JOIN practice_ai_requests r ON r.id::text = q.ai_request_id
        WHERE q.id = ${ref.question_id}::uuid`);
    return row ? {
      senseId: row.sense_id, ownerId: row.owner_id, aiMeta: row.ai_meta, questionSource: row.question_source, reportStatus: row.report_status,
      snapshot: row.snapshot, answerKey: row.answer_key, aiInput: row.ai_input,
    } : null;
  }

  /** The time and the meta of the questions that still exist (a deleted learner's or an old question is absent); nothing that names the learner is read. */
  async questions(ids: string[]): Promise<Map<string, { createdAt: Date; aiMeta: unknown }>> {
    const unique = [...new Set(ids)];
    if (unique.length === 0) return new Map();
    const rows = await this.prisma.practiceQuestion.findMany({ where: { id: { in: unique } }, select: { id: true, createdAt: true, aiMeta: true } });
    return new Map(rows.map((row) => [row.id, { createdAt: row.createdAt, aiMeta: row.aiMeta }]));
  }

  /** The (config number, model) pairs the window's questions were made with, most questions first. */
  async pairs(args: { since: Date; operation: PracticeAiOperation; userIds: string[] | null }): Promise<Array<{ config_number: number | null; model: string; questions: number }>> {
    const where = [...conditions(args), Prisma.sql`q.ai_meta->>'model' IS NOT NULL`];
    return this.prisma.$queryRaw<Array<{ config_number: number | null; model: string; questions: number }>>(Prisma.sql`
      SELECT (q.ai_meta->>'prompt_revision')::int AS config_number, q.ai_meta->>'model' AS model, count(*)::int AS questions
      FROM practice_questions q
      WHERE ${Prisma.join(where, ' AND ')}
      GROUP BY (q.ai_meta->>'prompt_revision')::int, q.ai_meta->>'model'
      ORDER BY count(*) DESC, (q.ai_meta->>'prompt_revision')::int DESC NULLS LAST, q.ai_meta->>'model'`);
  }
}
