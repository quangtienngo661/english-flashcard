import { describe, expect, it, vi } from 'vitest';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import type { LearningService } from '../../learning/index.js';
import { PracticeStats } from './practice-stats.js';

const USER = '00000000-0000-4000-8000-000000000001';

/** The SQL a `$queryRaw` tagged template was called with, nested `Prisma.sql` pieces included, and the values bound to it. */
function capture() {
  const calls: Array<{ sql: string; values: unknown[] }> = [];
  const prisma = {
    $queryRaw: vi.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const flat = Prisma.sql(strings, ...values);
      calls.push({ sql: flat.sql.replace(/\s+/g, ' '), values: flat.values });
      return [];
    }),
  };
  return { calls, stats: new PracticeStats(prisma as unknown as PrismaClient, {} as LearningService) };
}

describe('PracticeStats.statsFor — an alternative answer counts for the typed word (session synonyms design §4.1)', () => {
  it('an alternative item counts for the typed word only; none credited counts for nobody', async () => {
    const { calls, stats } = capture();
    await stats.statsFor(USER);
    const { sql } = calls[0];
    expect(sql).toContain('CASE WHEN i.alternative THEN i.alternative_sense_id ELSE i.sense_id END AS sense_id');
    // The credited sense is what every later step groups on; an alternative that credits nobody has none, so it is left out.
    expect(sql).toMatch(/WHERE sense_id IS NOT NULL/);
    expect(sql).not.toMatch(/GROUP BY i\.sense_id/);
  });

  it('the senseIds filter applies to the credited sense, with a looser pre-filter that keeps the indexes usable', async () => {
    const { calls, stats } = capture();
    await stats.statsFor(USER, ['s-1', 's-2']);
    const { sql, values } = calls[0];
    expect(sql).toContain('AND sense_id = ANY(');
    expect(sql).toContain('(i.sense_id = ANY(');
    expect(sql).toContain('OR i.alternative_sense_id = ANY(');
    expect(values.filter((value) => Array.isArray(value) && value.join() === 's-1,s-2')).toHaveLength(3);
  });

  it('with no senseIds there is no sense filter at all', async () => {
    const { calls, stats } = capture();
    await stats.statsFor(USER);
    expect(calls[0].sql).not.toContain('ANY(');
  });
});
