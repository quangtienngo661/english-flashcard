import { addDays, addMonths, daysInMonth, elapsedDays, monthOf, todayIn, weekdayMon0 } from './learner-date';

describe('learner dates (design §10.4, Part 6 Review Focus 1)', () => {
  it('today comes from the learner zone: 17:30 UTC on 31/10 is already 01/11 at UTC+7', () => {
    expect(todayIn('Asia/Ho_Chi_Minh', new Date('2026-10-31T17:30:00Z'))).toBe('2026-11-01');
    expect(todayIn('UTC', new Date('2026-10-31T17:30:00Z'))).toBe('2026-10-31');
    expect(todayIn('Asia/Ho_Chi_Minh', new Date('2026-10-31T16:59:59Z'))).toBe('2026-10-31');
  });

  it('monthOf keeps the year and month', () => {
    expect(monthOf('2026-11-01')).toBe('2026-11');
  });

  it('elapsedDays: the day of today in the current month, the whole length of a past month, 0 for a future one', () => {
    expect(elapsedDays('2026-11', '2026-11-08')).toBe(8);
    expect(elapsedDays('2026-10', '2026-11-08')).toBe(31);
    expect(elapsedDays('2026-02', '2026-11-08')).toBe(28);
    expect(elapsedDays('2026-12', '2026-11-08')).toBe(0);
    expect(elapsedDays('2025-12', '2026-01-01')).toBe(31);
  });

  it('addDays crosses months and years', () => {
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-11-08', -7)).toBe('2026-11-01');
    expect(addDays('2026-11-08', 0)).toBe('2026-11-08');
  });

  it('addMonths crosses years both ways', () => {
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-11', 0)).toBe('2026-11');
    expect(addMonths('2026-11', -13)).toBe('2025-10');
  });

  it('daysInMonth knows leap years', () => {
    expect([daysInMonth('2026-02'), daysInMonth('2028-02'), daysInMonth('2100-02'), daysInMonth('2026-11'), daysInMonth('2026-12')])
      .toEqual([28, 29, 28, 30, 31]);
  });

  it('weekdayMon0: Monday is 0, Sunday is 6', () => {
    expect(weekdayMon0('2026-11-01')).toBe(6);
    expect(weekdayMon0('2026-11-02')).toBe(0);
    expect(weekdayMon0('2026-11-05')).toBe(3);
  });
});
