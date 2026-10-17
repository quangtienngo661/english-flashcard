import { describe, expect, it } from 'vitest';
import { localDate } from '../../common/time/local-date.js';
import { applyAnswer, isBacklog, newItem, relearn, sectionOf, type ItemState } from './schedule.js';

const state = (level: number, dueDate: string, priority = false): ItemState => ({ level, dueDate, priority });

describe('schedule rules (design 6.1)', () => {
  it('design 6.4 rows 1–10 as one table-driven test (each row\'s before → action → after exactly)', () => {
    type Row = {
      row: number; before: ItemState | null; action: 'add' | 'known' | 'review' | 'wait' | 'relearn'; today: string;
      after: ItemState; backlog?: boolean;
    };
    const rows: Row[] = [
      { row: 1, before: null, action: 'add', today: '2026-11-01', after: state(0, '2026-11-01') },
      { row: 2, before: state(0, '2026-11-01'), action: 'known', today: '2026-11-01', after: state(1, '2026-11-02') },
      { row: 3, before: state(1, '2026-11-02'), action: 'known', today: '2026-11-02', after: state(2, '2026-11-05') },
      { row: 4, before: state(2, '2026-11-05'), action: 'known', today: '2026-11-05', after: state(3, '2026-11-12') },
      { row: 5, before: state(3, '2026-11-12'), action: 'known', today: '2026-11-08', after: state(3, '2026-11-12') },
      { row: 6, before: state(3, '2026-11-12'), action: 'review', today: '2026-11-08', after: state(1, '2026-11-08', true) },
      { row: 7, before: state(1, '2026-11-08', true), action: 'known', today: '2026-11-08', after: state(2, '2026-11-11') },
      { row: 8, before: state(5, '2026-12-01'), action: 'known', today: '2026-12-01', after: state(5, '2026-12-31') },
      { row: 9, before: state(4, '2026-09-01'), action: 'wait', today: '2026-11-02', after: state(4, '2026-09-01'), backlog: true },
      { row: 10, before: state(4, '2026-09-01'), action: 'relearn', today: '2026-11-02', after: state(0, '2026-11-02') },
    ];
    for (const { row, before, action, today, after, backlog } of rows) {
      let next: ItemState;
      if (action === 'add') next = newItem(today);
      else if (action === 'relearn') next = relearn(today);
      else if (action === 'wait') next = before!;
      else next = applyAnswer(before!, action, today).next;
      expect(next, `row ${row}`).toEqual(after);
      if (backlog !== undefined) expect(isBacklog(next, today, 60), `row ${row} backlog`).toBe(backlog);
    }
    // Row 10's result counts as a new word.
    expect(sectionOf(relearn('2026-11-02'), '2026-11-02')).toBe('new');
  });

  it('applyAnswer reports section, wasDue, rating and whether anything changed', () => {
    expect(applyAnswer(state(0, '2026-11-01'), 'known', '2026-11-01')).toEqual({
      next: state(1, '2026-11-02'), section: 'new', wasDue: true, rating: 'Good', changed: true });
    expect(applyAnswer(state(2, '2026-11-05'), 'known', '2026-11-07')).toEqual({
      next: state(3, '2026-11-14'), section: 'due', wasDue: true, rating: 'Good', changed: true });
    expect(applyAnswer(state(3, '2026-11-12'), 'known', '2026-11-08')).toEqual({
      next: state(3, '2026-11-12'), section: 'early', wasDue: false, rating: 'Good', changed: false });
    expect(applyAnswer(state(3, '2026-11-12'), 'review', '2026-11-08')).toEqual({
      next: state(1, '2026-11-08', true), section: 'early', wasDue: false, rating: 'Again', changed: true });
    expect(applyAnswer(state(1, '2026-11-08', true), 'known', '2026-11-08')).toEqual({
      next: state(2, '2026-11-11'), section: 'priority', wasDue: true, rating: 'Good', changed: true });
    // "Review" on a card already at level 1, due today and priority changes nothing but is still an Again.
    expect(applyAnswer(state(1, '2026-11-08', true), 'review', '2026-11-08')).toEqual({
      next: state(1, '2026-11-08', true), section: 'priority', wasDue: true, rating: 'Again', changed: false });
  });

  it('sectionOf: priority first, then level 0 as new, then due, else early', () => {
    expect(sectionOf(state(0, '2026-11-01', true), '2026-11-01')).toBe('priority');
    expect(sectionOf(state(0, '2026-08-01'), '2026-11-01')).toBe('new');
    expect(sectionOf(state(2, '2026-11-01'), '2026-11-01')).toBe('due');
    expect(sectionOf(state(2, '2026-10-01'), '2026-11-01')).toBe('due');
    expect(sectionOf(state(2, '2026-11-02'), '2026-11-01')).toBe('early');
  });

  it('B3E2: known at 23:59 then again at 00:01 → the second is early and changes nothing', () => {
    const zone = 'Asia/Ho_Chi_Minh';
    const first = applyAnswer(state(2, '2026-11-05'), 'known', localDate(zone, new Date('2026-11-05T16:59:00Z')));
    expect(first.next).toEqual(state(3, '2026-11-12'));
    const second = applyAnswer(first.next, 'known', localDate(zone, new Date('2026-11-05T17:01:00Z')));
    expect(second).toMatchObject({ next: state(3, '2026-11-12'), section: 'early', wasDue: false, changed: false });
  });

  it('B3E3: level 5 known → stays 5, due +30', () => {
    expect(applyAnswer(state(5, '2026-12-01'), 'known', '2026-12-03').next).toEqual(state(5, '2027-01-02'));
  });

  it('B3E1: a stored due date does not move when the zone changes, only "today" does', () => {
    const stored = state(2, '2026-11-02');
    const at = new Date('2026-11-01T10:30:00Z');
    expect(sectionOf(stored, localDate('Pacific/Kiritimati', at))).toBe('due');
    expect(sectionOf(stored, localDate('Etc/GMT+12', at))).toBe('early');
    expect(stored).toEqual(state(2, '2026-11-02'));
  });

  it('D22/B3E35: level 0 is never backlog however old; level 4 overdue 61 days is, 60 days is not', () => {
    expect(isBacklog(state(0, '2020-01-01'), '2026-11-02', 60)).toBe(false);
    expect(isBacklog(state(4, '2026-09-02'), '2026-11-02', 60)).toBe(true); // 61 days
    expect(isBacklog(state(4, '2026-09-03'), '2026-11-02', 60)).toBe(false); // 60 days
    expect(isBacklog(state(1, '2026-09-02'), '2026-11-02', 60)).toBe(true);
    expect(isBacklog(state(4, '2026-09-02'), '2026-11-02', 90)).toBe(false);
  });
});
