import { Body, Controller, HttpCode, Inject, Param, Post, Put } from '@nestjs/common';
import { z } from 'zod';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator.js';
import { CurrentUser } from '../../common/request-user/current-user.decorator.js';
import type { RequestUser } from '../../common/request-user/request-user.js';
import type { Prisma, PrismaClient } from '../../generated/prisma/client.js';
import { RequirePermission } from '../../identity/staff/require-permission.decorator.js';
import { normalizeLemma, normalizeText } from '../catalog/normalize.js';
import { VALID_POS } from '../content.constants.js';
import { ContentService } from '../content.service.js';
import { cell, contentSchema, toContent } from './content-body.js';
import { ContentRuleError } from './revision-content.js';

const createSchema = z.strictObject({
  entry_id: z.uuid(), context_label: cell.nullable().optional(), content: contentSchema.optional(), replaces_sense_id: z.uuid().optional(),
});
const senseParamsSchema = z.strictObject({ id: z.uuid() });
const draftSchema = z.strictObject({ revision: z.number().int().positive(), content: contentSchema });
const reviewSchema = z.strictObject({ items: z.array(z.strictObject({
  sense_id: z.uuid(), revision: z.number().int().positive(), action: z.enum(['reviewed', 'rejected']),
})).max(500) });
const batchSchema = z.strictObject({ lines: z.array(z.string()).max(500) });
const transactionOptions = { timeout: 10_000, maxWait: 5_000 };
type BatchResult = { line: number; status: 'created' | 'exists' | 'invalid'; entry_id?: string; sense_id?: string; warnings: string[] };

async function problemDetails<T>(write: () => Promise<T>): Promise<T> {
  try { return await write(); } catch (error) {
    if (!(error instanceof ContentRuleError)) throw error;
    throw new ProblemDetailsException({
      status: error.code === 'stale-revision' ? 409 : error.code === 'not-found' ? 404 : 400,
      title: error.code, type: error.code,
    });
  }
}

async function writeEntry<T>(
  prisma: PrismaClient, content: ContentService, entryId: string, write: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  const entry = await prisma.entry.findUnique({ where: { id: entryId }, select: { lemma: true, pos: true } });
  if (!entry) throw new ContentRuleError('not-found');
  return prisma.$transaction(async (tx) => {
    await content.lockEntryKey(tx, entry.lemma, entry.pos);
    return write(tx);
  }, transactionOptions);
}

async function writeSense<T>(
  prisma: PrismaClient, content: ContentService, senseId: string, write: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  const sense = await prisma.sense.findUnique({ where: { id: senseId }, select: { entryId: true } });
  if (!sense) throw new ContentRuleError('not-found');
  return writeEntry(prisma, content, sense.entryId, write);
}

@Controller('admin/content/senses')
@RequirePermission('content.edit')
export class AdminSensesController {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(ContentService) private readonly content: ContentService,
  ) {}

  @Post()
  @RateLimit('user.write')
  create(@Body({ schema: createSchema }) body: z.infer<typeof createSchema>, @CurrentUser() actor: RequestUser) {
    return problemDetails(() => writeEntry(this.prisma, this.content, body.entry_id, async (tx) => {
      const result = await this.content.createSense(tx, {
        entryId: body.entry_id, contextLabel: body.context_label ?? null,
        content: body.content === undefined ? undefined : toContent(body.content),
        replacesSenseId: body.replaces_sense_id, source: 'ui', actorId: actor.userId,
      });
      return { sense_id: result.senseId, revision_id: result.revisionId, revision: 1 };
    }));
  }

  @Put(':id/draft')
  @HttpCode(200)
  @RateLimit('user.write')
  save(
    @Param({ schema: senseParamsSchema }) params: z.infer<typeof senseParamsSchema>,
    @Body({ schema: draftSchema }) body: z.infer<typeof draftSchema>, @CurrentUser() actor: RequestUser,
  ) {
    return problemDetails(() => writeSense(this.prisma, this.content, params.id, async (tx) => {
      const result = await this.content.saveDraft(tx, {
        senseId: params.id, baseRevision: body.revision, content: toContent(body.content), source: 'ui', actorId: actor.userId,
      });
      return { sense_id: params.id, revision: result.revisionNo, dropped_topics: result.droppedTopics };
    }));
  }

  @Post('review')
  @HttpCode(200)
  @RateLimit('user.write')
  async review(@Body({ schema: reviewSchema }) body: z.infer<typeof reviewSchema>) {
    const items: Array<{ sense_id: string; ok: boolean; reason?: string }> = [];
    // One transaction per item keeps independent outcomes and never locks two entry keys together.
    for (const item of body.items) {
      try {
        const [result] = await writeSense(this.prisma, this.content, item.sense_id, (tx) => this.content.markRevisions(tx, [{
          senseId: item.sense_id, revision: item.revision, action: item.action,
        }]));
        items.push({ sense_id: result.senseId, ok: result.ok, ...(result.reason ? { reason: result.reason } : {}) });
      } catch (error) {
        if (!(error instanceof ContentRuleError)) throw error;
        items.push({ sense_id: item.sense_id, ok: false, reason: error.code });
      }
    }
    return { items };
  }
}

@Controller('admin/content/entries')
@RequirePermission('content.edit')
export class BatchEntriesController {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(ContentService) private readonly content: ContentService,
  ) {}

  @Post('batch')
  @RateLimit('user.write')
  async createBatch(@Body({ schema: batchSchema }) body: z.infer<typeof batchSchema>, @CurrentUser() actor: RequestUser) {
    const items: BatchResult[] = [];
    for (const [index, line] of body.lines.entries()) {
      const parts = line.split(',');
      const lemma = normalizeLemma(parts[0] ?? '');
      const pos = normalizeText(parts[1] ?? '').toLowerCase();
      if (parts.length !== 2 || !lemma || lemma.includes('\0') || [...lemma].length > 100 || !VALID_POS.some((value) => value === pos)) {
        items.push({ line: index + 1, status: 'invalid', warnings: ['Expected lemma,pos with a non-empty lemma of at most 100 characters and a valid part of speech.'] });
        continue;
      }
      const result = await this.prisma.$transaction(async (tx): Promise<BatchResult> => {
        await this.content.lockEntryKey(tx, lemma, pos);
        const { entry } = await this.content.ensureEntry(tx, { lemma, pos, variants: [] });
        const caseMatches = await tx.entry.findMany({ where: { language: 'en', lemma: { equals: lemma, mode: 'insensitive' } },
          select: { lemma: true }, orderBy: [{ lemma: 'asc' }, { id: 'asc' }] });
        // Insensitive equality uses ILIKE; filter its wildcard candidates to actual case-only matches.
        const warnings = [...new Set(caseMatches.map(({ lemma: other }) => other)
          .filter((other) => other !== lemma && other.toLowerCase() === lemma.toLowerCase()))]
          .map((other) => `Lemma differs only by letter case from "${other}".`);
        const existing = await tx.sense.findFirst({ where: {
          entryId: entry.id, state: { not: 'retired' }, OR: [{ replacesSenseId: null }, { liveRevisionId: { not: null } }],
        }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], select: { id: true } });
        if (existing) return { line: index + 1, status: 'exists', entry_id: entry.id, sense_id: existing.id, warnings };
        const sense = await this.content.createSense(tx, { entryId: entry.id, contextLabel: null, source: 'ui', actorId: actor.userId });
        return { line: index + 1, status: 'created', entry_id: entry.id, sense_id: sense.senseId, warnings };
      }, transactionOptions);
      items.push(result);
    }
    return { items };
  }
}
