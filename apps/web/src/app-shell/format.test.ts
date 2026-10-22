import { createFormat } from './format';

// Intl puts a no-break space before the currency sign; compare with plain spaces.
const plain = (s: string) => s.replace(/\u00a0/g, ' ');
const vi = (tz: string) => createFormat('vi', tz);
const en = (tz: string) => createFormat('en', tz);

describe('format in the learner time zone (Review Focus 3, D13)', () => {
  const evening = '2026-10-18T13:00:00Z';

  it('vi: "Chủ Nhật, 18/10" and "20:00" in Ho Chi Minh City', () => {
    expect(vi('Asia/Ho_Chi_Minh').date(evening, 'weekdayDayMonth')).toBe('Chủ Nhật, 18/10');
    expect(vi('Asia/Ho_Chi_Minh').time(evening)).toBe('20:00');
  });

  it('en: "Sunday, Oct 18" and "8:00 PM"', () => {
    expect(en('Asia/Ho_Chi_Minh').date(evening, 'weekdayDayMonth')).toBe('Sunday, Oct 18');
    expect(en('Asia/Ho_Chi_Minh').time(evening)).toBe('8:00 PM');
  });

  it('UTC+14 is already the next day: "Thứ Hai, 19/10" at "0:30"', () => {
    expect(vi('Pacific/Kiritimati').date('2026-10-18T10:30:00Z', 'weekdayDayMonth')).toBe('Thứ Hai, 19/10');
    expect(vi('Pacific/Kiritimati').time('2026-10-18T10:30:00Z')).toBe('0:30');
  });

  it('UTC−12 is still the day before', () => {
    expect(vi('Etc/GMT+12').date('2026-10-19T05:00:00Z', 'weekdayDayMonth')).toBe('Chủ Nhật, 18/10');
  });

  it('resetAt of the next local midnight reads "0:00" / "12:00 AM" (D15)', () => {
    // Midnight 19/10 in Ho Chi Minh City is 17:00 UTC on 18/10.
    expect(vi('Asia/Ho_Chi_Minh').resetAt('2026-10-18T17:00:00Z')).toBe('0:00');
    expect(en('Asia/Ho_Chi_Minh').resetAt('2026-10-18T17:00:00Z')).toBe('12:00 AM');
  });

  it('dayMonth and full dates', () => {
    expect(vi('UTC').date('2026-11-15T05:00:00Z', 'dayMonth')).toBe('15/11');
    expect(en('UTC').date('2026-11-15T05:00:00Z', 'dayMonth')).toBe('Nov 15');
    expect(vi('UTC').date('2026-12-31T05:00:00Z', 'full')).toBe('31/12/2026');
    expect(en('UTC').date('2026-12-31T05:00:00Z', 'full')).toBe('Dec 31, 2026');
  });

  it('money from minor units in the currency of the amount', () => {
    expect(plain(vi('UTC').money(99000, 'VND'))).toBe('99.000 ₫');
    expect(en('UTC').money(499, 'USD')).toBe('$4.99');
  });

  it('numbers use the locale grouping', () => {
    expect(vi('UTC').number(7799)).toBe('7.799');
    expect(en('UTC').number(7799)).toBe('7,799');
  });
});
