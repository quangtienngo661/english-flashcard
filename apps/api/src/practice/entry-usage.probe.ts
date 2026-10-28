import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { ContentService, type EntryUsageProbe, type EntryUsageReason, type EntryUsageScope } from '../content/index.js';
import type { Prisma } from '../generated/prisma/client.js';

/**
 * The part of "may this catalog entry be deleted" that reads Practice's tables. Every column that holds a sense id is checked:
 * the sessions' lists of senses, a question's own sense, its distractor senses and the revision an AI question was made from,
 * and the sense of an item, a report, an AI request and a word check. Run by Content in the delete transaction (see EntryUsageProbe).
 */
@Injectable()
export class PracticeEntryUsageProbe implements EntryUsageProbe, OnModuleInit {
  readonly module = 'practice' as const;

  constructor(@Inject(ContentService) private readonly content: ContentService) {}

  onModuleInit(): void {
    this.content.registerEntryUsageProbe(this);
  }

  async reasonsFor(tx: Prisma.TransactionClient, scope: EntryUsageScope): Promise<EntryUsageReason[]> {
    const { senseIds, revisionIds } = scope;
    if (senseIds.length === 0) return [];
    const select = { select: { id: true } } as const;
    const bySense = { where: { senseId: { in: senseIds } }, ...select };
    const questionOf = [
      { senseId: { in: senseIds } }, { distractorSenseIds: { hasSome: senseIds } },
      // An AI question remembers the revision it was made from.
      ...(revisionIds.length > 0 ? [{ senseRevisionId: { in: revisionIds } }] : []),
    ];
    const used = await tx.practiceSession.findFirst({ where: { OR: [{ senseIds: { hasSome: senseIds } }, { aiSenseIds: { hasSome: senseIds } }] }, ...select })
      ?? await tx.practiceQuestion.findFirst({ where: { OR: questionOf }, ...select })
      ?? await tx.practiceSessionItem.findFirst(bySense)
      ?? await tx.practiceReport.findFirst(bySense)
      ?? await tx.practiceAiRequest.findFirst(bySense)
      ?? await tx.practiceWordCheck.findFirst({ where: { senseId: { in: senseIds } }, select: { senseId: true } });
    return used ? ['learner-data'] : [];
  }
}
