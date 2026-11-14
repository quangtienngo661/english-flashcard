import { describe, expect, it } from 'vitest';
import { bulkAddBody } from './items.schemas.js';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

describe('bulkAddBody (design §8.3)', () => {
  it('accepts 1–100 distinct sense ids', () => {
    expect(bulkAddBody.parse({ sense_ids: [id(1), id(2)] })).toEqual({ sense_ids: [id(1), id(2)] });
    expect(bulkAddBody.safeParse({ sense_ids: Array.from({ length: 100 }, (_, i) => id(i)) }).success).toBe(true);
  });

  it('GC4: sense_ids cannot come with a filter', () => {
    for (const filter of [{ topic: 'business' }, { level: 'B1' }, { pos: 'verb' }]) {
      expect(bulkAddBody.safeParse({ sense_ids: [id(1)], ...filter }).success).toBe(false);
    }
  });

  it('GC5: 101 ids, a repeated id or an empty list are refused', () => {
    expect(bulkAddBody.safeParse({ sense_ids: Array.from({ length: 101 }, (_, i) => id(i)) }).success).toBe(false);
    expect(bulkAddBody.safeParse({ sense_ids: [id(1), id(1)] }).success).toBe(false);
    expect(bulkAddBody.safeParse({ sense_ids: [] }).success).toBe(false);
  });

  it('the filter-only body still works', () => {
    expect(bulkAddBody.parse({ topic: 'business', level: 'B1' })).toEqual({ topic: 'business', level: 'B1' });
  });
});
