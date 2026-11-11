import { monthGrid } from './month-grid';

const day = (date: string, learned = 1, reviewed = 1, practice_sessions = 0) => ({ date, learned, reviewed, practice_sessions });

describe('monthGrid (Figma 102:3546, Part 6 decisions)', () => {
  it('November 2026: 6 rows from Monday 26/10; days of other months are ghosts with no dots and no band', () => {
    const grid = monthGrid('2026-11', '2026-11-08', [day('2026-11-01')]);
    expect(grid).toHaveLength(6);
    expect(grid.every((row) => row.length === 7)).toBe(true);
    expect(grid[0][0]).toEqual({
      date: '2026-10-26', inMonth: false, isToday: false, isFuture: false, dots: { learn: false, review: false, practice: false }, band: 'none',
    });
    expect(grid[0][6]).toMatchObject({ date: '2026-11-01', inMonth: true, dots: { learn: true, review: true, practice: false }, band: 'single' });
    expect(grid[5][6].date).toBe('2026-12-06');
  });

  it('today and the future: 08/11 is today; 09/11 is future; a past month has no future day', () => {
    const grid = monthGrid('2026-11', '2026-11-08', []);
    const cell = (date: string) => grid.flat().find((c) => c.date === date)!;
    expect(cell('2026-11-08')).toMatchObject({ isToday: true, isFuture: false });
    expect(cell('2026-11-09')).toMatchObject({ isToday: false, isFuture: true });
    expect(monthGrid('2026-10', '2026-11-08', []).flat().some((c) => c.inMonth && c.isFuture)).toBe(false);
  });

  it('dots follow each count; a day missing from days[] has none', () => {
    const grid = monthGrid('2026-11', '2026-11-08', [day('2026-11-05', 10, 0, 2), day('2026-11-06', 0, 3, 0)]);
    const cell = (date: string) => grid.flat().find((c) => c.date === date)!;
    expect(cell('2026-11-05').dots).toEqual({ learn: true, review: false, practice: true });
    expect(cell('2026-11-06').dots).toEqual({ learn: false, review: true, practice: false });
    expect(cell('2026-11-07').dots).toEqual({ learn: false, review: false, practice: false });
  });

  it('a band joins consecutive studied dates: 03–08/11 → start … end', () => {
    const days = ['03', '04', '05', '06', '07', '08'].map((d) => day(`2026-11-${d}`));
    const grid = monthGrid('2026-11', '2026-11-08', days);
    expect(grid[1].map((c) => c.band)).toEqual(['none', 'start', 'middle', 'middle', 'middle', 'middle', 'end']);
  });

  it('a run is cut at the row edge: 07–10/11 is end-of-row then start-of-row', () => {
    const days = ['07', '08', '09', '10'].map((d) => day(`2026-11-${d}`));
    const grid = monthGrid('2026-11', '2026-11-12', days);
    expect(grid[1].slice(5).map((c) => c.band)).toEqual(['start', 'end']);
    expect(grid[2].slice(0, 3).map((c) => c.band)).toEqual(['start', 'end', 'none']);
  });

  it('February 2026 starts on Sunday: 5 rows; February 2027 starts on Monday and fits 4 rows', () => {
    expect(monthGrid('2026-02', '2026-11-08', [])).toHaveLength(5);
    const feb2027 = monthGrid('2027-02', '2026-11-08', []);
    expect(feb2027).toHaveLength(4);
    expect(feb2027[0][0].date).toBe('2027-02-01');
    expect(feb2027[3][6].date).toBe('2027-02-28');
  });
});
