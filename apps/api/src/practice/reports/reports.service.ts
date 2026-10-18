import { Inject, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Clock } from '../../common/clock/clock.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { decodeBoundToken, encodeBoundToken } from '../../common/pagination/page-token.util.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { SettingsService } from '../../settings/index.js';
import { withPracticeLock } from '../practice-lock.js';
import type { AnswerKey, Hints, Prompt, QuestionType } from '../practice.types.js';
import { buildSnapshot } from './snapshot.js';

export type ReportReason = 'meaning_wrong' | 'graded_wrong' | 'hint_wrong' | 'other';
export type ReportStatus = 'open' | 'no_error' | 'fixed';
type ReportRow = Prisma.PracticeReportGetPayload<object>;

const transactionOptions = { timeout: 30_000, maxWait: 5_000 };
const hour = 3_600_000;
const notFound = () => new ProblemDetailsException({ status: 404, title: 'Not found', type: 'not-found' });
const invalidInput = () => new ProblemDetailsException({ status: 400, title: 'Validation failed', type: 'validation-failed' });
const isUniqueViolation = (error: unknown) =>
  error !== null && typeof error === 'object' && 'code' in error && error.code === 'P2002';

/** What the learner sees of their own report. */
const learnerView = (row: ReportRow) => ({
  id: row.id, item_id: row.itemId, sense_id: row.senseId, reason: row.reason, note: row.note, status: row.status,
  created_at: row.createdAt.toISOString(),
});

/** What staff see: the masked snapshot, never the reporter (design §10). */
const staffView = (row: ReportRow) => ({
  id: row.id, sense_id: row.senseId, reason: row.reason, note: row.note, status: row.status,
  question_snapshot: row.questionSnapshot, created_at: row.createdAt.toISOString(),
  resolved_at: row.resolvedAt?.toISOString() ?? null, resolved_by: row.resolvedBy,
});

const reportExists = (row: ReportRow) => new ProblemDetailsException({
  status: 409, title: 'Report exists', type: 'report-exists', extensions: { report: learnerView(row) },
});

@Injectable()
export class ReportsService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(SettingsService) private readonly settings: SettingsService,
  ) {}

  /** B4E20, B4E40, B4E47: one report per item, counted per learner under the practice lock so two at once never pass the cap. */
  async create(userId: string, itemId: string, input: { reason: ReportReason; note: string | null }) {
    const { reportsPerHour } = (await this.settings.get()).practice;
    try {
      return learnerView(await this.prisma.$transaction(async (tx) => {
        await withPracticeLock(tx, userId);
        // Any session status (design R11).
        const item = await tx.practiceSessionItem.findFirst({ where: { id: itemId, userId }, include: { question: true } });
        if (!item) throw notFound();
        const answerKey = item.question.answerKey as AnswerKey;
        if (answerKey.asked_private) {
          throw new ProblemDetailsException({ status: 409, title: 'Report not available', type: 'report-not-available' });
        }
        const existing = await tx.practiceReport.findUnique({ where: { itemId } });
        if (existing) throw reportExists(existing);
        const now = this.clock.now();
        const windowStart = new Date(now.getTime() - hour);
        const recent = await tx.practiceReport.findMany({
          where: { userId, createdAt: { gt: windowStart } }, orderBy: { createdAt: 'asc' }, select: { createdAt: true },
        });
        if (recent.length >= reportsPerHour) {
          // The report that frees a place is the one leaving the window soonest.
          const freedAt = recent[recent.length - reportsPerHour].createdAt.getTime() + hour;
          throw new ProblemDetailsException({
            status: 429, title: 'Too many requests', type: 'rate-limited',
            retryAfterSeconds: Math.max(1, Math.ceil((freedAt - now.getTime()) / 1000)),
          });
        }
        const snapshot = buildSnapshot({
          type: item.question.type as QuestionType, prompt: item.question.prompt as Prompt, answerKey,
          hints: item.question.hints as Hints,
        }, { answer_raw: item.answerRaw, answers_tried: item.answersTried, result: item.result, hint_level: item.hintLevel });
        return tx.practiceReport.create({ data: {
          userId, itemId, senseId: item.senseId, questionSnapshot: snapshot as Prisma.InputJsonValue, reason: input.reason, note: input.note,
          createdAt: now,
        } });
      }, transactionOptions));
    } catch (error) {
      // The lock serialises one learner's reports; this only covers a row that appeared outside it.
      if (!isUniqueViolation(error)) throw error;
      const stored = await this.prisma.practiceReport.findUnique({ where: { itemId } });
      if (!stored) throw error;
      throw reportExists(stored);
    }
  }

  async list(query: { status?: ReportStatus; pageSize: number; pageToken?: string }) {
    const binding = createHash('sha256')
      .update(JSON.stringify({ route: 'practice-reports', filters: { status: query.status ?? null } })).digest('hex');
    let cursor: { created_at: string; id: string } | undefined;
    if (query.pageToken !== undefined) {
      const decoded = decodeBoundToken(query.pageToken, binding);
      if (typeof decoded?.created_at !== 'string' || typeof decoded.id !== 'string') throw invalidInput();
      cursor = { created_at: decoded.created_at, id: decoded.id };
    }
    const createdAt = cursor ? new Date(cursor.created_at) : undefined;
    if (createdAt && Number.isNaN(createdAt.getTime())) throw invalidInput();
    const rows = await this.prisma.practiceReport.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(cursor ? { OR: [{ createdAt: { lt: createdAt } }, { createdAt, id: { gt: cursor.id } }] } : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], take: query.pageSize + 1,
    });
    const items = rows.slice(0, query.pageSize);
    const last = items.at(-1);
    return {
      items: items.map(staffView),
      next_page_token: rows.length > query.pageSize && last
        ? encodeBoundToken({ created_at: last.createdAt.toISOString(), id: last.id }, binding) : null,
    };
  }

  /** Only an open report can be resolved; a second resolve is 409 report-not-open. */
  async resolve(actorId: string, reportId: string, status: Exclude<ReportStatus, 'open'>) {
    const now = this.clock.now();
    const { count } = await this.prisma.practiceReport.updateMany({
      where: { id: reportId, status: 'open' }, data: { status, resolvedBy: actorId, resolvedAt: now },
    });
    const row = await this.prisma.practiceReport.findUnique({ where: { id: reportId } });
    if (!row) throw notFound();
    if (count === 0) throw new ProblemDetailsException({ status: 409, title: 'Report not open', type: 'report-not-open' });
    return staffView(row);
  }
}
