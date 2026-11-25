import { describe, expect, it } from 'vitest';
import { isActivated, recallByLevel, weekRows } from './pilot-metrics.js';

describe('pilot-metrics pure functions', () => {
  describe('isActivated', () => {
    it('returns true when first study day is on registration day or the next day', () => {
      expect(isActivated('2026-11-23', '2026-11-23')).toBe(true);
      expect(isActivated('2026-11-23', '2026-11-24')).toBe(true);
    });

    it('returns false when first study day is 2+ days after registration or null', () => {
      expect(isActivated('2026-11-23', '2026-11-25')).toBe(false);
      expect(isActivated('2026-11-23', null)).toBe(false);
    });
  });

  describe('weekRows', () => {
    it('aggregates verified members and created/paid orders per Monday week', () => {
      expect(
        weekRows({
          firstWeek: '2026-11-09',
          lastWeek: '2026-11-23',
          members: [
            { regDay: '2026-11-09' },
            { regDay: '2026-11-15' },
            { regDay: '2026-11-24' },
          ],
          orders: [
            { day: '2026-11-10', paid: true },
            { day: '2026-11-11', paid: false },
            { day: '2026-11-23', paid: true },
          ],
        }),
      ).toEqual([
        { week: '2026-11-09', verified: 2, orders_created: 2, orders_paid: 1 },
        { week: '2026-11-16', verified: 0, orders_created: 0, orders_paid: 0 },
        { week: '2026-11-23', verified: 1, orders_created: 1, orders_paid: 1 },
      ]);
    });
  });

  describe('recallByLevel', () => {
    it('groups due reviews by levelBefore and counts rows where levelAfter > levelBefore, sorted by level', () => {
      expect(
        recallByLevel([
          { levelBefore: 3, levelAfter: 4 },
          { levelBefore: 1, levelAfter: 2 },
          { levelBefore: 1, levelAfter: 1 },
        ]),
      ).toEqual([
        { level: 1, due_answers: 2, remembered: 1 },
        { level: 3, due_answers: 1, remembered: 1 },
      ]);
    });

    it('returns an empty array for empty input', () => {
      expect(recallByLevel([])).toEqual([]);
    });
  });
});
