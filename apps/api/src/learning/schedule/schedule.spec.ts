import { describe, expect, it } from 'vitest';
import { localDate } from '../../common/time/local-date.js';
import { applyAnswer, applyLearn, applyRecall, isBacklog, newItem, relearn, sectionOf, type ItemState } from './schedule.js';

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
      else next = applyAnswer(before!, action, today, 60).next;
      expect(next, `row ${row}`).toEqual(after);
      if (backlog !== undefined) expect(isBacklog(next, today, 60), `row ${row} backlog`).toBe(backlog);
    }
    // Row 10's result counts as a new word.
    expect(sectionOf(relearn('2026-11-02'), '2026-11-02', 60)).toBe('new');
  });

  it('applyAnswer reports section, wasDue, rating and whether anything changed', () => {
    expect(applyAnswer(state(0, '2026-11-01'), 'known', '2026-11-01', 60)).toEqual({
      next: state(1, '2026-11-02'), section: 'new', wasDue: true, rating: 'Good', changed: true });
    expect(applyAnswer(state(2, '2026-11-05'), 'known', '2026-11-07', 60)).toEqual({
      next: state(3, '2026-11-14'), section: 'due', wasDue: true, rating: 'Good', changed: true });
    expect(applyAnswer(state(3, '2026-11-12'), 'known', '2026-11-08', 60)).toEqual({
      next: state(3, '2026-11-12'), section: 'early', wasDue: false, rating: 'Good', changed: false });
    expect(applyAnswer(state(3, '2026-11-12'), 'review', '2026-11-08', 60)).toEqual({
      next: state(1, '2026-11-08', true), section: 'early', wasDue: false, rating: 'Again', changed: true });
    expect(applyAnswer(state(1, '2026-11-08', true), 'known', '2026-11-08', 60)).toEqual({
      next: state(2, '2026-11-11'), section: 'priority', wasDue: true, rating: 'Good', changed: true });
    // "Review" on a card already at level 1, due today and priority changes nothing but is still an Again.
    expect(applyAnswer(state(1, '2026-11-08', true), 'review', '2026-11-08', 60)).toEqual({
      next: state(1, '2026-11-08', true), section: 'priority', wasDue: true, rating: 'Again', changed: false });
  });

  it('sectionOf: priority first, then level 0 as new, then due, else early', () => {
    expect(sectionOf(state(0, '2026-11-01', true), '2026-11-01', 60)).toBe('priority');
    expect(sectionOf(state(0, '2026-08-01'), '2026-11-01', 60)).toBe('new');
    expect(sectionOf(state(2, '2026-11-01'), '2026-11-01', 60)).toBe('due');
    expect(sectionOf(state(2, '2026-10-01'), '2026-11-01', 60)).toBe('due');
    expect(sectionOf(state(2, '2026-11-02'), '2026-11-01', 60)).toBe('early');
  });

  it('B3E2: known at 23:59 then again at 00:01 → the second is early and changes nothing', () => {
    const zone = 'Asia/Ho_Chi_Minh';
    const first = applyAnswer(state(2, '2026-11-05'), 'known', localDate(zone, new Date('2026-11-05T16:59:00Z')), 60);
    expect(first.next).toEqual(state(3, '2026-11-12'));
    const second = applyAnswer(first.next, 'known', localDate(zone, new Date('2026-11-05T17:01:00Z')), 60);
    expect(second).toMatchObject({ next: state(3, '2026-11-12'), section: 'early', wasDue: false, changed: false });
  });

  it('B3E3: level 5 known → stays 5, due +30', () => {
    expect(applyAnswer(state(5, '2026-12-01'), 'known', '2026-12-03', 60).next).toEqual(state(5, '2027-01-02'));
  });

  it('B3E1: a stored due date does not move when the zone changes, only "today" does', () => {
    const stored = state(2, '2026-11-02');
    const at = new Date('2026-11-01T10:30:00Z');
    expect(sectionOf(stored, localDate('Pacific/Kiritimati', at), 60)).toBe('due');
    expect(sectionOf(stored, localDate('Etc/GMT+12', at), 60)).toBe('early');
    expect(stored).toEqual(state(2, '2026-11-02'));
  });

  it('D22/B3E35: level 0 is never backlog however old; level 4 overdue 61 days is, 60 days is not', () => {
    expect(isBacklog(state(0, '2020-01-01'), '2026-11-02', 60)).toBe(false);
    expect(isBacklog(state(4, '2026-09-02'), '2026-11-02', 60)).toBe(true); // 61 days
    expect(isBacklog(state(4, '2026-09-03'), '2026-11-02', 60)).toBe(false); // 60 days
    expect(isBacklog(state(1, '2026-09-02'), '2026-11-02', 60)).toBe(true);
    expect(isBacklog(state(4, '2026-09-02'), '2026-11-02', 90)).toBe(false);
  });
  it('M2: a level-0 item is due whatever its due date — "known" lifts it to level 1 even when the zone moved west after adding', () => {
    expect(applyAnswer(state(0, '2026-11-02'), 'known', '2026-11-01', 60)).toEqual({
      next: state(1, '2026-11-02'), section: 'new', wasDue: true, rating: 'Good', changed: true });
  });

  it('L2: a level ≥ 1 item overdue by more than the backlog days is in section backlog; the answer still applies', () => {
    expect(sectionOf(state(3, '2026-08-30'), '2026-11-08', 60)).toBe('backlog');
    expect(sectionOf(state(3, '2026-09-09'), '2026-11-08', 60)).toBe('due'); // 60 days: not yet backlog
    expect(sectionOf(state(0, '2026-01-01'), '2026-11-08', 60)).toBe('new');
    expect(applyAnswer(state(3, '2026-08-30'), 'known', '2026-11-08', 60)).toEqual({
      next: state(4, '2026-11-22'), section: 'backlog', wasDue: true, rating: 'Good', changed: true });
    expect(applyAnswer(state(3, '2026-08-30'), 'known', '2026-11-08', 90).section).toBe('due');
  });
  it('L1 / D48: a priority word overdue by more than the backlog days is in the backlog, not the priority section', () => {
    expect(sectionOf(state(1, '2026-09-01', true), '2026-11-08', 60)).toBe('backlog');
    expect(sectionOf(state(1, '2026-09-09', true), '2026-11-08', 60)).toBe('priority'); // 60 days: still priority
    expect(applyAnswer(state(1, '2026-09-01', true), 'known', '2026-11-08', 60)).toMatchObject({
      next: state(2, '2026-11-11'), section: 'backlog', wasDue: true });
  });
});

