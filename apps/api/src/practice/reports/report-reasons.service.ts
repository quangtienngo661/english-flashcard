import { Inject, Injectable } from '@nestjs/common';
import { z } from 'zod';
import { Clock } from '../../common/clock/clock.js';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { userRef } from '../../common/user-ref.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { IdentityService } from '../../identity/profile/identity.service.js';
import type { MeaningLanguage } from '../practice.types.js';

export type ReportReasonRow = Prisma.PracticeReportReasonGetPayload<object>;
// Which questions a learner is reporting: the three AI kinds, or every other kind (design §9.2).
export type ReasonKind = 'ai' | 'non_ai';

// Label and hint lengths are not fixed by the design (ASSUMPTION).
const label = z.string().trim().min(1).max(100);
const hint = z.string().trim().min(1).max(200).nullable();
const fields = {
  label_vi: label, label_en: label, detail_hint_vi: hint.optional(), detail_hint_en: hint.optional(),
  applies_to: z.enum(['ai', 'non_ai', 'all']), note_required: z.boolean(), refundable: z.boolean(), position: z.number().int().min(0).max(10_000),
};
export const REASON_CODE_PATTERN = /^[a-z][a-z0-9_]{1,39}$/;
export const createReasonSchema = z.strictObject({ code: z.string().regex(REASON_CODE_PATTERN), ...fields });
// Every field but code; at least one.
export const patchReasonSchema = z.strictObject({
  label_vi: label.optional(), label_en: label.optional(), detail_hint_vi: hint.optional(), detail_hint_en: hint.optional(),
  applies_to: fields.applies_to.optional(), note_required: z.boolean().optional(), refundable: z.boolean().optional(),
  position: fields.position.optional(), active: z.boolean().optional(),
}).refine((patch) => Object.keys(patch).length > 0);
export type CreateReasonBody = z.infer<typeof createReasonSchema>;
export type PatchReasonBody = z.infer<typeof patchReasonSchema>;

const byPosition = (a: ReportReasonRow, b: ReportReasonRow) => a.position - b.position || a.code.localeCompare(b.code);

export const fitsKind = (row: ReportReasonRow, kind: ReasonKind) => row.active && (row.appliesTo === 'all' || row.appliesTo === kind);

/** The reasons a learner may pick for a question of this kind, in their language (design §9.2). */
export function learnerReasons(rows: ReportReasonRow[], kind: ReasonKind, language: MeaningLanguage) {
  return rows.filter((row) => fitsKind(row, kind)).sort(byPosition).map((row) => ({
    code: row.code, label: language === 'vi' ? row.labelVi : row.labelEn,
    detail_hint: language === 'vi' ? row.detailHintVi : row.detailHintEn, note_required: row.noteRequired,
  }));
}

const adminView = (row: ReportReasonRow, emails: ReadonlyMap<string, string>) => ({
  code: row.code, label_vi: row.labelVi, label_en: row.labelEn, detail_hint_vi: row.detailHintVi, detail_hint_en: row.detailHintEn,
  applies_to: row.appliesTo, note_required: row.noteRequired, refundable: row.refundable, active: row.active, position: row.position,
  updated_at: row.updatedAt.toISOString(), updated_by: row.updatedBy,
  updated_by_user: row.updatedBy ? userRef(row.updatedBy, emails) : null,
});

const errorCode = (error: unknown) => error !== null && typeof error === 'object' && 'code' in error ? error.code : undefined;

/** Report reasons managed by the admin (design §9.1, D25); never deleted, only turned off. The table holds a handful of rows. */
@Injectable()
export class ReportReasonsService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(Clock) private readonly clock: Clock,
    @Inject(IdentityService) private readonly identity: IdentityService,
  ) {}

  /** One staff address lookup per call (design §5.1), always outside a transaction. */
  private emailsOf(rows: readonly ReportReasonRow[]) {
    return this.identity.emailsOf([...new Set(rows.flatMap((row) => row.updatedBy ? [row.updatedBy] : []))]);
  }

  async learnerList(kind: ReasonKind, language: MeaningLanguage) {
    return { items: learnerReasons(await this.prisma.practiceReportReason.findMany(), kind, language) };
  }

  async adminList() {
    const rows = [...await this.prisma.practiceReportReason.findMany()].sort(byPosition);
    const emails = await this.emailsOf(rows);
    return { items: rows.map((row) => adminView(row, emails)) };
  }

  async create(actorId: string, body: CreateReasonBody) {
    const now = this.clock.now();
    try {
      const row = await this.prisma.practiceReportReason.create({ data: {
        code: body.code, labelVi: body.label_vi, labelEn: body.label_en, detailHintVi: body.detail_hint_vi ?? null,
        detailHintEn: body.detail_hint_en ?? null, appliesTo: body.applies_to, noteRequired: body.note_required, refundable: body.refundable,
        position: body.position, createdAt: now, updatedAt: now, updatedBy: actorId,
      } });
      return adminView(row, await this.emailsOf([row]));
    } catch (error) {
      if (errorCode(error) !== 'P2002') throw error;
      throw new ProblemDetailsException({ status: 409, title: 'Report reason exists', type: 'report-reason-exists' });
    }
  }

  async update(actorId: string, code: string, patch: PatchReasonBody) {
    const data: Prisma.PracticeReportReasonUpdateInput = {
      ...(patch.label_vi !== undefined ? { labelVi: patch.label_vi } : {}),
      ...(patch.label_en !== undefined ? { labelEn: patch.label_en } : {}),
      ...(patch.detail_hint_vi !== undefined ? { detailHintVi: patch.detail_hint_vi } : {}),
      ...(patch.detail_hint_en !== undefined ? { detailHintEn: patch.detail_hint_en } : {}),
      ...(patch.applies_to !== undefined ? { appliesTo: patch.applies_to } : {}),
      ...(patch.note_required !== undefined ? { noteRequired: patch.note_required } : {}),
      ...(patch.refundable !== undefined ? { refundable: patch.refundable } : {}),
      ...(patch.position !== undefined ? { position: patch.position } : {}),
      ...(patch.active !== undefined ? { active: patch.active } : {}),
      updatedAt: this.clock.now(), updatedBy: actorId,
    };
    try {
      const row = await this.prisma.practiceReportReason.update({ where: { code }, data });
      return adminView(row, await this.emailsOf([row]));
    } catch (error) {
      if (errorCode(error) !== 'P2025') throw error;
      throw new ProblemDetailsException({ status: 404, title: 'Not found', type: 'not-found' });
    }
  }

  /** The reason a learner sent, if it is active and fits the question's kind (B7E71); read inside the report transaction. */
  async forItem(tx: Prisma.TransactionClient, code: string, kind: ReasonKind): Promise<ReportReasonRow | null> {
    const row = await tx.practiceReportReason.findUnique({ where: { code } });
    return row && fitsKind(row, kind) ? row : null;
  }
}
