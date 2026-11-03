import { Inject, Injectable } from '@nestjs/common';
import { Clock } from '../common/clock/clock.js';
import { PRISMA_CLIENT } from '../common/db/prisma.module.js';
import { decodePageToken, encodePageToken } from '../common/pagination/page-token.util.js';
import { ProblemDetailsException } from '../common/problem-details/problem-details.exception.js';
import { dateString, dateValue } from '../common/time/local-date.js';
import type { PrismaClient } from '../generated/prisma/client.js';
import { IdentityService } from '../identity/profile/identity.service.js';
import type { PublishBody, SaveBody } from './legal.schemas.js';

type Status = 'draft' | 'published' | 'superseded';
type Actor = { id: string; email: string | null };

export type LegalVersionSummary = {
  id: string; number: number; version: string; status: Status; row_version: number; effective_date: string | null;
  has_english: boolean; updated_at: string; published_at: string | null; published_by: Actor | null;
};
export type LegalVersionView = LegalVersionSummary & {
  privacy_vi: string; terms_vi: string; privacy_en: string | null; terms_en: string | null;
};
/** What the public pages show: no ids, no authors. `en` is `null` when the admin wrote no English text. */
export type PublicLegal = {
  version: string; effective_date: string | null; privacy: { vi: string; en: string | null }; terms: { vi: string; en: string | null };
};

type Row = {
  id: string; number: number; status: string; rowVersion: number; privacyVi: string; termsVi: string; privacyEn: string | null;
  termsEn: string | null; effectiveDate: Date | null; updatedAt: Date; publishedBy: string | null; publishedAt: Date | null;
};

const problem = (status: number, type: string, title: string, extensions?: Record<string, unknown>) =>
  new ProblemDetailsException({ status, type, title, extensions });
const notFound = () => problem(404, 'not-found', 'Not found');
const notADraft = () => problem(409, 'not-a-draft', 'Only a draft can change');
const invalidPage = () => problem(400, 'validation-failed', 'Validation failed');

function isUniqueViolation(error: unknown): boolean {
  return error !== null && typeof error === 'object' && 'code' in error && error.code === 'P2002';
}

/** The version a learner records when accepting: the published number as text, e.g. "3". */
const versionOf = (number: number) => String(number);

