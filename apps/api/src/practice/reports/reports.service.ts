import { Inject, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Clock } from '../../common/clock/clock.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { decodeBoundToken, encodeBoundToken } from '../../common/pagination/page-token.util.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { SettingsService } from '../../settings/index.js';
import { withPracticeLock } from '../practice-lock.js';
import type { Learner } from '../../content/index.js';
import type { AnswerKey, Hints, Prompt, QuestionSource, QuestionType } from '../practice.types.js';
import { ReportReasonsService } from './report-reasons.service.js';
import { buildSnapshot } from './snapshot.js';

export type ReportStatus = 'open' | 'no_error' | 'fixed';
type ReportRow = Prisma.PracticeReportGetPayload<object>;

const transactionOptions = { timeout: 30_000, maxWait: 5_000 };
const hour = 3_600_000;
const notFound = () => new ProblemDetailsException({ status: 404, title: 'Not found', type: 'not-found' });
const invalidInput = (violations?: string[]) => new ProblemDetailsException({
  status: 400, title: 'Validation failed', type: 'validation-failed', ...(violations ? { extensions: { violations } } : {}),
});
const notAvailable = () => new ProblemDetailsException({ status: 409, title: 'Report not available', type: 'report-not-available' });
const isUniqueViolation = (error: unknown) =>
  error !== null && typeof error === 'object' && 'code' in error && error.code === 'P2002';

/** What the learner sees of their own report. */
const learnerView = (row: ReportRow) => ({
  id: row.id, item_id: row.itemId, sense_id: row.senseId, reason: row.reason, reason_label: row.reasonLabel, note: row.note,
  status: row.status, created_at: row.createdAt.toISOString(),
});

type MyReportRow = Pick<ReportRow, 'id' | 'itemId' | 'senseId' | 'reasonLabel' | 'status' | 'refunded' | 'createdAt' | 'resolvedAt'>;
/** A row of the learner's own list (D27): `refunded` true / false / null tells the app what to say about the unit. */
const myReportView = (row: MyReportRow) => ({
  id: row.id, item_id: row.itemId, sense_id: row.senseId, reason_label: row.reasonLabel, status: row.status, refunded: row.refunded,
  created_at: row.createdAt.toISOString(), resolved_at: row.resolvedAt?.toISOString() ?? null,
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
    @Inject(ReportReasonsService) private readonly reasons: ReportReasonsService,
  ) {}

  /**
   * B4E20, B4E40, B4E47: one report per item, counted per learner under the practice lock so two at once never pass the cap.
   * Bước 7 (§9.2): the reason must fit the question's kind; an AI question about a private word needs the learner's consent
   * (D26); a non-AI one about a private word, and a cloze from the learner's own sentence, cannot be reported.
   */
  async create(learner: Learner, itemId: string, input: { reason: string; note: string | null; sharePrivateWord: boolean }) {
    const { userId } = learner;
    const { reportsPerHour } = (await this.settings.get()).practice;
    try {
      return learnerView(await this.prisma.$transaction(async (tx) => {
        await withPracticeLock(tx, userId);
        // Any session status (design R11).
        const item = await tx.practiceSessionItem.findFirst({ where: { id: itemId, userId }, include: { question: true } });
        if (!item) throw notFound();
        const answerKey = item.question.answerKey as AnswerKey;
        const source = item.question.source as QuestionSource;
        const isAi = source === 'ai';
        if (source === 'own_sentence' || (answerKey.asked_private && !isAi)) throw notAvailable();
        const existing = await tx.practiceReport.findUnique({ where: { itemId } });
        if (existing) throw reportExists(existing);
        const reason = await this.reasons.forItem(tx, input.reason, isAi ? 'ai' : 'non_ai');
        if (!reason) throw invalidInput(['reason']);
        if (reason.noteRequired && input.note === null) throw invalidInput(['note']);
        if (answerKey.asked_private && !input.sharePrivateWord) {
          throw new ProblemDetailsException({ status: 400, title: 'Share consent required', type: 'share-consent-required' });
        }
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
        // The label as the learner saw it; a later rename does not change the report (B7E78).
        return tx.practiceReport.create({ data: {
          userId, itemId, senseId: item.senseId, questionSnapshot: snapshot as Prisma.InputJsonValue, reason: reason.code,
          reasonLabel: learner.nativeLanguage === 'vi' ? reason.labelVi : reason.labelEn, note: input.note, createdAt: now,
          questionSource: source, aiOperationId: item.question.aiRequestId, aiCharged: item.question.aiCharged,
          ...(item.question.aiMeta === null ? {} : { aiMeta: item.question.aiMeta as Prisma.InputJsonValue }),
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

  /** The learner's own reports, newest first (design §9.2); the page token is bound to this learner. */
  async listMine(userId: string, query: { pageSize: number; pageToken?: string }) {
    const binding = createHash('sha256').update(JSON.stringify({ route: 'practice-my-reports', userId })).digest('hex');
    let cursor: { createdAt: Date; id: string } | undefined;
    if (query.pageToken !== undefined) {
      const decoded = decodeBoundToken(query.pageToken, binding);
      if (typeof decoded?.created_at !== 'string' || typeof decoded.id !== 'string') throw invalidInput();
      const createdAt = new Date(decoded.created_at);
      if (Number.isNaN(createdAt.getTime())) throw invalidInput();
      cursor = { createdAt, id: decoded.id };
    }
    const rows = await this.prisma.practiceReport.findMany({
      where: {
        userId,
        ...(cursor ? { OR: [{ createdAt: { lt: cursor.createdAt } }, { createdAt: cursor.createdAt, id: { gt: cursor.id } }] } : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], take: query.pageSize + 1,
    });
    const items = rows.slice(0, query.pageSize);
    const last = items.at(-1);
    return {
      items: items.map(myReportView),
      next_page_token: rows.length > query.pageSize && last
        ? encodeBoundToken({ created_at: last.createdAt.toISOString(), id: last.id }, binding) : null,
    };
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
