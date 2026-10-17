import { describe, expect, it } from 'vitest';
import { SETTINGS_DEFAULTS } from '../../settings/index.js';
import { eligibility, type EligibilityInput } from './eligibility.js';

const HCM = 'Asia/Ho_Chi_Minh';
// 20:30 in Ho Chi Minh (UTC+7) on 2026-10-17.
const evening = new Date('2026-10-17T13:30:00Z');
const daysAgo = (days: number, at = evening) => new Date(at.getTime() - days * 86_400_000);

function input(overrides: Partial<EligibilityInput> = {}): EligibilityInput {
  return {
    now: evening, timezone: HCM, createdAt: daysAgo(100), lastSeenAt: daysAgo(1),
    settings: SETTINGS_DEFAULTS.reminders, sentDates: [], ...overrides,
  };
}

describe('reminder eligibility (design 8.2, D26, D44)', () => {
  it('tiers: 6 days absent → regular, 7 and 60 → inactive, 61 → stopped', () => {
    expect(eligibility(input({ lastSeenAt: daysAgo(6) }))).toEqual({ kind: 'regular', today: '2026-10-17' });
    expect(eligibility(input({ lastSeenAt: daysAgo(7) }))).toEqual({ kind: 'inactive', today: '2026-10-17' });
    expect(eligibility(input({ lastSeenAt: daysAgo(60) }))).toEqual({ kind: 'inactive', today: '2026-10-17' });
    expect(eligibility(input({ lastSeenAt: daysAgo(61) }))).toEqual({ skip: 'stopped' });
  });

  it('absence falls back to createdAt for a learner who never refreshed a session', () => {
    expect(eligibility(input({ lastSeenAt: null, createdAt: daysAgo(3) }))).toEqual({ kind: 'regular', today: '2026-10-17' });
    expect(eligibility(input({ lastSeenAt: null, createdAt: daysAgo(10) }))).toEqual({ kind: 'inactive', today: '2026-10-17' });
  });

  it('the tiers follow the admin thresholds', () => {
    const settings = { ...SETTINGS_DEFAULTS.reminders, inactiveAfterDays: 3, stopAfterDays: 30 };
    expect(eligibility(input({ settings, lastSeenAt: daysAgo(3) }))).toMatchObject({ kind: 'inactive' });
    expect(eligibility(input({ settings, lastSeenAt: daysAgo(31) }))).toEqual({ skip: 'stopped' });
  });

  it('absence counts local calendar days, not 24-hour periods: 23:50 one day → 00:10 the next is 1 day', () => {
    const settings = { ...SETTINGS_DEFAULTS.reminders, sendTime: '06:00', inactiveAfterDays: 3 };
    // Now 06:10 on 2026-10-17 in Ho Chi Minh. Seen 23:50 on 10-14 → 3 local days (only 2 days 6h20m elapsed).
    const now = new Date('2026-10-16T23:10:00Z');
    expect(eligibility(input({ now, settings, lastSeenAt: new Date('2026-10-14T16:50:00Z') /* 23:50 on 10-14 */ })))
      .toMatchObject({ kind: 'inactive' });
    expect(eligibility(input({ now, settings, lastSeenAt: new Date('2026-10-14T17:10:00Z') /* 00:10 on 10-15 */ })))
      .toMatchObject({ kind: 'regular' });
  });

  it('before the local send time → before-time; at the send time → eligible', () => {
    expect(eligibility(input({ now: new Date('2026-10-17T12:59:00Z') }))).toEqual({ skip: 'before-time' });
    expect(eligibility(input({ now: new Date('2026-10-17T13:00:00Z') }))).toEqual({ kind: 'regular', today: '2026-10-17' });
    expect(eligibility(input({ now: new Date('2026-10-17T16:59:00Z') }))).toEqual({ kind: 'regular', today: '2026-10-17' });
  });

  it('Review Focus 1: today and the send time follow the learner\'s zone at UTC+14, UTC−12 and the New York DST day', () => {
    const at = new Date('2026-11-01T10:30:00Z');
    const sendTime = '05:00';
    const settings = { ...SETTINGS_DEFAULTS.reminders, sendTime };
    // Kiritimati 00:30 on 2026-11-02: before 05:00 there.
    expect(eligibility(input({ now: at, timezone: 'Pacific/Kiritimati', settings, lastSeenAt: daysAgo(1, at) })))
      .toEqual({ skip: 'before-time' });
    // Etc/GMT+12 22:30 on 2026-10-31.
    expect(eligibility(input({ now: at, timezone: 'Etc/GMT+12', settings, lastSeenAt: daysAgo(1, at) })))
      .toEqual({ kind: 'regular', today: '2026-10-31' });
    // New York 05:30 EST on 2026-11-01 (clocks went back at 02:00 EDT).
    expect(eligibility(input({ now: at, timezone: 'America/New_York', settings, lastSeenAt: daysAgo(1, at) })))
      .toEqual({ kind: 'regular', today: '2026-11-01' });
    // Across the DST end: seen 23:30 EDT on 10-25, now 00:30 EST on 11-01 → 7 local days (6 days 2h elapsed).
    const midnight = { ...SETTINGS_DEFAULTS.reminders, sendTime: '00:00' };
    expect(eligibility(input({ now: new Date('2026-11-01T05:30:00Z'), timezone: 'America/New_York', settings: midnight,
      lastSeenAt: new Date('2026-10-26T03:30:00Z') }))).toEqual({ kind: 'inactive', today: '2026-11-01' });
  });

  it('D44: minGapDays 2 → a regular reminder every second day (Thu, Sat, Mon…)', () => {
    const settings = { ...SETTINGS_DEFAULTS.reminders, minGapDays: 2 };
    expect(eligibility(input({ settings, sentDates: ['2026-10-15'] }))).toMatchObject({ kind: 'regular' }); // Thu → Sat
    expect(eligibility(input({ settings, sentDates: ['2026-10-16'] }))).toEqual({ skip: 'gap' }); // Fri → Sat
    expect(eligibility(input({ settings, sentDates: ['2026-10-13', '2026-10-16'] }))).toEqual({ skip: 'gap' });
  });

  it('D44: minGapDays 1 → every day; 7 → once a week; no email sent yet → eligible', () => {
    const daily = { ...SETTINGS_DEFAULTS.reminders, minGapDays: 1 };
    expect(eligibility(input({ settings: daily, sentDates: ['2026-10-16'] }))).toMatchObject({ kind: 'regular' });
    const weekly = { ...SETTINGS_DEFAULTS.reminders, minGapDays: 7 };
    expect(eligibility(input({ settings: weekly, sentDates: ['2026-10-11'] }))).toEqual({ skip: 'gap' });
    expect(eligibility(input({ settings: weekly, sentDates: ['2026-10-10'] }))).toMatchObject({ kind: 'regular' });
    expect(eligibility(input({ settings: weekly, sentDates: [] }))).toMatchObject({ kind: 'regular' });
  });

  it('D26: the inactive email goes at most once in 7 local days, counting a regular email too', () => {
    const away = daysAgo(10);
    expect(eligibility(input({ lastSeenAt: away, sentDates: ['2026-10-11'] }))).toEqual({ skip: 'inactive-cap' });
    expect(eligibility(input({ lastSeenAt: away, sentDates: ['2026-10-10'] }))).toMatchObject({ kind: 'inactive' });
    // minGapDays does not shorten the inactive cap.
    const daily = { ...SETTINGS_DEFAULTS.reminders, minGapDays: 1 };
    expect(eligibility(input({ settings: daily, lastSeenAt: away, sentDates: ['2026-10-16'] }))).toEqual({ skip: 'inactive-cap' });
  });
});
