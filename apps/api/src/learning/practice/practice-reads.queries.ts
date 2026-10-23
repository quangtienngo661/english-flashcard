import { visibleSenseCondition } from '../../content/index.js';
import { Prisma } from '../../generated/prisma/client.js';

export type PracticeItemRow = {
  item_id: string; sense_id: string; level: number; due_date: Date; priority: boolean; added_at: Date;
  last_needs_review_at: Date | null;
};
export type GroupFilter = 'all' | 'due' | 'priority' | 0 | 1 | 2 | 3 | 4 | 5;
/** Which items to read, as SQL conditions on `learning_items i` (plus `ids` from `todayIdsQuery`). */
export type ItemsWhere =
  | { kind: 'all' } | { kind: 'priority' } | { kind: 'level'; groupId: string; level: number } | { kind: 'group'; groupId: string }
  | { kind: 'group-priority'; groupId: string } | { kind: 'senses'; senseIds: string[] } | { kind: 'today'; groupId: string | null };
export type Caps = { reviews: number | null; new: number };

const visible = (userId: string) => visibleSenseCondition(Prisma.sql`i.sense_id`, userId);
const notBacklog = (today: string, backlogDays: number) =>
  Prisma.sql`NOT (i.level >= 1 AND ${today}::date - i.due_date > ${backlogDays})`;
const inGroup = (groupId: string) =>
  Prisma.sql`EXISTS (SELECT 1 FROM group_items gx WHERE gx.item_id = i.id AND gx.group_id = ${groupId}::uuid)`;

/**
 * The flashcard list of today (design Bước 3 6.2) of every group of the learner, or of one group, as item ids in ONE
 * statement: each group's priority part, then its due part (oldest due, lower level, earliest added) within the reviews left
 * under the cap, then its new part (earliest added) within the new words left; the caps left are counted from today's log rows
 * that carry the group (practice rows have none, D35). A `null` reviews cap means no limit on the due part.
 */
function todayIdsQuery(userId: string, groupId: string | null, today: string, backlogDays: number, caps: Caps): Prisma.Sql {
  const oneGroup = groupId === null ? Prisma.empty : Prisma.sql`AND g.id = ${groupId}::uuid`;
  return Prisma.sql`
    WITH left_today AS (
      SELECT g.id AS group_id,
        CASE WHEN ${caps.reviews}::int IS NULL THEN NULL
          ELSE GREATEST(0, ${caps.reviews}::int - COALESCE(d.due_done, 0)) END AS due_left,
        GREATEST(0, ${caps.new}::int - COALESCE(d.new_done, 0)) AS new_left
      FROM learning_groups g
      LEFT JOIN (
        SELECT l.group_id, count(*) FILTER (WHERE l.section = 'due')::int AS due_done,
          count(*) FILTER (WHERE l.section = 'new')::int AS new_done
        FROM learning_log l
        WHERE l.user_id = ${userId}::uuid AND l.local_date = ${today}::date AND l.kind = 'review' AND l.group_id IS NOT NULL
        GROUP BY l.group_id
      ) d ON d.group_id = g.id
      WHERE g.user_id = ${userId}::uuid ${oneGroup}
    ), parts AS (
      SELECT c.group_id, c.due_left, c.new_left, i.id,
        CASE
          WHEN i.priority AND ${notBacklog(today, backlogDays)} THEN 'priority'
          WHEN NOT i.priority AND i.level >= 1 AND i.due_date <= ${today}::date AND ${notBacklog(today, backlogDays)} THEN 'due'
          WHEN NOT i.priority AND i.level = 0 THEN 'new'
        END AS part,
        i.due_date, i.level, gi.added_at
      FROM left_today c
      JOIN group_items gi ON gi.group_id = c.group_id
      JOIN learning_items i ON i.id = gi.item_id
      WHERE i.user_id = ${userId}::uuid AND ${visible(userId)}
    ), ranked AS (
      SELECT id, part, due_left, new_left,
        ROW_NUMBER() OVER (PARTITION BY group_id, part ORDER BY due_date, level, added_at, id) AS due_rank,
        ROW_NUMBER() OVER (PARTITION BY group_id, part ORDER BY added_at, id) AS new_rank
      FROM parts WHERE part IS NOT NULL
    )
    SELECT DISTINCT id FROM ranked
    WHERE part = 'priority' OR (part = 'due' AND (due_left IS NULL OR due_rank <= due_left))
      OR (part = 'new' AND new_rank <= new_left)`;
}

