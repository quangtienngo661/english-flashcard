import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { deleteOldMailBudgetBuckets, MAIL_BUDGET_RETENTION_DAYS } from './mail-budget-cleanup.js';

const NOW = new Date('2026-11-10T03:00:00.000Z');

// A bucket key is `<MAIL_BUDGET_KEY>:<UTC day>` (mail-budget.service.ts). The fake keeps rows and applies the SQL's rule.
function setup(buckets: string[]) {
  let rows = [...buckets];
  const executeRaw = vi.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
    const sql = strings.join('?').replace(/\s+/g, ' ');
    expect(sql).toContain('DELETE FROM mail_budget_buckets');
    const cutoff = values[0] as string; // YYYY-MM-DD: days before it go
    const before = rows.length;
    rows = rows.filter((bucket) => !(/[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(bucket) && bucket.slice(-10) < cutoff));
    return before - rows.length;
  });
  return { prisma: { $executeRaw: executeRaw } as unknown as PrismaClient, rows: () => rows, executeRaw };
}

describe('deleteOldMailBudgetBuckets (B1-5, LA2#7)', () => {
  it('keeps seven days, and deletes the day before the cutoff and older, whatever the budget key', async () => {
    expect(MAIL_BUDGET_RETENTION_DAYS).toBe(7);
    const { prisma, rows } = setup([
      'global:2026-11-10', 'global:2026-11-03', 'global:2026-11-02', 'global:2026-10-01', 'a:b:2026-10-20', 'ci-key:2026-11-09',
    ]);
    expect(await deleteOldMailBudgetBuckets(prisma, NOW)).toBe(3);
    expect(rows()).toEqual(['global:2026-11-10', 'global:2026-11-03', 'ci-key:2026-11-09']);
  });

  it('leaves a key that does not end in a date alone and returns 0 when nothing is old', async () => {
    const { prisma, rows } = setup(['legacy-bucket', 'global:2026-11-09']);
    expect(await deleteOldMailBudgetBuckets(prisma, NOW)).toBe(0);
    expect(rows()).toEqual(['legacy-bucket', 'global:2026-11-09']);
  });
});
