import { describe, expect, it, vi } from 'vitest';
import { UsageQueries } from './usage.queries.js';

const NOW = new Date('2026-10-20T05:00:00.000Z');
const A = '00000000-0000-4000-8000-000000000001';
const B = '00000000-0000-4000-8000-000000000002';

function setup(rows: unknown[] = []) {
  const calls: Array<{ sql: string; values: unknown[] }> = [];
  const db = {
    $queryRaw: vi.fn(async (statement: { sql: string; values: unknown[] }) => {
      calls.push({ sql: statement.sql.replace(/\s+/g, ' '), values: statement.values });
      return rows;
    }),
  };
  return { db, calls };
}

describe('UsageQueries.aiUsedMany', () => {
  it('no window: nothing is read', async () => {
    const { db } = setup();
    expect((await new UsageQueries().aiUsedMany(db as never, [], NOW)).size).toBe(0);
    expect(db.$queryRaw).not.toHaveBeenCalled();
  });

  it('one query for all learners: now (for the reservations), then their ids and cycle bounds as parallel arrays', async () => {
    const { db, calls } = setup();
    await new UsageQueries().aiUsedMany(db as never, [
      { userId: A, start: new Date('2026-10-01T00:00:00.000Z'), end: new Date('2026-11-01T00:00:00.000Z') },
      { userId: B, start: new Date('2026-10-15T08:00:00.000Z'), end: new Date('2026-11-15T08:00:00.000Z') },
    ], NOW);
    expect(db.$queryRaw).toHaveBeenCalledTimes(1);
    expect(calls[0].values).toEqual([
      NOW, [A, B], ['2026-10-01T00:00:00.000Z', '2026-10-15T08:00:00.000Z'], ['2026-11-01T00:00:00.000Z', '2026-11-15T08:00:00.000Z'],
    ]);
  });

  it('counts like aiUsed: confirmed uses and credits inside the cycle, unexpired reservations at any time, never below 0, both AI pools', async () => {
    const { db, calls } = setup();
    await new UsageQueries().aiUsedMany(db as never, [{ userId: A, start: NOW, end: NOW }], NOW);
    const { sql } = calls[0];
    expect(sql).toContain("u.kind = 'use' AND u.status = 'confirmed' AND u.confirmed_at >= w.starts_at AND u.confirmed_at < w.ends_at");
    expect(sql).toContain("u.kind = 'use' AND u.status = 'reserved' AND u.expires_at > ?");
    expect(sql).toContain("u.kind = 'credit' AND u.credited_at >= w.starts_at AND u.credited_at < w.ends_at");
    expect(sql).toContain('greatest(0,');
    expect(sql).toContain("u.pool IN ('ai_practice', 'ai_lookup')");
    expect(sql).toContain('GROUP BY w.user_id, u.pool');
  });

  it('gives each learner both pools; a pool without a row is 0', async () => {
    const { db } = setup([
      { user_id: A, pool: 'ai_practice', used: 12 }, { user_id: A, pool: 'ai_lookup', used: 3 }, { user_id: B, pool: 'ai_lookup', used: 7 },
    ]);
    const used = await new UsageQueries().aiUsedMany(db as never, [
      { userId: A, start: NOW, end: NOW }, { userId: B, start: NOW, end: NOW },
    ], NOW);
    expect(used.get(A)).toEqual({ ai_practice: 12, ai_lookup: 3 });
    expect(used.get(B)).toEqual({ ai_practice: 0, ai_lookup: 7 });
  });
});
