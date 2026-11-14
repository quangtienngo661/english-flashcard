import { calendarHref, parseCalendar } from './calendar-params';

const parse = (query: string, today = '2026-11-08') => parseCalendar(new URLSearchParams(query), today);

describe('parseCalendar (design §5.6)', () => {
  it('no parameter: no dialog', () => {
    expect(parse('')).toEqual({ view: 'none' });
    expect(parse('id=g1')).toEqual({ view: 'none' });
  });

  it('?lich=YYYY-MM opens that month; an empty ?lich is the current month in the learner zone', () => {
    expect(parse('lich=2026-10')).toEqual({ view: 'month', month: '2026-10' });
    expect(parse('lich=')).toEqual({ view: 'month', month: '2026-11' });
    expect(parse('lich')).toEqual({ view: 'month', month: '2026-11' });
  });

  it('malformed or out of range is invalid', () => {
    for (const query of ['lich=2026-13', 'lich=2026-1', 'lich=2025-12', 'lich=2101-01', 'lich=abc', 'ngay=2026-02-30', 'ngay=2026-11-8',
      'ngay=2025-12-31', 'ngay=', 'ngay=2026-11-05x']) {
      expect(parse(query), query).toEqual({ view: 'invalid' });
    }
  });

  it('?ngay= wins over ?lich=; its month is the month of the day', () => {
    expect(parse('lich=2026-11&ngay=2026-11-05')).toEqual({ view: 'day', month: '2026-11', date: '2026-11-05' });
    expect(parse('lich=2026-09&ngay=2026-10-31')).toEqual({ view: 'day', month: '2026-10', date: '2026-10-31' });
  });

  it('the range edges and future days are valid', () => {
    expect(parse('lich=2026-01')).toEqual({ view: 'month', month: '2026-01' });
    expect(parse('lich=2100-12')).toEqual({ view: 'month', month: '2100-12' });
    expect(parse('ngay=2026-01-01')).toEqual({ view: 'day', month: '2026-01', date: '2026-01-01' });
    expect(parse('ngay=2026-11-09')).toEqual({ view: 'day', month: '2026-11', date: '2026-11-09' });
  });
});

describe('calendarHref', () => {
  it('sets and removes the calendar parameters and keeps the others', () => {
    expect(calendarHref('/vi/app/group', '?id=g1', { lich: '2026-11' })).toBe('/vi/app/group?id=g1&lich=2026-11');
    expect(calendarHref('/vi/app', '?lich=2026-11', { lich: null, ngay: '2026-11-05' })).toBe('/vi/app?ngay=2026-11-05');
    expect(calendarHref('/vi/app', '?ngay=2026-11-05', { lich: null, ngay: null })).toBe('/vi/app');
  });
});
