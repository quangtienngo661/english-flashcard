import { Prisma } from '../../generated/prisma/client.js';

export type ReviewRowSql = {
  local_date: Date;
  item_id: string;
  sense_id: string;
  group_id: string | null;
  level_before: number | null;
  level_after: number | null;
  rating: 'Good' | 'Again' | null;
  at: Date;
};

/** The learner's `review` rows of `learning_log` with `local_date` in [from, to] (uses `(user_id, local_date)`). */
export function reviewRowsQuery(userId: string, from: string, to: string): Prisma.Sql {
  return Prisma.sql`
    SELECT local_date, item_id::text AS item_id, sense_id::text AS sense_id, group_id::text AS group_id,
      level_before, level_after, rating, at
    FROM learning_log
    WHERE user_id = ${userId}::uuid AND kind = 'review' AND local_date BETWEEN ${from}::date AND ${to}::date
    ORDER BY at, id`;
}
