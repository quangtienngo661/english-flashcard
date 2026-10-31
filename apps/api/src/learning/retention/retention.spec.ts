import { describe, expect, it } from 'vitest';
import { activeOn, cohortRows, todayCounts, weekStart, type Member } from './retention.js';

// Lan (design §10): registers Sunday 01/11/2026, learns 03, 05 and 06/11, then stops.
const LAN = new Set(['2026-11-03', '2026-11-05', '2026-11-06']);

describe('weekStart: the Monday of the week of a day (cohorts are Monday–Sunday weeks)', () => {
  it('Sunday belongs to the week that began on the Monday before; Monday starts its own', () => {
    expect(weekStart('2026-11-01')).toBe('2026-10-26');
    expect(weekStart('2026-11-02')).toBe('2026-11-02');
    expect(weekStart('2026-11-08')).toBe('2026-11-02');
    expect(weekStart('2026-11-09')).toBe('2026-11-09');
  });

  it('crosses a year boundary', () => {
    expect(weekStart('2027-01-01')).toBe('2026-12-28');
    expect(weekStart('2026-12-28')).toBe('2026-12-28');
  });

  it('invariant over 400 days: the result is a Monday, never after the day and at most 6 days before it', () => {
    for (let index = 0; index < 400; index += 1) {
      const day = new Date(Date.UTC(2026, 0, 1 + index)).toISOString().slice(0, 10);
      const monday = weekStart(day);
      expect(new Date(`${monday}T00:00:00Z`).getUTCDay(), day).toBe(1);
      const gap = (new Date(`${day}T00:00:00Z`).getTime() - new Date(`${monday}T00:00:00Z`).getTime()) / 86_400_000;
      expect(gap, day).toBeGreaterThanOrEqual(0);
      expect(gap, day).toBeLessThanOrEqual(6);
    }
  });
});

describe('activeOn: a learning day inside [day − n + 1, day] (design §10, §12)', () => {
  it("Lan's D7 (08/11) is active, still active on 12/11, stopped from 13/11, and her D30 (01/12) is not active", () => {
    expect(activeOn(LAN, '2026-11-08', 7)).toBe(true);
    expect(activeOn(LAN, '2026-11-12', 7)).toBe(true);
    expect(activeOn(LAN, '2026-11-13', 7)).toBe(false);
    expect(activeOn(LAN, '2026-12-01', 7)).toBe(false);
  });

  it('the window includes day − 6 and excludes day − 7 for n = 7', () => {
    expect(activeOn(new Set(['2026-11-02']), '2026-11-08', 7)).toBe(true);
    expect(activeOn(new Set(['2026-11-01']), '2026-11-08', 7)).toBe(false);
  });

  it('n = 1: only the day itself counts', () => {
    expect(activeOn(new Set(['2026-11-07']), '2026-11-08', 1)).toBe(false);
    expect(activeOn(new Set(['2026-11-08']), '2026-11-08', 1)).toBe(true);
  });

  it('a day after the asked day does not count, and an empty set is never active', () => {
    expect(activeOn(new Set(['2026-11-09']), '2026-11-08', 7)).toBe(false);
    expect(activeOn(new Set(), '2026-11-08', 60)).toBe(false);
  });

  it('n = 60 reaches day − 59 and not day − 60', () => {
    expect(activeOn(new Set(['2026-10-10']), '2026-12-08', 60)).toBe(true);
    expect(activeOn(new Set(['2026-10-09']), '2026-12-08', 60)).toBe(false);
  });
});

