import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { EntriesService } from './entries.service.js';
import { ENTRY_USAGE_REASONS, EntryUsageRegistry, type EntryUsageReason, type EntryUsageScope } from './entry-usage.js';

const transactionOptions = { timeout: 10_000, maxWait: 5_000 };

type SenseState = { state: string; liveRevisionId: string | null; revisions: ReadonlyArray<{ status: string; publishedAt: Date | null }> };

/**
 * Publication leaves a trace that nothing clears: the live pointer and every revision's published_at (unpublish and retire
 * keep both). An unpublished sense counts as published even with no trace left, since only a published sense gets there.
 */
function everPublished(sense: SenseState): boolean {
  return sense.liveRevisionId !== null || sense.state === 'unpublished'
    || sense.revisions.some((revision) => revision.status === 'published' || revision.publishedAt !== null);
}

function notFound(): ProblemDetailsException {
  return new ProblemDetailsException({ status: 404, title: 'Not found', type: 'not-found' });
}

function entryInUse(reasons: ReadonlySet<EntryUsageReason>): ProblemDetailsException {
  return new ProblemDetailsException({
    status: 409, title: 'Entry in use', type: 'entry-in-use',
    extensions: { reasons: ENTRY_USAGE_REASONS.filter((reason) => reasons.has(reason)) },
  });
}

/**
 * Deletes a catalog entry nothing uses (fail closed): no sense was ever published, nothing else refers to it, no upload or
 * publish job is working on it. The check and the delete are one transaction under the entry key lock and a row lock, so a
 * publish or a new form-of link cannot slip in between; a refusal changes nothing.
 */
@Injectable()
export class EntryDeleteService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(EntriesService) private readonly entries: EntriesService,
    @Inject(EntryUsageRegistry) private readonly usage: EntryUsageRegistry,
  ) {}

  async deleteEntry(entryId: string): Promise<void> {
    // Only the immutable key is read outside the transaction; everything mutable is read again after the locks.
    const key = await this.prisma.entry.findFirst({ where: { id: entryId, scope: 'catalog' }, select: { lemma: true, pos: true } });
    if (!key) throw notFound();
    await this.prisma.$transaction(async (tx) => {
      await this.entries.lockEntryKey(tx, key.lemma, key.pos);
      // The row lock also holds back a new form-of link to this entry (its foreign key takes a key-share lock).
      const locked = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM entries WHERE id = ${entryId}::uuid AND scope = 'catalog' FOR UPDATE`;
      if (locked.length === 0) throw notFound();

      const senses = await tx.sense.findMany({
        where: { entryId }, orderBy: { id: 'asc' },
        select: { id: true, state: true, liveRevisionId: true, replacesSenseId: true,
          revisions: { select: { id: true, status: true, publishedAt: true }, orderBy: { id: 'asc' } } },
      });
      const scope: EntryUsageScope = {
        entryId, lemma: key.lemma, pos: key.pos,
        senseIds: senses.map(({ id }) => id), revisionIds: senses.flatMap(({ revisions }) => revisions.map(({ id }) => id)),
        variantIds: (await tx.entryVariant.findMany({ where: { entryId }, select: { id: true }, orderBy: { id: 'asc' } })).map(({ id }) => id),
        levelIds: (await tx.entryLevel.findMany({ where: { entryId }, select: { id: true }, orderBy: { id: 'asc' } })).map(({ id }) => id),
      };

      const reasons = new Set<EntryUsageReason>();
      if (senses.some(everPublished)) reasons.add('published-sense');
      if (await tx.senseRevision.findFirst({ where: { formOfEntryId: entryId, sense: { entryId: { not: entryId } } }, select: { id: true } })) {
        reasons.add('form-of-link');
      }
      if (scope.senseIds.length > 0
        && await tx.contextSentence.findFirst({ where: { senseId: { in: scope.senseIds } }, select: { id: true } })) {
        reasons.add('learner-data');
      }
      // Every probe runs, so the answer lists all that apply; a missing or failing probe throws and nothing is deleted.
      for (const probe of this.usage.all()) for (const reason of await probe.reasonsFor(tx, scope)) reasons.add(reason);
      if (reasons.size > 0) throw entryInUse(reasons);

      // The schema cascades revisions, texts, sentences, variants, levels and inflections. A replacement points at the sense it
      // replaces with RESTRICT, so senses go leaf first.
      let rest = senses.map(({ id, replacesSenseId }) => ({ id, replacesSenseId }));
      while (rest.length > 0) {
        const replaced = new Set(rest.map(({ replacesSenseId }) => replacesSenseId));
        const leaves = rest.filter(({ id }) => !replaced.has(id)).map(({ id }) => id);
        if (leaves.length === 0) throw new Error('Senses replace each other in a cycle');
        await tx.sense.deleteMany({ where: { id: { in: leaves }, entryId } });
        rest = rest.filter(({ id }) => !leaves.includes(id));
      }
      const removed = await tx.entry.deleteMany({ where: { id: entryId, scope: 'catalog' } });
      if (removed.count !== 1) throw new Error('Entry delete matched no row');
    }, transactionOptions);
  }
}
