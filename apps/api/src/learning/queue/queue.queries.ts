import { visibleSenseCondition } from '../../content/index.js';
import { Prisma } from '../../generated/prisma/client.js';
import { MAX_LEVEL } from '../learning.constants.js';

export type GroupStatsRow = {
  user_id: string; group_id: string; name: string; version: number; total: number; priority: number;
  due_available: number; new_available: number; backlog: number; cell_total: number[]; cell_due: number[];
  due_done: number; new_done: number;
};
export type QueueRow = { item_id: string; sense_id: string; level: number; due_date: Date; priority: boolean };
export type LearnerDay = { userId: string; today: string };

const levels = Array.from({ length: MAX_LEVEL + 1 }, (_, level) => level);

/**
 * Per-group counts for several (learner, local today) pairs in ONE statement (design 6.3): visible items only (B3E21),
 * backlog = level ≥ 1 and overdue by more than `backlogDays` (D22), and today's capped reviews per group from the log's
 * `section` (D35). The caps themselves are applied by the caller.
 */
export function groupStatsQuery(entries: LearnerDay[], backlogDays: number): Prisma.Sql {
  const notBacklog = Prisma.sql`NOT (level >= 1 AND today - due_date > ${backlogDays})`;
  const cellTotal = Prisma.join(levels.map((level) => Prisma.sql`count(*) FILTER (WHERE level = ${level})`));
  const cellDue = Prisma.join(levels.map((level) =>
    Prisma.sql`count(*) FILTER (WHERE level = ${level} AND due_date <= today AND ${notBacklog})`));
  return Prisma.sql`
    WITH e AS (
      SELECT * FROM unnest(${entries.map(({ userId }) => userId)}::uuid[], ${entries.map(({ today }) => today)}::date[])
        AS e(user_id, today)
    ), items AS (
      SELECT gi.group_id, i.level, i.due_date, i.priority, e.today
      FROM e
      JOIN learning_groups g ON g.user_id = e.user_id
      JOIN group_items gi ON gi.group_id = g.id
      JOIN learning_items i ON i.id = gi.item_id
      WHERE ${visibleSenseCondition(Prisma.sql`i.sense_id`, Prisma.sql`g.user_id`)}
    ), per_group AS (
      SELECT group_id,
        count(*)::int AS total,
        count(*) FILTER (WHERE priority)::int AS priority,
        count(*) FILTER (WHERE NOT priority AND level >= 1 AND due_date <= today AND ${notBacklog})::int AS due_available,
        count(*) FILTER (WHERE NOT priority AND level = 0)::int AS new_available,
        count(*) FILTER (WHERE NOT ${notBacklog})::int AS backlog,
        ARRAY[${cellTotal}]::int[] AS cell_total,
        ARRAY[${cellDue}]::int[] AS cell_due
      FROM items GROUP BY group_id
    ), done AS (
      SELECT l.group_id,
        count(*) FILTER (WHERE l.section = 'due')::int AS due_done,
        count(*) FILTER (WHERE l.section = 'new')::int AS new_done
      FROM e JOIN learning_log l ON l.user_id = e.user_id AND l.local_date = e.today
      WHERE l.kind = 'review' AND l.group_id IS NOT NULL
      GROUP BY l.group_id
    )
    SELECT g.user_id::text AS user_id, g.id::text AS group_id, g.name, g.version,
      COALESCE(p.total, 0) AS total, COALESCE(p.priority, 0) AS priority,
      COALESCE(p.due_available, 0) AS due_available, COALESCE(p.new_available, 0) AS new_available,
      COALESCE(p.backlog, 0) AS backlog,
      COALESCE(p.cell_total, ARRAY[0,0,0,0,0,0]) AS cell_total, COALESCE(p.cell_due, ARRAY[0,0,0,0,0,0]) AS cell_due,
      COALESCE(d.due_done, 0) AS due_done, COALESCE(d.new_done, 0) AS new_done
    FROM e
    JOIN learning_groups g ON g.user_id = e.user_id
    LEFT JOIN per_group p ON p.group_id = g.id
    LEFT JOIN done d ON d.group_id = g.id`;
}

type Section = { kind: 'priority' } | { kind: 'due'; limit: number } | { kind: 'new'; limit: number } | { kind: 'all' };

/** Visible items of one group for one queue section, in the order of design 6.2. */
export function queueItemsQuery(userId: string, groupId: string, today: string, backlogDays: number, section: Section): Prisma.Sql {
  const base = Prisma.sql`
    SELECT i.id::text AS item_id, i.sense_id::text AS sense_id, i.level, i.due_date, i.priority
    FROM group_items gi JOIN learning_items i ON i.id = gi.item_id
    WHERE gi.group_id = ${groupId}::uuid AND i.user_id = ${userId}::uuid
      AND ${visibleSenseCondition(Prisma.sql`i.sense_id`, userId)}`;
  switch (section.kind) {
    case 'priority':
      return Prisma.sql`${base} AND i.priority ORDER BY gi.added_at, i.id`;
    case 'due':
      return Prisma.sql`${base} AND NOT i.priority AND i.level >= 1 AND i.due_date <= ${today}::date
        AND ${today}::date - i.due_date <= ${backlogDays}
        ORDER BY i.due_date, i.level, gi.added_at, i.id LIMIT ${section.limit}`;
    case 'new':
      return Prisma.sql`${base} AND NOT i.priority AND i.level = 0 ORDER BY gi.added_at, i.id LIMIT ${section.limit}`;
    case 'all':
      return Prisma.sql`${base} ORDER BY random()`;
  }
}

export function reviewsDoneQuery(userId: string, groupId: string, today: string): Prisma.Sql {
  return Prisma.sql`
    SELECT count(*) FILTER (WHERE section = 'due')::int AS due_done, count(*) FILTER (WHERE section = 'new')::int AS new_done
    FROM learning_log
    WHERE user_id = ${userId}::uuid AND group_id = ${groupId}::uuid AND local_date = ${today}::date AND kind = 'review'`;
}
