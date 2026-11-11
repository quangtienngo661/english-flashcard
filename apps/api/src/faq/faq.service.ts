import { Inject, Injectable } from '@nestjs/common';
import { Clock } from '../common/clock/clock.js';
import { PRISMA_CLIENT } from '../common/db/prisma.module.js';
import { ProblemDetailsException } from '../common/problem-details/problem-details.exception.js';
import type { PrismaClient } from '../generated/prisma/client.js';
import { IdentityService } from '../identity/profile/identity.service.js';
import type { CreateFaqBody, UpdateFaqBody } from './faq.schemas.js';

export type PublicFaqItem = { question: string; answer: string };
export type AdminFaqItem = {
  id: string; position: number; question: string; answer: string; published: boolean; row_version: number;
  updated_at: string; updated_by: { id: string; email: string | null } | null;
};

type Row = {
  id: string; position: number; question: string; answer: string; published: boolean; rowVersion: number;
  updatedBy: string | null; updatedAt: Date;
};

const problem = (status: number, type: string, title: string) => new ProblemDetailsException({ status, type, title });
const notFound = () => problem(404, 'not-found', 'Not found');

/** Home page order: `position`, then creation time; `id` only keeps ties of the same instant stable. */
const order = () => [{ position: 'asc' as const }, { createdAt: 'asc' as const }, { id: 'asc' as const }];

/** The home page FAQ (giao diện mới §10.7): an ordered list of plain-text items, edited by an admin. */
@Injectable()
export class FaqService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(Clock) private readonly clock: Clock,
  ) {}

  /** What the home page shows: published items only, no ids or authors. */
  async published(): Promise<PublicFaqItem[]> {
    const rows = await this.prisma.landingFaqItem.findMany({ where: { published: true }, orderBy: order() });
    return rows.map((row) => ({ question: row.question, answer: row.answer }));
  }

  async list(): Promise<{ items: AdminFaqItem[] }> {
    const rows = await this.prisma.landingFaqItem.findMany({ orderBy: order() });
    const emails = await this.emailsOf(rows);
    return { items: rows.map((row) => this.view(row, emails)) };
  }

  async create(actorId: string, body: CreateFaqBody): Promise<AdminFaqItem> {
    const now = this.clock.now();
    const row = await this.prisma.landingFaqItem.create({
      data: {
        position: body.position, question: body.question, answer: body.answer, published: body.published ?? false,
        createdBy: actorId, createdAt: now, updatedBy: actorId, updatedAt: now,
      },
    });
    return this.view(row, await this.emailsOf([row]));
  }

  /** Optimistic lock: the write matches only the version the admin opened; otherwise 404 or 409 `faq-version-conflict`. */
  async update(id: string, actorId: string, body: UpdateFaqBody): Promise<AdminFaqItem> {
    const { expected_version: expectedVersion, ...fields } = body;
    const { count } = await this.prisma.landingFaqItem.updateMany({
      where: { id, rowVersion: expectedVersion },
      data: { ...fields, rowVersion: { increment: 1 }, updatedBy: actorId, updatedAt: this.clock.now() },
    });
    const row = await this.prisma.landingFaqItem.findUnique({ where: { id } });
    if (!row) throw notFound();
    if (count === 0) throw problem(409, 'faq-version-conflict', 'The item changed since you opened it');
    return this.view(row, await this.emailsOf([row]));
  }

  async remove(id: string): Promise<void> {
    const { count } = await this.prisma.landingFaqItem.deleteMany({ where: { id } });
    if (count === 0) throw notFound();
  }

  private async emailsOf(rows: Row[]): Promise<Map<string, string>> {
    const ids = [...new Set(rows.flatMap((row) => (row.updatedBy === null ? [] : [row.updatedBy])))];
    return ids.length === 0 ? new Map() : this.identity.emailsOf(ids);
  }

  private view(row: Row, emails: Map<string, string>): AdminFaqItem {
    return {
      id: row.id, position: row.position, question: row.question, answer: row.answer, published: row.published,
      row_version: row.rowVersion, updated_at: row.updatedAt.toISOString(),
      updated_by: row.updatedBy === null ? null : { id: row.updatedBy, email: emails.get(row.updatedBy) ?? null },
    };
  }
}
