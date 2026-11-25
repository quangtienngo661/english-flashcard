import { describe, expect, it } from 'vitest';
import { allocate, parseSince } from './content-sample-senses.js';

describe('allocate', () => {
  it('allocates proportionally with largest-remainder and respects minPerLevel', () => {
    const result = allocate({ A1: 1000, A2: 1000, B1: 2000, B2: 3000, C1: 2000, C2: 806 });
    expect(result).toEqual({ A1: 10, A2: 10, B1: 21, B2: 31, C1: 20, C2: 8 });
    expect(Object.values(result).reduce((a, b) => a + b, 0)).toBe(100);
    for (const v of Object.values(result)) expect(v).toBeGreaterThanOrEqual(5);
  });

  it('caps a level at its available count when smaller than minPerLevel while enforcing minimum on others', () => {
    expect(allocate({ A1: 3, B1: 997 })).toEqual({ A1: 3, B1: 97 });
    const mixed = allocate({ A1: 3, A2: 10, B1: 987 }, 100, 5);
    expect(mixed).toEqual({ A1: 3, A2: 5, B1: 92 });
    expect(Object.values(mixed).reduce((a, b) => a + b, 0)).toBe(100);
  });

  it('falls back to plain proportional largest-remainder when activeLevels * minPerLevel > total (7 levels, total 30)', () => {
    const result = allocate(
      { A1: 100, A2: 100, B1: 200, B2: 300, C1: 200, C2: 80, UNRATED: 20 },
      30,
      5,
    );
    expect(result).toEqual({ A1: 3, A2: 3, B1: 6, B2: 9, C1: 6, C2: 2, UNRATED: 1 });
    expect(Object.values(result).reduce((a, b) => a + b, 0)).toBe(30);
  });

  it('breaks equal remainders deterministically by input order', () => {
    const result = allocate({ A1: 100, A2: 100, B1: 100 }, 20, 5);
    expect(result).toEqual({ A1: 7, A2: 7, B1: 6 });
    expect(Object.values(result).reduce((a, b) => a + b, 0)).toBe(20);
  });

  it('returns an empty object for empty input', () => {
    expect(allocate({})).toEqual({});
  });
});

describe('parseSince', () => {
  it('parses --since YYYY-MM-DD as Vietnam midnight (+07:00)', () => {
    expect(parseSince(['--since', '2026-11-21'])?.toISOString()).toBe('2026-11-20T17:00:00.000Z');
    expect(parseSince([])).toBeNull();
  });

  it('rejects invalid calendar dates', () => {
    expect(() => parseSince(['--since', '2026-02-30'])).toThrow(/Invalid date/);
  });
});
