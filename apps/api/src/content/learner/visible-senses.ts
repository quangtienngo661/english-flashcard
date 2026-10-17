import { Prisma } from '../../generated/prisma/client.js';

/**
 * The one definition of "a learner can see this sense": an open sense with a live revision that is in the catalog or is
 * one of the viewer's own private senses. Other modules (Learning) embed it in their own SQL so they never query Content
 * tables themselves. `viewer` is a user id, or a column holding one when a query covers several learners. Both the sense
 * id and the viewer are cast to uuid, so a value that is not a uuid is an error: every caller validates ids first.
 */
export function visibleSenseCondition(senseIdColumn: Prisma.Sql, viewer: string | Prisma.Sql): Prisma.Sql {
  const viewerId = typeof viewer === 'string' ? Prisma.sql`${viewer}::uuid` : viewer;
  return Prisma.sql`EXISTS (
    SELECT 1 FROM senses vs JOIN entries ve ON ve.id = vs.entry_id
    WHERE vs.id = ${senseIdColumn} AND vs.state = 'open' AND vs.live_revision_id IS NOT NULL
      AND (ve.scope = 'catalog' OR (ve.scope = 'private' AND ve.owner_user_id = ${viewerId})))`;
}
