import { describe, expect, it } from 'vitest';
import { allocate } from './content-sample-senses.js';

describe('allocate', () => {
  it('allocates proportionally with largest-remainder and respects minPerLevel', () => {
    const result = allocate({ A1: 1000, A2: 1000, B1: 2000, B2: 3000, C1: 2000, C2: 806 });
    expect(result).toEqual({ A1: 10, A2: 10, B1: 21, B2: 31, C1: 20, C2: 8 });
    expect(Object.values(result).reduce((a, b) => a + b, 0)).toBe(100);
    for (const v of Object.values(result)) expect(v).toBeGreaterThanOrEqual(5);
  });

  it('caps a level at its available count when smaller than minPerLevel', () => {
    expect(allocate({ A1: 3, B1: 997 })).toEqual({ A1: 3, B1: 97 });
  });

  it('returns an empty object for empty input', () => {
    expect(allocate({})).toEqual({});
  });
});
