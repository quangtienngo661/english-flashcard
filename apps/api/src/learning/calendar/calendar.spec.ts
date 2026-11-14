import { describe, expect, it } from 'vitest';
import {
  aggregateDay,
  aggregateMonth,
  classify,
  type DayItem,
  monthBounds,
  pageAfter,
  resultOf,
  type ReviewRow,
} from './calendar.js';

let seq = 0;
function row(over: Partial<ReviewRow> & { itemId: string }): ReviewRow {
  seq += 1;
  return {
    localDate: '2026-11-08',
    senseId: `s-${over.itemId}`,
    groupId: 'g1',
    levelBefore: 1,
    levelAfter: 2,
    rating: 'Good',
    at: new Date(Date.UTC(2026, 10, 8, 3, 0, seq)),
    ...over,
  };
}

describe('monthBounds', () => {
  it.each([
    ['2026-11', '2026-11-01', '2026-11-30'],
    ['2026-02', '2026-02-01', '2026-02-28'],
    ['2028-02', '2028-02-01', '2028-02-29'],
    ['2026-12', '2026-12-01', '2026-12-31'],
  ])('%s → %s..%s', (month, from, to) => {
    expect(monthBounds(month)).toEqual({ from, to });
  });
});

describe('classify', () => {
  it.each([
    [0, 1, 'learned'],
    [0, 0, 'reviewed'],
    [1, 2, 'reviewed'],
    [3, 0, 'reviewed'],
    [null, 1, 'reviewed'],
  ] as const)('(%s,%s) → %s', (levelBefore, levelAfter, kind) => {
    expect(classify({ levelBefore, levelAfter })).toBe(kind);
  });
});

describe('resultOf', () => {
  it('maps the rating', () => {
    expect(resultOf('Good')).toBe('known');
    expect(resultOf('Again')).toBe('again');
    expect(resultOf(null)).toBeNull();
  });
});

describe('aggregateMonth', () => {
  it('learned then reviewed the same day', () => {
    const rows = [
      row({ itemId: 'A', levelBefore: 0, levelAfter: 1 }),
      row({ itemId: 'A', levelBefore: 1, levelAfter: 2 }),
    ];
    const view = aggregateMonth('2026-11', rows, [], 1);
    expect(view.days).toEqual([{ date: '2026-11-08', learned: 1, reviewed: 1, practice_sessions: 0 }]);
    expect(view.totals).toEqual({ study_days: 1, learned: 1, reviewed: 1, practice_sessions: 0 });
    expect(view.month).toBe('2026-11');
  });

  it('first study answered Again counts as learned only', () => {
    const view = aggregateMonth('2026-11', [row({ itemId: 'A', levelBefore: 0, levelAfter: 1, rating: 'Again' })], [], 1);
    expect(view.days).toEqual([{ date: '2026-11-08', learned: 1, reviewed: 0, practice_sessions: 0 }]);
  });

  it('a relearned word learned twice in the month counts on both days', () => {
    const rows = [
      row({ itemId: 'A', localDate: '2026-11-01', levelBefore: 0, levelAfter: 1 }),
      row({ itemId: 'A', localDate: '2026-11-05', levelBefore: 0, levelAfter: 1 }),
    ];
    const view = aggregateMonth('2026-11', rows, [], 2);
    expect(view.days).toEqual([
      { date: '2026-11-01', learned: 1, reviewed: 0, practice_sessions: 0 },
      { date: '2026-11-05', learned: 1, reviewed: 0, practice_sessions: 0 },
    ]);
    expect(view.totals.learned).toBe(2);
  });

  it('a practice-only day is listed', () => {
    const view = aggregateMonth('2026-11', [], [{ date: '2026-11-09', sessions: 1, questions: 6, correct: 4 }], 1);
    expect(view.days).toEqual([{ date: '2026-11-09', learned: 0, reviewed: 0, practice_sessions: 1 }]);
    expect(view.totals).toEqual({ study_days: 1, learned: 0, reviewed: 0, practice_sessions: 1 });
  });

  it('a studied day without rows is not listed but counts as a study day', () => {
    expect(aggregateMonth('2026-11', [], [], 1)).toEqual({
      month: '2026-11',
      days: [],
      totals: { study_days: 1, learned: 0, reviewed: 0, practice_sessions: 0 },
    });
  });

  it('days are ascending and merge rows with practice', () => {
    const rows = [row({ itemId: 'B', localDate: '2026-11-10' }), row({ itemId: 'A', localDate: '2026-11-02' })];
    const view = aggregateMonth('2026-11', rows, [{ date: '2026-11-10', sessions: 2, questions: 9, correct: 5 }], 2);
    expect(view.days).toEqual([
      { date: '2026-11-02', learned: 0, reviewed: 1, practice_sessions: 0 },
      { date: '2026-11-10', learned: 0, reviewed: 1, practice_sessions: 2 },
    ]);
    expect(view.totals).toEqual({ study_days: 2, learned: 0, reviewed: 2, practice_sessions: 2 });
  });
});

