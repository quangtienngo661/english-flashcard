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

/** `caps`: the value `valuesAt` answers for every instant (a number), or one per instant (an array, in the order asked). */
function setup(rows: Awaited<ReturnType<UsageQueries['aiDays']>>, refunds = 0, caps: number | number[] = 5, today: AiUsageView = TODAY) {
  const usage = { aiDays: vi.fn(async () => rows), aiCredits: vi.fn(async () => refunds) };
  const settings = { valuesAt: vi.fn(async (_key: string, instants: Date[]) => instants.map((_, index) => (Array.isArray(caps) ? caps[index] : caps))) };
  const service = new EntitlementsService(
    {} as never, new FakeClock(NOW), settings as never, {} as never, {} as never, usage as unknown as UsageQueries, {} as never,
  );
  vi.spyOn(service, 'aiUsage').mockResolvedValue(today);
  return { service, usage, settings };
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

  it('every day is listed (zero without a row); both pools add up; a day at or over its cap counts in days_at_cap', async () => {
    const { service } = setup({
      pools: [
        { date: '2026-10-18', pool: 'ai_practice', used: 3 }, { date: '2026-10-18', pool: 'ai_lookup', used: 2 },
        { date: '2026-10-20', pool: 'ai_lookup', used: 4 },
      ],
      learners: [{ date: '2026-10-18', learners: 2 }, { date: '2026-10-20', learners: 1 }],
    }, 3);
    const view = await service.aiUsageDays({ from: '2026-10-18', to: '2026-10-20' });
    expect(view.days).toEqual([
      { date: '2026-10-18', ai_practice: 3, ai_lookup: 2, total: 5, learners: 2, cap: 5, at_cap: true },
      { date: '2026-10-19', ai_practice: 0, ai_lookup: 0, total: 0, learners: 0, cap: 5, at_cap: false },
      { date: '2026-10-20', ai_practice: 0, ai_lookup: 4, total: 4, learners: 1, cap: 5, at_cap: false },
    ]);
    expect(view).toMatchObject({ refunds: 3, days_at_cap: 1 });
  });

  it('B44: each day is measured against its own cap, not today’s (caps 1000, 3, 7 for 18–20/10 with today’s cap 7: old rule 0 days, new rule 1)', async () => {
    const { service, settings } = setup({
      pools: [
        { date: '2026-10-18', pool: 'ai_practice', used: 4 },
        { date: '2026-10-19', pool: 'ai_lookup', used: 3 },
        { date: '2026-10-20', pool: 'ai_practice', used: 4 }, { date: '2026-10-20', pool: 'ai_lookup', used: 2 },
      ],
      learners: [],
    }, 0, [1000, 3, 7], { ...TODAY, cap: 7 });
    const view = await service.aiUsageDays({ from: '2026-10-18', to: '2026-10-20' });
    expect(view.days.map((day) => [day.date, day.total, day.cap, day.at_cap])).toEqual([
      ['2026-10-18', 4, 1000, false], ['2026-10-19', 3, 3, true], ['2026-10-20', 6, 7, false],
    ]);
    expect(view.days_at_cap).toBe(1);
    expect(settings.valuesAt).toHaveBeenCalledTimes(1);
    expect(settings.valuesAt).toHaveBeenCalledWith('entitlements.ai_daily_cap', [
      new Date('2026-10-18T17:00:00.000Z'), new Date('2026-10-19T17:00:00.000Z'), new Date('2026-10-20T17:00:00.000Z'),
    ]);
  });

  it('a day whose cap was 0 with 0 uses counts as at cap (AI was off all day; Review focus 3)', async () => {
    const { service } = setup({ pools: [], learners: [] }, 0, [0, 5], undefined);
    const view = await service.aiUsageDays({ from: '2026-10-19', to: '2026-10-20' });
    expect(view.days.map((day) => [day.total, day.cap, day.at_cap])).toEqual([[0, 0, true], [0, 5, false]]);
    expect(view.days_at_cap).toBe(1);
  });

  it('a reversed range → 400, nothing read', async () => {
    const { service, usage, settings } = setup({ pools: [], learners: [] });
    await expect(service.aiUsageDays({ from: '2026-10-21', to: '2026-10-20' })).rejects.toMatchObject({ status: 400 });
    expect(usage.aiDays).not.toHaveBeenCalled();
    expect(settings.valuesAt).not.toHaveBeenCalled();
  });
});
