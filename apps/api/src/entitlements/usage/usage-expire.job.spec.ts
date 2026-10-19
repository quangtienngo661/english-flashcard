import { describe, expect, it, vi } from 'vitest';
import { UsageExpireJob } from './usage-expire.job.js';

describe('UsageExpireJob', () => {
  it('B5E5: registers entitlements-usage-expire, whose statement releases only reserved rows past expires_at', async () => {
    const statements: Array<{ sql: string; values: unknown[] }> = [];
    const prisma = {
      $executeRaw: vi.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
        statements.push({ sql: strings.join('?').replace(/\s+/g, ' ').trim(), values });
        return 4;
      }),
    };
    const jobs = new Map<string, (now: Date) => Promise<unknown>>();
    const scheduler = { register: (name: string, job: (now: Date) => Promise<unknown>) => jobs.set(name, job) };
    new UsageExpireJob(prisma as never, scheduler as never).onModuleInit();

    const now = new Date('2026-11-10T05:00:00Z');
    expect(await jobs.get('entitlements-usage-expire')?.(now)).toBe(4);
    expect(statements).toEqual([{
      sql: "UPDATE usage_records SET status = 'released', release_reason = 'expired', released_at = ? "
        + "WHERE kind = 'use' AND status = 'reserved' AND expires_at <= ?",
      values: [now, now],
    }]);
  });
});
