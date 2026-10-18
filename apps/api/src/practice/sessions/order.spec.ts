import { describe, expect, it } from 'vitest';
import { seededRandom } from '../testing/seeded-random.js';
import { defaultSort, nextRoundOrder, sortWords, type SortableWord } from './order.js';

function w(sense_id: string, data: Partial<SortableWord> = {}): SortableWord {
  return {
    sense_id, level: 1, due_date: '2026-11-01', priority: false, section: 'due', added_at: '2026-10-01T00:00:00.000Z',
    last_needs_review_at: null, last_practiced_at: null, recent_wrong: 0, ...data,
  };
}

describe('sortWords', () => {
  it('level_asc: lower level first', () => {
    const words = [w('c', { level: 3 }), w('a', { level: 0 }), w('b', { level: 1 })];
    expect(sortWords(words, 'level_asc', seededRandom(1))).toEqual(['a', 'b', 'c']);
  });

  it('B4#1 (order): 30 words, level_asc → the 10 lowest levels first', () => {
    const words = Array.from({ length: 30 }, (_, i) => w(`s${i}`, { level: i % 6 }));
    const sorted = sortWords(words, 'level_asc', seededRandom(5));
    const levels = sorted.map((id) => words.find((x) => x.sense_id === id)!.level);
    expect(levels.slice(0, 10)).toEqual([0, 0, 0, 0, 0, 1, 1, 1, 1, 1]);
    expect(levels).toEqual([...levels].sort((a, b) => a - b));
  });

  it('overdue_first: oldest due date first', () => {
    const words = [w('b', { due_date: '2026-10-20' }), w('c', { due_date: '2026-11-02' }), w('a', { due_date: '2026-10-01' })];
    expect(sortWords(words, 'overdue_first', seededRandom(1))).toEqual(['a', 'b', 'c']);
  });

  it('new_first: level 0 first', () => {
    const words = [w('b', { level: 2 }), w('a', { level: 0 })];
    expect(sortWords(words, 'new_first', seededRandom(1))).toEqual(['a', 'b']);
  });

  it('least_practiced: never practised first, then the oldest last practice', () => {
    const words = [
      w('c', { last_practiced_at: '2026-10-10T00:00:00.000Z' }), w('a'), w('b', { last_practiced_at: '2026-10-01T00:00:00.000Z' }),
    ];
    expect(sortWords(words, 'least_practiced', seededRandom(1))).toEqual(['a', 'b', 'c']);
  });

  it('most_wrong: highest recent_wrong first', () => {
    const words = [w('c', { recent_wrong: 0 }), w('a', { recent_wrong: 4 }), w('b', { recent_wrong: 2 })];
    expect(sortWords(words, 'most_wrong', seededRandom(1))).toEqual(['a', 'b', 'c']);
  });

  it('queue: priority by added_at, due by oldest date then lower level, new by added_at, early by date, then backlog', () => {
    const words = [
      w('backlog', { section: 'backlog' }),
      w('early', { section: 'early', due_date: '2026-11-05' }),
      w('new2', { section: 'new', added_at: '2026-10-05T00:00:00.000Z' }),
      w('new1', { section: 'new', added_at: '2026-10-02T00:00:00.000Z' }),
      w('due-lvl3', { section: 'due', due_date: '2026-10-20', level: 3 }),
      w('due-lvl1', { section: 'due', due_date: '2026-10-20', level: 1 }),
      w('due-old', { section: 'due', due_date: '2026-10-10', level: 5 }),
      w('prio2', { section: 'priority', priority: true, added_at: '2026-10-09T00:00:00.000Z' }),
      w('prio1', { section: 'priority', priority: true, added_at: '2026-10-03T00:00:00.000Z' }),
    ];
    expect(sortWords(words, 'queue', seededRandom(1))).toEqual([
      'prio1', 'prio2', 'due-old', 'due-lvl1', 'due-lvl3', 'new1', 'new2', 'early', 'backlog',
    ]);
  });

  it('priority_oldest: oldest "Cần ôn tập" first, nulls last', () => {
    const words = [
      w('c'), w('b', { last_needs_review_at: '2026-10-10T00:00:00.000Z' }), w('a', { last_needs_review_at: '2026-10-01T00:00:00.000Z' }),
    ];
    expect(sortWords(words, 'priority_oldest', seededRandom(1))).toEqual(['a', 'b', 'c']);
  });

  it('random: every word once, and the order depends on the seed', () => {
    const words = Array.from({ length: 10 }, (_, i) => w(`s${i}`));
    const one = sortWords(words, 'random', seededRandom(1));
    expect([...one].sort()).toEqual(words.map((x) => x.sense_id).sort());
    expect(sortWords(words, 'random', seededRandom(2))).not.toEqual(one);
  });

  it('ties are broken at random', () => {
    const words = Array.from({ length: 6 }, (_, i) => w(`s${i}`, { level: 1 }));
    const orders = new Set(Array.from({ length: 10 }, (_, seed) => sortWords(words, 'level_asc', seededRandom(seed + 1)).join()));
    expect(orders.size).toBeGreaterThan(1);
  });
});

describe('defaultSort', () => {
  it.each([
    ['weak', 'level_asc'], ['priority', 'priority_oldest'], ['today', 'queue'], ['group', 'queue'], ['all', 'least_practiced'],
  ] as const)('%s → %s (design 7.1)', (source, key) => {
    expect(defaultSort(source)).toBe(key);
  });
});

describe('nextRoundOrder', () => {
  it('B4#2 (order): for 2 words, 50 seeded rounds never start with the previous round\'s last word', () => {
    let last = 'b';
    const random = seededRandom(9);
    for (let round = 0; round < 50; round++) {
      const order = nextRoundOrder(['a', 'b'], last, random);
      expect(order[0]).not.toBe(last);
      expect([...order].sort()).toEqual(['a', 'b']);
      last = order[order.length - 1];
    }
  });

  it('many words: never starts with the previous last word; one word: that word', () => {
    const words = ['a', 'b', 'c', 'd', 'e'];
    for (let seed = 1; seed <= 50; seed++) {
      const order = nextRoundOrder(words, 'c', seededRandom(seed));
      expect(order[0]).not.toBe('c');
      expect([...order].sort()).toEqual(words);
    }
    expect(nextRoundOrder(['a'], 'a', seededRandom(1))).toEqual(['a']);
    expect(nextRoundOrder(words, null, seededRandom(1)).sort()).toEqual(words);
  });
});