describe('cohortRows: size, D7 and D30 per Monday–Sunday registration week', () => {
  const lan: Member = { userId: 'lan', regDay: '2026-11-01' };
  const minh: Member = { userId: 'minh', regDay: '2026-10-26' };
  const activity = new Map([['lan', LAN]]);
  const rows = (today: string, extra: Partial<Parameters<typeof cohortRows>[0]> = {}) => cohortRows({
    firstWeek: '2026-10-26', lastWeek: '2026-10-26', members: [lan, minh], activity, today, n: 7, ...extra,
  });

  it('a member who never learned stays in the size and is not active (B45)', () => {
    expect(rows('2026-12-15')).toEqual([{ week_start: '2026-10-26', size: 2, d7: 1, d30: 0 }]);
  });

  it('D7 and D30 stay null until the last member of the week has reached the day: week_start + 13 and + 36 (B46)', () => {
    expect(rows('2026-11-07')).toEqual([{ week_start: '2026-10-26', size: 2, d7: null, d30: null }]);
    expect(rows('2026-11-08')).toEqual([{ week_start: '2026-10-26', size: 2, d7: 1, d30: null }]);
    expect(rows('2026-11-30')).toEqual([{ week_start: '2026-10-26', size: 2, d7: 1, d30: null }]);
    expect(rows('2026-12-01')).toEqual([{ week_start: '2026-10-26', size: 2, d7: 1, d30: 0 }]);
  });

  it("a week nobody registered in is listed with size 0 and null, never a number (Review focus 4)", () => {
    expect(rows('2026-12-15', { lastWeek: '2026-11-02' })).toEqual([
      { week_start: '2026-10-26', size: 2, d7: 1, d30: 0 },
      { week_start: '2026-11-02', size: 0, d7: null, d30: null },
    ]);
  });

  it('every Monday of the range is listed, oldest first, and a member goes to the week of their own registration day', () => {
    const monday: Member = { userId: 'mon', regDay: '2026-11-09' };
    const tuesday: Member = { userId: 'tue', regDay: '2026-11-17' };
    const sunday: Member = { userId: 'sun', regDay: '2026-11-08' };
    const out = cohortRows({
      // Lan (01/11) belongs to the week of 26/10, which is not listed: she is left out.
      firstWeek: '2026-11-02', lastWeek: '2026-11-16', members: [tuesday, monday, lan, sunday],
      activity: new Map([['mon', new Set(['2026-11-16'])], ['tue', new Set(['2026-11-24'])]]), today: '2026-12-31', n: 7,
    });
    expect(out.map((row) => [row.week_start, row.size])).toEqual([['2026-11-02', 1], ['2026-11-09', 1], ['2026-11-16', 1]]);
    expect(out[0]).toEqual({ week_start: '2026-11-02', size: 1, d7: 0, d30: 0 });
    // Monday 09/11: D7 is 16/11, which has an activity day; D30 is 09/12, which has none.
    expect(out[1]).toEqual({ week_start: '2026-11-09', size: 1, d7: 1, d30: 0 });
    // Tuesday 17/11: D7 is 24/11.
    expect(out[2]).toEqual({ week_start: '2026-11-16', size: 1, d7: 1, d30: 0 });
  });

  it("a member is measured on their own registration day + 7, not on the week's first day", () => {
    // Registered Sunday 01/11, D7 = 08/11. A learning day 02/11 is in [02/11, 08/11]; 01/11 is not.
    const early = cohortRows({ firstWeek: '2026-10-26', lastWeek: '2026-10-26', members: [lan], activity: new Map([['lan', new Set(['2026-11-02'])]]), today: '2026-12-15', n: 7 });
    expect(early[0].d7).toBe(1);
    const tooEarly = cohortRows({ firstWeek: '2026-10-26', lastWeek: '2026-10-26', members: [lan], activity: new Map([['lan', new Set(['2026-11-01'])]]), today: '2026-12-15', n: 7 });
    expect(tooEarly[0].d7).toBe(0);
  });

  it('the window setting applies to D7 and D30 alike: n = 1 needs a day exactly on D7, n = 60 reaches back far', () => {
    expect(rows('2026-12-15', { n: 1 })).toEqual([{ week_start: '2026-10-26', size: 2, d7: 0, d30: 0 }]);
    const exact = new Map([['lan', new Set(['2026-11-08', '2026-12-01'])]]);
    expect(rows('2026-12-15', { n: 1, activity: exact })).toEqual([{ week_start: '2026-10-26', size: 2, d7: 1, d30: 1 }]);
    expect(rows('2026-12-15', { n: 60 })).toEqual([{ week_start: '2026-10-26', size: 2, d7: 1, d30: 1 }]);
  });

  it('members outside every listed week are ignored, and an empty range lists nothing', () => {
    const late: Member = { userId: 'late', regDay: '2027-03-01' };
    expect(rows('2027-06-01', { members: [late] })).toEqual([{ week_start: '2026-10-26', size: 0, d7: null, d30: null }]);
    expect(rows('2026-12-15', { firstWeek: '2026-11-02', lastWeek: '2026-10-26' })).toEqual([]);
  });

  it('when every member learns every day, d7 and d30 equal the size', () => {
    const members: Member[] = ['a', 'b', 'c', 'd'].map((userId, index) => ({ userId, regDay: `2026-10-${26 + index}` }));
    const every = new Map(members.map((member) => [member.userId, new Set(Array.from({ length: 80 }, (_, index) => new Date(Date.UTC(2026, 9, 26 + index)).toISOString().slice(0, 10)))]));
    const [row] = cohortRows({ firstWeek: '2026-10-26', lastWeek: '2026-10-26', members, activity: every, today: '2027-01-31', n: 7 });
    expect(row).toEqual({ week_start: '2026-10-26', size: 4, d7: 4, d30: 4 });
  });
});

describe('todayCounts: "đang học" and "đã ngừng" on one day', () => {
  it('active = in the window minus staff; stopped = ever learned, not in the window, minus staff', () => {
    expect(todayCounts({ inWindow: ['a', 'b', 'e'], ever: ['a', 'b', 'c', 'e', 'f'], excluded: new Set(['e', 'f']) })).toEqual({ active: 2, stopped: 1 });
  });

  it('nothing at all is zero and zero', () => {
    expect(todayCounts({ inWindow: [], ever: [], excluded: new Set() })).toEqual({ active: 0, stopped: 0 });
  });

  it('a learner in the window is never also counted as stopped, and a repeated id counts once', () => {
    expect(todayCounts({ inWindow: ['a', 'a'], ever: ['a', 'a', 'b', 'b'], excluded: new Set() })).toEqual({ active: 1, stopped: 1 });
  });

  it('when everyone is staff nobody is counted', () => {
    expect(todayCounts({ inWindow: ['e'], ever: ['e', 'f'], excluded: new Set(['e', 'f']) })).toEqual({ active: 0, stopped: 0 });
  });
});