/** Visible items of the learner chosen by `where`, one row each, with the earliest group link and the newest "Cần ôn tập". */
export function practiceItemsQuery(
  userId: string, where: ItemsWhere, today: string, backlogDays: number, caps: Caps,
): Prisma.Sql {
  let condition: Prisma.Sql;
  switch (where.kind) {
    case 'all': condition = Prisma.empty; break;
    case 'priority': condition = Prisma.sql`AND i.priority AND ${notBacklog(today, backlogDays)}`; break;
    case 'group': condition = Prisma.sql`AND ${inGroup(where.groupId)}`; break;
    case 'group-priority':
      condition = Prisma.sql`AND ${inGroup(where.groupId)} AND i.priority AND ${notBacklog(today, backlogDays)}`;
      break;
    case 'level': condition = Prisma.sql`AND ${inGroup(where.groupId)} AND i.level = ${where.level}`; break;
    case 'senses': condition = Prisma.sql`AND i.sense_id = ANY(${where.senseIds}::uuid[])`; break;
    case 'today':
      condition = Prisma.sql`AND i.id IN (${todayIdsQuery(userId, where.groupId, today, backlogDays, caps)})`;
      break;
  }
  return Prisma.sql`${itemRows(userId)} AND ${visible(userId)} ${condition} ORDER BY i.id`;
}

/** The learner's item of one sense, visible or not ("still in learning"). */
export function practiceItemOfSenseQuery(userId: string, senseId: string): Prisma.Sql {
  return Prisma.sql`${itemRows(userId)} AND i.sense_id = ${senseId}::uuid`;
}

function itemRows(userId: string): Prisma.Sql {
  return Prisma.sql`
    SELECT i.id::text AS item_id, i.sense_id::text AS sense_id, i.level, i.due_date, i.priority,
      COALESCE((SELECT min(gi.added_at) FROM group_items gi WHERE gi.item_id = i.id), i.created_at) AS added_at,
      (SELECT max(l.at) FROM learning_log l
        WHERE l.user_id = i.user_id AND l.item_id = i.id AND l.kind = 'review' AND l.answer = 'review') AS last_needs_review_at
    FROM learning_items i
    WHERE i.user_id = ${userId}::uuid`;
}

/** API (b): the learner's groups holding each given sense (visible senses only); senses in no group have no row. */
export function groupsOfSensesQuery(userId: string, senseIds: string[]): Prisma.Sql {
  return Prisma.sql`
    SELECT i.sense_id::text AS sense_id, g.id::text AS group_id, g.name
    FROM learning_items i
    JOIN group_items gi ON gi.item_id = i.id
    JOIN learning_groups g ON g.id = gi.group_id AND g.user_id = i.user_id
    WHERE i.user_id = ${userId}::uuid AND i.sense_id = ANY(${senseIds}::uuid[]) AND ${visible(userId)}
    ORDER BY i.sense_id, g.name, g.id`;
}

/**
 * For each given sense: the visible senses of every item sharing a group with the learner's item of that sense, without the
 * sense itself (design 7.4, R6). Senses with no mates have no row.
 */
export function groupMatesQuery(userId: string, senseIds: string[]): Prisma.Sql {
  return Prisma.sql`
    SELECT q.sense_id::text AS sense_id, array_agg(DISTINCT i.sense_id::text ORDER BY i.sense_id::text) AS mates
    FROM learning_items q
    JOIN group_items qg ON qg.item_id = q.id
    JOIN group_items mg ON mg.group_id = qg.group_id AND mg.item_id <> q.id
    JOIN learning_items i ON i.id = mg.item_id AND i.user_id = q.user_id
    WHERE q.user_id = ${userId}::uuid AND q.sense_id = ANY(${senseIds}::uuid[]) AND ${visible(userId)}
    GROUP BY q.sense_id`;
}