describe('applyLearn (flashcards: only new words move, round C DC4/DC26)', () => {
  const today = '2026-11-07';
  it('level 0 + known → level 1, due tomorrow', () => {
    const r = applyLearn(state(0, today), 'known', today, 60);
    expect(r.next).toEqual(state(1, '2026-11-08'));
    expect(r).toMatchObject({ changed: true, section: 'new', wasDue: true, rating: 'Good' });
  });
  it('a due level-3 word + known → untouched', () => {
    const before = state(3, '2026-11-05');
    const r = applyLearn(before, 'known', today, 60);
    expect(r.next).toEqual(before);
    expect(r).toMatchObject({ changed: false, section: 'due', wasDue: true, rating: 'Good' });
  });
  it('a priority level-1 word + known → untouched, still priority', () => {
    const before = state(1, today, true);
    const r = applyLearn(before, 'known', today, 60);
    expect(r.next).toEqual(before);
    expect(r.changed).toBe(false);
    expect(r.section).toBe('priority');
  });
  it('review resets any level to level 1, due today, priority', () => {
    for (let level = 0; level <= 5; level++) {
      const r = applyLearn(state(level, '2026-12-01'), 'review', today, 60);
      expect(r.next, `level ${level}`).toEqual(state(1, today, true));
      expect(r.rating).toBe('Again');
    }
    expect(applyLearn(state(1, today, true), 'review', today, 60).changed).toBe(false);
  });
  it('known never changes a word at level ≥ 1, whatever its due date', () => {
    for (let level = 1; level <= 5; level++) {
      for (const due of ['2026-10-01', today, '2026-12-01']) {
        for (const priority of [false, true]) {
          const before = state(level, due, priority);
          expect(applyLearn(before, 'known', today, 60).next).toEqual(before);
        }
      }
    }
  });
});

describe('applyRecall (round C DC4/DC26)', () => {
  const today = '2026-11-07';
  it('correct + due levels up by the ladder; early or wrong keeps the state', () => {
    const expectedDue: Record<number, string> = { 2: '2026-11-10', 3: '2026-11-14', 4: '2026-11-21', 5: '2026-12-07' };
    for (let level = 1; level <= 5; level++) {
      const next = Math.min(level + 1, 5);
      const dueRow = applyRecall(state(level, today), true, today, 60);
      expect(dueRow.next.level, `level ${level} due`).toBe(next);
      if (level < 5) expect(dueRow.next.dueDate).toBe(expectedDue[next]);
      expect(dueRow).toMatchObject({ outcome: 'leveled_up', rating: 'Good', wasDue: true });
      const early = state(level, '2026-11-20');
      const earlyRow = applyRecall(early, true, today, 60);
      expect(earlyRow.next).toEqual(early);
      expect(earlyRow).toMatchObject({ outcome: 'kept', changed: false, wasDue: false });
      for (const before of [state(level, today), early]) {
        const wrong = applyRecall(before, false, today, 60);
        expect(wrong.next).toEqual(before);
        expect(wrong).toMatchObject({ outcome: 'kept', changed: false, rating: 'Again' });
      }
    }
  });
  it('level 3 due → level 4 due 2026-11-21; level 5 due → level 5 due 2026-12-07', () => {
    expect(applyRecall(state(3, today), true, today, 60).next).toEqual(state(4, '2026-11-21'));
    expect(applyRecall(state(5, today), true, today, 60).next).toEqual(state(5, '2026-12-07'));
  });
  it('DC26: correct on a priority word only clears the flag', () => {
    const r = applyRecall(state(1, today, true), true, today, 60);
    expect(r.next).toEqual(state(1, '2026-11-08'));
    expect(r).toMatchObject({ outcome: 'kept', changed: true });
  });
  it('a wrong answer on a priority word keeps it priority', () => {
    const before = state(1, today, true);
    expect(applyRecall(before, false, today, 60).next).toEqual(before);
  });
  it('level 0 never moves', () => {
    const before = state(0, today);
    for (const correct of [true, false]) {
      const r = applyRecall(before, correct, today, 60);
      expect(r.next).toEqual(before);
      expect(r.outcome).toBe('kept');
    }
  });
  it('invariants: wrong never changes anything; level never drops or exceeds 5', () => {
    for (let level = 0; level <= 5; level++) {
      for (const due of ['2026-09-01', today, '2026-12-01']) {
        for (const priority of [false, true]) {
          const before = state(level, due, priority);
          const wrong = applyRecall(before, false, today, 60);
          expect(wrong.next).toEqual(before);
          expect(wrong.changed).toBe(false);
          const right = applyRecall(before, true, today, 60);
          expect(right.next.level).toBeGreaterThanOrEqual(level);
          expect(right.next.level).toBeLessThanOrEqual(5);
        }
      }
    }
  });
});
