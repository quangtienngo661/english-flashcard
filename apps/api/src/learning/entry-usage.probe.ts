import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { ContentService, type EntryUsageProbe, type EntryUsageReason, type EntryUsageScope } from '../content/index.js';
import type { Prisma } from '../generated/prisma/client.js';

/**
 * The part of "may this catalog entry be deleted" that reads Learning's tables: a schedule item or a log line that holds one of
 * its senses is a learner's data. Run by Content in the delete transaction (see EntryUsageProbe).
 */
@Injectable()
export class LearningEntryUsageProbe implements EntryUsageProbe, OnModuleInit {
  readonly module = 'learning' as const;

  constructor(@Inject(ContentService) private readonly content: ContentService) {}

  onModuleInit(): void {
    this.content.registerEntryUsageProbe(this);
  }

  async reasonsFor(tx: Prisma.TransactionClient, scope: EntryUsageScope): Promise<EntryUsageReason[]> {
    if (scope.senseIds.length === 0) return [];
    const where = { senseId: { in: scope.senseIds } };
    // The log outlives its item (D33), so it is checked on its own.
    const used = await tx.learningItem.findFirst({ where, select: { id: true } })
      ?? await tx.learningLogEntry.findFirst({ where, select: { id: true } });
    return used ? ['learner-data'] : [];
  }
}
