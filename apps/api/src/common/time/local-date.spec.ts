import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, localDate, localTime } from './local-date.js';

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
});
