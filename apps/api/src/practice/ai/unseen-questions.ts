// AI questions written but never asked (design §6.5 "Câu chưa từng hiện", D12): reused at no cost (B7E15).
import type { ContentService } from '../../content/index.js';
import type { Prisma, PracticeQuestion, PrismaClient } from '../../generated/prisma/client.js';
import type { QuestionType } from '../practice.types.js';

/**
 * Same learner and sense, a type the session chose, the same content as when it was made (`sense_revision_id`; a private
 * word also its `content_key`, B7E57, B7E58), no item yet; every distractor or wrong meaning still visible (B7E121).
 * Oldest first.
 */
export async function findUnseen(db: Prisma.TransactionClient | PrismaClient, content: Pick<ContentService, 'visibleSenseIds'>,
  args: { userId: string; senseId: string; types: QuestionType[]; liveRevisionId: string; contentKey: string | null }):
  Promise<PracticeQuestion[]> {
  if (args.types.length === 0) return [];
  const rows = await db.practiceQuestion.findMany({
    where: {
      userId: args.userId, senseId: args.senseId, source: 'ai', type: { in: args.types }, senseRevisionId: args.liveRevisionId,
      contentKey: args.contentKey, items: { none: {} },
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });
  const ids = [...new Set(rows.flatMap((row) => row.distractorSenseIds))];
  const visible = ids.length > 0 ? await content.visibleSenseIds(args.userId, ids, db) : new Set<string>();
  return rows.filter((row) => row.distractorSenseIds.every((id) => visible.has(id)));
}

/** The oldest one, so questions made ahead are used in the order they were paid for. */
export function pickUnseen(rows: PracticeQuestion[]): PracticeQuestion | null {
  return rows[0] ?? null;
}