describe('aggregateDay', () => {
  it('reviewed three times, last Again → one item, times 3, result again', () => {
    const rows = [
      row({ itemId: 'A', rating: 'Good' }),
      row({ itemId: 'A', rating: 'Good' }),
      row({ itemId: 'A', rating: 'Again' }),
    ];
    const day = aggregateDay(rows);
    expect(day.items).toHaveLength(1);
    expect(day.items[0]).toMatchObject({ kind: 'reviewed', itemId: 'A', times: 3, result: 'again' });
    expect(day.counts).toEqual({ learned: 0, reviewed: 3, reviewed_known: 2, reviewed_again: 1, learned_groups: 0 });
  });

  it('learned_groups counts distinct non-null groups of learned rows', () => {
    const rows = [
      row({ itemId: 'A', levelBefore: 0, levelAfter: 1, groupId: 'g1' }),
      row({ itemId: 'B', levelBefore: 0, levelAfter: 1, groupId: 'g1' }),
      row({ itemId: 'C', levelBefore: 0, levelAfter: 1, groupId: null }),
    ];
    expect(aggregateDay(rows).counts).toEqual({
      learned: 3,
      reviewed: 0,
      reviewed_known: 0,
      reviewed_again: 0,
      learned_groups: 1,
    });
  });

  it('one item per (itemId, kind), newest values, sorted lastAt desc then itemId then learned first', () => {
    const t = (s: number) => new Date(Date.UTC(2026, 10, 8, 3, 0, s));
    const rows = [
      row({ itemId: 'A', levelBefore: 0, levelAfter: 1, at: t(1), groupId: 'g1' }),
      row({ itemId: 'A', levelBefore: 1, levelAfter: 2, at: t(5), groupId: null }),
      row({ itemId: 'B', levelBefore: 2, levelAfter: 3, at: t(5) }),
      row({ itemId: 'C', levelBefore: 0, levelAfter: 1, at: t(5) }),
      row({ itemId: 'C', levelBefore: 1, levelAfter: 1, at: t(5), rating: 'Again' }),
    ];
    const items = aggregateDay(rows).items.map((i) => [i.itemId, i.kind, i.groupId, i.result, i.times]);
    expect(items).toEqual([
      ['A', 'reviewed', null, 'known', 1],
      ['B', 'reviewed', 'g1', 'known', 1],
      ['C', 'learned', 'g1', 'known', 1],
      ['C', 'reviewed', 'g1', 'again', 1],
      ['A', 'learned', 'g1', 'known', 1],
    ]);
  });
});

describe('pageAfter', () => {
  const items: DayItem[] = Array.from({ length: 25 }, (_, n) => ({
    kind: n % 2 === 0 ? 'learned' : 'reviewed',
    itemId: `i${String(n).padStart(2, '0')}`,
    senseId: `s${n}`,
    groupId: null,
    result: 'known',
    times: 1,
    lastAt: new Date(Date.UTC(2026, 10, 8, 3, 0, 59 - n)),
  }));

  it('pages 20 then 5', () => {
    const first = pageAfter(items, 'all', null, 20);
    expect(first.page).toHaveLength(20);
    expect(first.next).toEqual({ at: items[19]!.lastAt.toISOString(), id: 'i19', k: 'reviewed' });
    const second = pageAfter(items, 'all', first.next, 20);
    expect(second.page.map((i) => i.itemId)).toEqual(['i20', 'i21', 'i22', 'i23', 'i24']);
    expect(second.next).toBeNull();
  });

  it('filters by kind', () => {
    const page = pageAfter(items, 'learned', null, 100);
    expect(page.page).toHaveLength(13);
    expect(page.page.every((i) => i.kind === 'learned')).toBe(true);
    expect(page.next).toBeNull();
  });

  it('a cursor whose item is gone continues at the next item by sort order', () => {
    const without = items.filter((i) => i.itemId !== 'i10');
    const page = pageAfter(without, 'all', { at: items[10]!.lastAt.toISOString(), id: 'i10', k: 'learned' }, 2);
    expect(page.page.map((i) => i.itemId)).toEqual(['i11', 'i12']);
  });
});

describe('invariants over generated rows', () => {
  it('known + again = reviewed per day, and month reviewed = rows classified reviewed', () => {
    let s = 42;
    const rand = () => {
      s = (s * 1103515245 + 12345) % 2147483648;
      return s / 2147483648;
    };
    const rows: ReviewRow[] = Array.from({ length: 50 }, (_, n) => {
      const before = Math.floor(rand() * 3);
      return row({
        itemId: `i${Math.floor(rand() * 8)}`,
        localDate: `2026-11-0${1 + Math.floor(rand() * 5)}`,
        levelBefore: before,
        levelAfter: before + (rand() < 0.5 ? 1 : 0),
        rating: rand() < 0.6 ? 'Good' : 'Again',
        groupId: rand() < 0.3 ? null : `g${Math.floor(rand() * 3)}`,
        at: new Date(Date.UTC(2026, 10, 1, 0, 0, n)),
      });
    });
    const byDay = new Map<string, ReviewRow[]>();
    for (const r of rows) byDay.set(r.localDate, [...(byDay.get(r.localDate) ?? []), r]);
    for (const dayRows of byDay.values()) {
      const { counts } = aggregateDay(dayRows);
      expect(counts.reviewed_known + counts.reviewed_again).toBe(counts.reviewed);
    }
    const month = aggregateMonth('2026-11', rows, [], 5);
    const reviewedRows = rows.filter((r) => classify(r) === 'reviewed').length;
    expect(month.days.reduce((sum, d) => sum + d.reviewed, 0)).toBe(reviewedRows);
    expect(month.totals.reviewed).toBe(reviewedRows);
  });
});