@Injectable()
export class LegalService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(Clock) private readonly clock: Clock,
  ) {}

  async list(pageSize: number, pageToken?: string): Promise<{ items: LegalVersionSummary[]; next_page_token: string | null }> {
    let below: number | undefined;
    if (pageToken !== undefined) {
      const cursor = decodePageToken(pageToken);
      if (!cursor || !/^[0-9a-f-]{36}$/.test(cursor.id)) throw invalidPage();
      const row = await this.prisma.legalVersion.findUnique({ where: { id: cursor.id } });
      if (!row) throw invalidPage();
      below = row.number;
    }
    const rows = await this.prisma.legalVersion.findMany({
      where: below === undefined ? {} : { number: { lt: below } }, orderBy: { number: 'desc' }, take: pageSize + 1,
    });
    const page = rows.slice(0, pageSize);
    const actors = await this.actorsOf(page);
    return {
      items: page.map((row) => this.summary(row, actors)),
      next_page_token: rows.length > pageSize ? encodePageToken({ id: page[page.length - 1].id }) : null,
    };
  }

  async get(id: string): Promise<LegalVersionView> {
    const row = await this.prisma.legalVersion.findUnique({ where: { id } });
    if (!row) throw notFound();
    return this.view(row, await this.actorsOf([row]));
  }

  /** A new draft: a copy of `copyFrom`, else of the published version, else empty. */
  async create(actorId: string, copyFrom?: string): Promise<LegalVersionView> {
    try {
      const row = await this.prisma.$transaction(async (tx) => {
        const source = copyFrom !== undefined
          ? await tx.legalVersion.findUnique({ where: { id: copyFrom } })
          : await tx.legalVersion.findFirst({ where: { status: 'published' } });
        if (copyFrom !== undefined && !source) throw notFound();
        const last = await tx.legalVersion.findFirst({ orderBy: { number: 'desc' }, select: { number: true } });
        const now = this.clock.now();
        return tx.legalVersion.create({
          data: {
            number: (last?.number ?? 0) + 1, status: 'draft',
            privacyVi: source?.privacyVi ?? '', termsVi: source?.termsVi ?? '', privacyEn: source?.privacyEn ?? null,
            termsEn: source?.termsEn ?? null, effectiveDate: source?.effectiveDate ?? null,
            createdBy: actorId, createdAt: now, updatedBy: actorId, updatedAt: now,
          },
        });
      });
      return this.view(row, await this.actorsOf([row]));
    } catch (error) {
      // Two admins pressed "create" at once and took the same number.
      if (isUniqueViolation(error)) throw problem(409, 'legal-busy', 'Another version was created at the same time');
      throw error;
    }
  }

  async save(id: string, actorId: string, body: SaveBody): Promise<LegalVersionView> {
    const { count } = await this.prisma.legalVersion.updateMany({
      where: { id, status: 'draft', rowVersion: body.expected_version },
      data: {
        privacyVi: body.privacy_vi, termsVi: body.terms_vi, privacyEn: body.privacy_en, termsEn: body.terms_en,
        effectiveDate: body.effective_date === null ? null : dateValue(body.effective_date),
        rowVersion: { increment: 1 }, updatedBy: actorId, updatedAt: this.clock.now(),
      },
    });
    if (count === 0) throw await this.whyNotDraftWrite(id, 'draft-version-conflict', 'The draft changed since you opened it');
    return this.get(id);
  }

  async remove(id: string): Promise<void> {
    const { count } = await this.prisma.legalVersion.deleteMany({ where: { id, status: 'draft' } });
    if (count === 0) throw await this.whyNotDraftWrite(id, 'not-a-draft', 'Only a draft can be deleted');
  }

  /** In one transaction the old published version becomes `superseded` and this draft `published`. */
  async publish(id: string, actorId: string, body: PublishBody): Promise<LegalVersionView> {
    const draft = await this.prisma.legalVersion.findUnique({ where: { id } });
    if (!draft) throw notFound();
    if (draft.status !== 'draft') throw notADraft();
    if (draft.rowVersion !== body.expected_version) throw problem(409, 'publish-stale', 'The draft changed since you opened it');
    const missing = [
      ...(draft.privacyVi.trim() === '' ? ['privacy_vi'] : []),
      ...(draft.termsVi.trim() === '' ? ['terms_vi'] : []),
      ...(draft.effectiveDate === null ? ['effective_date'] : []),
    ];
    if (missing.length > 0) throw problem(400, 'validation-failed', 'Validation failed', { violations: missing });
    try {
      await this.prisma.$transaction(async (tx) => {
        const now = this.clock.now();
        await tx.legalVersion.updateMany({ where: { status: 'published', id: { not: id } }, data: { status: 'superseded', updatedAt: now } });
        const { count } = await tx.legalVersion.updateMany({
          where: { id, status: 'draft', rowVersion: body.expected_version },
          data: { status: 'published', publishedBy: actorId, publishedAt: now, updatedBy: actorId, updatedAt: now, rowVersion: { increment: 1 } },
        });
        if (count === 0) throw problem(409, 'publish-stale', 'The draft changed since you opened it');
      });
    } catch (error) {
      // Two publishes at once: the partial unique index lets only one win.
      if (isUniqueViolation(error)) throw problem(409, 'publish-stale', 'Another version was published at the same time');
      throw error;
    }
    return this.get(id);
  }

  /** The published version for the public pages, or `null` while nothing is published. */
  async current(): Promise<PublicLegal | null> {
    const row = await this.prisma.legalVersion.findFirst({ where: { status: 'published' } });
    if (!row) return null;
    return {
      version: versionOf(row.number), effective_date: row.effectiveDate === null ? null : dateString(row.effectiveDate),
      privacy: { vi: row.privacyVi, en: row.privacyEn }, terms: { vi: row.termsVi, en: row.termsEn },
    };
  }

  /** The version a learner records when accepting; `null` while nothing is published (Identity then uses TERMS_VERSION). */
  async currentTermsVersion(): Promise<string | null> {
    const row = await this.prisma.legalVersion.findFirst({ where: { status: 'published' }, select: { number: true } });
    return row ? versionOf(row.number) : null;
  }

  /** The write matched nothing: no such version (404), not a draft any more (409 `not-a-draft`), or out of date (409 `staleType`). */
  private async whyNotDraftWrite(id: string, staleType: string, staleTitle: string): Promise<ProblemDetailsException> {
    const row = await this.prisma.legalVersion.findUnique({ where: { id } });
    if (!row) return notFound();
    if (row.status !== 'draft') return notADraft();
    return problem(409, staleType, staleTitle);
  }

  private async actorsOf(rows: Row[]): Promise<Map<string, string>> {
    const ids = [...new Set(rows.flatMap((row) => (row.publishedBy === null ? [] : [row.publishedBy])))];
    return ids.length === 0 ? new Map() : this.identity.emailsOf(ids);
  }

  private summary(row: Row, actors: Map<string, string>): LegalVersionSummary {
    return {
      id: row.id, number: row.number, version: versionOf(row.number), status: row.status as Status, row_version: row.rowVersion,
      effective_date: row.effectiveDate === null ? null : dateString(row.effectiveDate),
      has_english: row.privacyEn !== null && row.termsEn !== null && row.privacyEn.trim() !== '' && row.termsEn.trim() !== '',
      updated_at: row.updatedAt.toISOString(), published_at: row.publishedAt?.toISOString() ?? null,
      published_by: row.publishedBy === null ? null : { id: row.publishedBy, email: actors.get(row.publishedBy) ?? null },
    };
  }

  private view(row: Row, actors: Map<string, string>): LegalVersionView {
    return { ...this.summary(row, actors), privacy_vi: row.privacyVi, terms_vi: row.termsVi, privacy_en: row.privacyEn, terms_en: row.termsEn };
  }
}
