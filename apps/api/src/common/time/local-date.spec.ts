import { describe, expect, it, vi } from 'vitest';
import { addDays, daysBetween, formatterCacheSize, localDate, localTime, nextLocalMidnight, zonedMidnight } from './local-date.js';

/** The `i`-th distinct upper/lower-case spelling of `name`: bit k of `i` upper-cases the k-th letter. */
function spelling(name: string, i: number): string {
  let bit = 0;
  return [...name].map((char) => (char.toLowerCase() === char.toUpperCase() ? char : ((i >> bit++) & 1) === 1 ? char.toUpperCase() : char.toLowerCase())).join('');
}

describe('local dates', () => {
  it('Review Focus 1: 2026-11-01T10:30Z is 2026-11-02 in Pacific/Kiritimati and 2026-10-31 in Etc/GMT+12; America/New_York maps 05:30Z and 06:30Z on 2026-11-01 to 01:30 and 01:30 (DST end) and both to 2026-11-01', () => {
    const at = new Date('2026-11-01T10:30:00Z');
    expect(localDate('Pacific/Kiritimati', at)).toBe('2026-11-02');
    expect(localDate('Etc/GMT+12', at)).toBe('2026-10-31');
    expect(localDate('Asia/Ho_Chi_Minh', at)).toBe('2026-11-01');
    expect(localTime('Pacific/Kiritimati', at)).toBe('00:30');
    expect(localTime('Etc/GMT+12', at)).toBe('22:30');

    const beforeEnd = new Date('2026-11-01T05:30:00Z');
    const afterEnd = new Date('2026-11-01T06:30:00Z');
    expect(localTime('America/New_York', beforeEnd)).toBe('01:30');
    expect(localTime('America/New_York', afterEnd)).toBe('01:30');
    expect(localDate('America/New_York', beforeEnd)).toBe('2026-11-01');
    expect(localDate('America/New_York', afterEnd)).toBe('2026-11-01');
  });

  it('midnight is 00:00 of the next date, not 24:00', () => {
    const midnight = new Date('2026-11-01T17:00:00Z');
    expect(localTime('Asia/Ho_Chi_Minh', midnight)).toBe('00:00');
    expect(localDate('Asia/Ho_Chi_Minh', midnight)).toBe('2026-11-02');
  });

  it('addDays and daysBetween work on calendar dates across months, years and DST', () => {
    expect(addDays('2026-11-01', 1)).toBe('2026-11-02');
    expect(addDays('2026-12-01', 30)).toBe('2026-12-31');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(daysBetween('2026-09-01', '2026-11-02')).toBe(62);
    expect(daysBetween('2026-11-02', '2026-09-01')).toBe(-62);
    expect(daysBetween('2026-10-31', '2026-11-02')).toBe(2);
  });

  it('zonedMidnight is the UTC instant of 00:00 of the date in Asia/Ho_Chi_Minh, Pacific/Kiritimati and Etc/GMT+12', () => {
    expect(zonedMidnight('Asia/Ho_Chi_Minh', '2026-11-02').toISOString()).toBe('2026-11-01T17:00:00.000Z');
    expect(zonedMidnight('Pacific/Kiritimati', '2026-11-02').toISOString()).toBe('2026-11-01T10:00:00.000Z');
    expect(zonedMidnight('Etc/GMT+12', '2026-10-31').toISOString()).toBe('2026-10-31T12:00:00.000Z');
  });

  it('zonedMidnight in America/New_York uses the offset in force at midnight on 2026-03-08 and 2026-11-01 (DST change days)', () => {
    expect(zonedMidnight('America/New_York', '2026-03-08').toISOString()).toBe('2026-03-08T05:00:00.000Z');
    expect(zonedMidnight('America/New_York', '2026-03-09').toISOString()).toBe('2026-03-09T04:00:00.000Z');
    expect(zonedMidnight('America/New_York', '2026-11-01').toISOString()).toBe('2026-11-01T04:00:00.000Z');
    expect(zonedMidnight('America/New_York', '2026-11-02').toISOString()).toBe('2026-11-02T05:00:00.000Z');
  });

  it('zonedMidnight is the first instant of the date when DST skips midnight (Asia/Beirut 2026-03-29, America/Santiago 2026-09-06)', () => {
    const beirut = zonedMidnight('Asia/Beirut', '2026-03-29');
    expect(beirut.toISOString()).toBe('2026-03-28T22:00:00.000Z');
    expect(localDate('Asia/Beirut', beirut)).toBe('2026-03-29');
    expect(localDate('Asia/Beirut', new Date(beirut.getTime() - 1))).toBe('2026-03-28');

    const santiago = zonedMidnight('America/Santiago', '2026-09-06');
    expect(santiago.toISOString()).toBe('2026-09-06T04:00:00.000Z');
    expect(localDate('America/Santiago', santiago)).toBe('2026-09-06');
    expect(localDate('America/Santiago', new Date(santiago.getTime() - 1))).toBe('2026-09-05');
  });

  it('nextLocalMidnight from 23:58 local is two minutes later', () => {
    expect(nextLocalMidnight('Asia/Ho_Chi_Minh', new Date('2026-11-01T16:58:00Z')).toISOString()).toBe('2026-11-01T17:00:00.000Z');
    expect(nextLocalMidnight('Pacific/Kiritimati', new Date('2026-11-01T09:58:00Z')).toISOString()).toBe('2026-11-01T10:00:00.000Z');
    expect(nextLocalMidnight('Etc/GMT+12', new Date('2026-11-01T11:58:00Z')).toISOString()).toBe('2026-11-01T12:00:00.000Z');
  });

  it('nextLocalMidnight at exactly 00:00 local is the following midnight', () => {
    expect(nextLocalMidnight('Asia/Ho_Chi_Minh', new Date('2026-11-01T17:00:00Z')).toISOString()).toBe('2026-11-02T17:00:00.000Z');
  });
});

describe('formatter cache', () => {
  const now = new Date('2026-11-01T10:30:00Z');

  it('C2: 600 spellings of one zone leave at most 500 formatters cached and still format correctly', () => {
    const variants = Array.from({ length: 600 }, (_, i) => spelling('Asia/Ho_Chi_Minh', i));
    expect(new Set(variants).size).toBe(600);
    for (const variant of variants) expect(localDate(variant, now)).toBe('2026-11-01');
    expect(formatterCacheSize()).toBeLessThanOrEqual(500);
    expect(formatterCacheSize()).toBeGreaterThan(0);
  });

  it('C2: a hit refreshes the entry, so the least recently used spelling is the one evicted', () => {
    const Original = Intl.DateTimeFormat;
    const construct = vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(function (locales?: Intl.LocalesArgument, options?: Intl.DateTimeFormatOptions) {
      return new Original(locales, options);
    } as never);
    try {
      const variants = Array.from({ length: 502 }, (_, i) => spelling('Europe/Berlin', i));
      for (const variant of variants.slice(0, 500)) localDate(variant, now);
      localDate(variants[0], now); // refresh the oldest entry
      localDate(variants[500], now); // evicts the next oldest, variants[1]
      construct.mockClear();
      localDate(variants[0], now);
      expect(construct).not.toHaveBeenCalled();
      localDate(variants[1], now);
      expect(construct).toHaveBeenCalledOnce();
      expect(formatterCacheSize()).toBeLessThanOrEqual(500);
    } finally {
      construct.mockRestore();
    }
  });
});
