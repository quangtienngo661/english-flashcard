import { carouselOrder, carouselSlots, rhythm, stackDepth, stepTo } from './carousel';
import type { GroupSummary } from './groups-api';

const deck = (id: string, name: string, total: number, today: GroupSummary['today']): GroupSummary => ({
  id, name, version: 1, total, today, backlog: 0, available: { due: 0, new: 0 },
  cells: [0, 1, 2, 3, 4, 5].map((level) => ({ level, total: 0, due: 0 })),
});

describe('stackDepth (prototype `layers`)', () => {
  it.each([[0, 0], [1, 1], [6, 1], [7, 2], [16, 2], [17, 3], [400, 3]])('%i waiting → %i cards behind', (waiting, depth) => {
    expect(stackDepth(waiting)).toBe(depth);
  });
});

describe('carouselSlots', () => {
  it('one group: only the centre', () => {
    expect(carouselSlots(1, 0)).toEqual([{ index: 0, k: 0 }]);
  });

  it('two groups: the other one on the right, never on both sides', () => {
    expect(carouselSlots(2, 0)).toEqual([{ index: 0, k: 0 }, { index: 1, k: 1 }]);
    expect(carouselSlots(2, 1)).toEqual([{ index: 0, k: 1 }, { index: 1, k: 0 }]);
  });

  it('five groups: shortest wrap-around distance', () => {
    expect(carouselSlots(5, 0)).toEqual([
      { index: 0, k: 0 }, { index: 1, k: 1 }, { index: 2, k: 2 }, { index: 3, k: -2 }, { index: 4, k: -1 },
    ]);
  });

  it('four groups: the tie goes right', () => {
    expect(carouselSlots(4, 0)).toEqual([{ index: 0, k: 0 }, { index: 1, k: 1 }, { index: 2, k: 2 }, { index: 3, k: -1 }]);
  });

  it('eight groups: wraps past the end, far groups are left out', () => {
    const slots = carouselSlots(8, 7);
    expect(slots.find((s) => s.index === 0)?.k).toBe(1);
    expect(slots.map((s) => s.index)).toEqual([0, 1, 5, 6, 7]);
    expect(new Set(slots.map((s) => s.index)).size).toBe(slots.length);
  });

  it('no group: nothing', () => {
    expect(carouselSlots(0, 0)).toEqual([]);
  });
});

describe('stepTo', () => {
  it.each([[7, 0, 8, 1], [0, 5, 8, -3], [0, 4, 8, 4], [2, 2, 5, 0], [0, 1, 2, 1], [1, 0, 2, 1]])('%i → %i of %i = %i', (from, to, count, step) => {
    expect(stepTo(from, to, count)).toBe(step);
  });
});

describe('rhythm', () => {
  it('one segment per stage: width = words, fill = due cards', () => {
    const cells = [
      { level: 0, total: 6, due: 6 }, { level: 1, total: 9, due: 9 }, { level: 2, total: 10, due: 9 },
      { level: 3, total: 11, due: 0 }, { level: 4, total: 8, due: 0 }, { level: 5, total: 4, due: 0 },
    ];
    const r = rhythm(cells);
    expect(r).toEqual(cells);
    expect(r.reduce((s, x) => s + x.total, 0)).toBe(48);
    expect(r.reduce((s, x) => s + x.due, 0)).toBe(24);
  });

  it('fills the missing stages with zero and keeps the level order', () => {
    expect(rhythm([{ level: 3, total: 2, due: 1 }])).toEqual([
      { level: 0, total: 0, due: 0 }, { level: 1, total: 0, due: 0 }, { level: 2, total: 0, due: 0 },
      { level: 3, total: 2, due: 1 }, { level: 4, total: 0, due: 0 }, { level: 5, total: 0, due: 0 },
    ]);
  });
});

describe('carouselOrder', () => {
  it('sortForToday, then empty groups last', () => {
    const groups = [
      deck('a', 'An empty', 0, { priority: 0, due: 0, new: 0 }),
      deck('b', 'Done', 12, { priority: 0, due: 0, new: 0 }),
      deck('c', 'Few', 10, { priority: 0, due: 2, new: 0 }),
      deck('d', 'Priority', 10, { priority: 1, due: 0, new: 0 }),
    ];
    expect(carouselOrder(groups).map((g) => g.name)).toEqual(['Priority', 'Few', 'Done', 'An empty']);
  });
});
