import { describe, expect, it } from 'vitest';
import { bulkAddBody, topicAddBody, topicScopeQuery } from './items.schemas.js';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

it('validates a topic summary scope strictly', () => {
  expect(topicScopeQuery.parse({ topic: 'exam-vstep', level: 'B2' })).toEqual({ topic: 'exam-vstep', level: 'B2' });
  for (const scope of [{ topic: 'exam-vstep' }, { topic: 'exam-vstep', level: 'Z9' }, { topic: '../vstep', level: 'B2' }, { topic: 'exam-vstep', level: 'B2', user_id: id(1) }]) {
    expect(topicScopeQuery.safeParse(scope).success).toBe(false);
  }
});

it('discriminates topic adds by mode and validates unique IDs and exactly one target', () => {
  const scope = { topic: 'exam-vstep', level: 'B2' };
  const target = { group_id: id(10) };
  expect(topicAddBody.parse({ ...scope, target, mode: 'all_unlearned' })).toEqual({ ...scope, target, mode: 'all_unlearned' });
  expect(topicAddBody.parse({ ...scope, target, mode: 'selected', sense_ids: [id(1)] })).toMatchObject({ sense_ids: [id(1)] });
  for (const bad of [
    { ...scope, target, mode: 'selected', sense_ids: [id(1), id(1)] },
    { ...scope, target, mode: 'selected', sense_ids: Array.from({ length: 101 }, (_, i) => id(i)) },
    { ...scope, target, mode: 'selected', sense_ids: [] },
    { ...scope, target, mode: 'all_unlearned', sense_ids: [id(1)] },
    { ...scope, target: { ...target, new_group_name: 'New' }, mode: 'all_unlearned' },
  ]) expect(topicAddBody.safeParse(bad).success).toBe(false);
});

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
