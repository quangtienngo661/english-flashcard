import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import { AI_REQUEST_STALE_MS } from '../practice.constants.js';
import type { AiFailure, QuestionType } from '../practice.types.js';
import type { BuiltQuestion } from '../questions/question-builder.service.js';

export type AiRequestState = 'generating' | 'ready' | 'failed';
export type AiRequestRow = {
  id: string; userId: string; sessionId: string | null; senseId: string; type: QuestionType; round: number;
  state: AiRequestState; failure: AiFailure | null; aiInput: unknown; questionId: string | null; updatedAt: Date;
};

/** What step H stores besides the built question (design §7.7). */
export type AiQuestionData = {
  built: BuiltQuestion; userId: string; senseId: string; senseRevisionId: string; contentKey: string | null;
  aiMeta: Record<string, unknown>; createdAt: Date;
};

const transactionOptions = { timeout: 15_000, maxWait: 10_000 };
const toRow = (row: Awaited<ReturnType<PrismaClient['practiceAiRequest']['findUniqueOrThrow']>>): AiRequestRow => ({
  ...row, type: row.type as QuestionType, state: row.state as AiRequestState, failure: row.failure as AiFailure | null,
});

/** `practice_ai_requests` (design §6.5): every write but `create` and `writeQuestion` is one statement guarded on `generating`. */
@Injectable()
export class AiRequestsRepository {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  /** Inside the caller's transaction; the partial unique index refuses a second `generating` row per (user, sense). */
  async create(tx: Prisma.TransactionClient, input: { userId: string; sessionId: string; senseId: string; type: QuestionType;
    round: number }): Promise<AiRequestRow> {
    return toRow(await tx.practiceAiRequest.create({ data: { ...input, state: 'generating' } }));
  }

  async get(id: string, db: Prisma.TransactionClient | PrismaClient = this.prisma): Promise<AiRequestRow | null> {
    const row = await db.practiceAiRequest.findUnique({ where: { id } });
    return row ? toRow(row) : null;
  }

  /** Takes over a `generating` request untouched for AI_REQUEST_STALE_MS (design §6.5, R3); false = someone else holds it. */
  async claimStale(id: string, now: Date): Promise<boolean> {
    const { count } = await this.prisma.practiceAiRequest.updateMany({
      where: { id, state: 'generating', updatedAt: { lt: new Date(now.getTime() - AI_REQUEST_STALE_MS) } },
      data: { updatedAt: now },
    });
    return count === 1;
  }

  /** Step D: saved once, so a rerun sends the same data under the same operation id. */
  async saveInput(id: string, input: unknown, now: Date): Promise<void> {
    await this.prisma.practiceAiRequest.updateMany({
      where: { id, state: 'generating', aiInput: { equals: Prisma.AnyNull } }, data: { aiInput: input as Prisma.InputJsonValue, updatedAt: now },
    });
  }

  async markFailed(id: string, failure: AiFailure, now: Date): Promise<void> {
    await this.prisma.practiceAiRequest.updateMany({ where: { id, state: 'generating' }, data: { state: 'failed', failure, updatedAt: now } });
  }

  /**
   * Step H: locks the request row; still `generating` → the question and `ready` in one transaction, else nothing (B7E116;
   * the private-word port deleted it, or another run got here first).
   */
  async writeQuestion(id: string, data: AiQuestionData): Promise<{ questionId: string } | null> {
    return this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<Array<{ state: string }>>`
        SELECT state FROM practice_ai_requests WHERE id = ${id}::uuid FOR UPDATE`;
      if (locked[0]?.state !== 'generating') return null;
      const { built } = data;
      const question = await tx.practiceQuestion.create({ data: {
        userId: data.userId, senseId: data.senseId, type: built.type, promptStyle: built.promptStyle, blank: built.blank ?? undefined,
        schemaVersion: 1, prompt: built.prompt, answerKey: built.answerKey, hints: built.hints, distractorSenseIds: built.distractorSenseIds,
        createdAt: data.createdAt, source: 'ai', aiRequestId: id, aiMeta: data.aiMeta as Prisma.InputJsonValue, aiCharged: false,
        senseRevisionId: data.senseRevisionId, contentKey: data.contentKey,
      } });
      await tx.practiceAiRequest.update({ where: { id }, data: { state: 'ready', questionId: question.id, updatedAt: data.createdAt } });
      return { questionId: question.id };
    }, transactionOptions);
  }

  async setCharged(questionId: string): Promise<void> {
    await this.prisma.practiceQuestion.updateMany({ where: { id: questionId }, data: { aiCharged: true } });
  }

  /** The session's newest request for a word that is still generating or ready and not yet asked (design §6.5 A). */
  async findForSession(tx: Prisma.TransactionClient, sessionId: string, senseId: string): Promise<AiRequestRow | null> {
    const row = await tx.practiceAiRequest.findFirst({ where: { sessionId, senseId }, orderBy: { createdAt: 'desc' } });
    return row ? toRow(row) : null;
  }

  /** The first reason AI stopped for the session wins (design §6.6). */
  async stopSessionAi(sessionId: string, reason: 'quota-exhausted' | 'plan-required' | 'ai-unavailable'): Promise<void> {
    await this.prisma.practiceSession.updateMany({ where: { id: sessionId, aiStopped: null }, data: { aiStopped: reason } });
  }
}
