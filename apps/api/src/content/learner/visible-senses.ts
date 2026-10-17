import { Prisma } from '../../generated/prisma/client.js';

/**
 * The one definition of "a learner can see this sense": a published, open catalog sense, or one of the viewer's own private
 * senses. Other modules (Learning) embed it in their own SQL so they never query Content tables themselves.
 */
export function visibleSenseCondition(senseIdColumn: Prisma.Sql, viewerId: string): Prisma.Sql {
  return Prisma.sql`EXISTS (
    SELECT 1 FROM senses vs JOIN entries ve ON ve.id = vs.entry_id
    WHERE vs.id = ${senseIdColumn} AND (
      (ve.scope = 'catalog' AND vs.state = 'open' AND vs.live_revision_id IS NOT NULL)
      OR (ve.scope = 'private' AND ve.owner_user_id = ${viewerId}::uuid)))`;
}
