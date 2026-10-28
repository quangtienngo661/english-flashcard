import { describe, expect, it, vi } from 'vitest';
import { FakeClock } from '../common/clock/clock.js';
import type { AiUsageView } from './api/ai-usage.js';
import { EntitlementsService } from './entitlements.service.js';
import type { UsageQueries } from './usage/usage.queries.js';

// 20/10/2026 12:00 in Vietnam.
const NOW = new Date('2026-10-20T05:00:00.000Z');
const TODAY: AiUsageView = {
  date: '2026-10-20', used: 2, confirmed: 2, reserved: 0, cap: 5, alert_percent: 75, alert_reached: false, enabled: true,
};

function setup(rows: Awaited<ReturnType<UsageQueries['aiDays']>>, refunds = 0) {
  const usage = { aiDays: vi.fn(async () => rows), aiCredits: vi.fn(async () => refunds) };
  const service = new EntitlementsService(
    {} as never, new FakeClock(NOW), {} as never, {} as never, {} as never, usage as unknown as UsageQueries, {} as never,
  );
  vi.spyOn(service, 'aiUsage').mockResolvedValue(TODAY);
  return { service, usage };
}

describe('EntitlementsService.aiUsageDays', () => {
  it('defaults to the 30 cap days ending today; the credits are counted from the first midnight to the one after the last day', async () => {
    const { service, usage } = setup({ pools: [], learners: [] });
    const view = await service.aiUsageDays({});
    expect(view).toMatchObject({ from: '2026-09-21', to: '2026-10-20', today: TODAY, refunds: 0, days_at_cap: 0 });
    expect(view.days).toHaveLength(30);
    expect(usage.aiDays).toHaveBeenCalledWith({}, '2026-09-21', '2026-10-20');
    expect(usage.aiCredits).toHaveBeenCalledWith({}, new Date('2026-09-20T17:00:00.000Z'), new Date('2026-10-20T17:00:00.000Z'));
  });

  it('every day is listed (zero without a row); both pools add up; a day at or over today’s cap counts in days_at_cap', async () => {
    const { service } = setup({
      pools: [
        { date: '2026-10-18', pool: 'ai_practice', used: 3 }, { date: '2026-10-18', pool: 'ai_lookup', used: 2 },
        { date: '2026-10-20', pool: 'ai_lookup', used: 4 },
      ],
      learners: [{ date: '2026-10-18', learners: 2 }, { date: '2026-10-20', learners: 1 }],
    }, 3);
    const view = await service.aiUsageDays({ from: '2026-10-18', to: '2026-10-20' });
    expect(view.days).toEqual([
      { date: '2026-10-18', ai_practice: 3, ai_lookup: 2, total: 5, learners: 2 },
      { date: '2026-10-19', ai_practice: 0, ai_lookup: 0, total: 0, learners: 0 },
      { date: '2026-10-20', ai_practice: 0, ai_lookup: 4, total: 4, learners: 1 },
    ]);
    expect(view).toMatchObject({ refunds: 3, days_at_cap: 1 });
  });

  it('a reversed range → 400', async () => {
    const { service, usage } = setup({ pools: [], learners: [] });
    await expect(service.aiUsageDays({ from: '2026-10-21', to: '2026-10-20' })).rejects.toMatchObject({ status: 400 });
    expect(usage.aiDays).not.toHaveBeenCalled();
  });
});
