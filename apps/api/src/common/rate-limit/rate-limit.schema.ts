import { integer, pgTable, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

export const rateLimitCounters = pgTable(
  'rate_limit_counters',
  {
    userId: uuid('user_id').notNull(),
    windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
    count: integer('count').notNull().default(0),
  },
  (t) => [unique().on(t.userId, t.windowStart)],
);
