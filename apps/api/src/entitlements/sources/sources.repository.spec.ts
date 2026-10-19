import { describe, expect, it } from 'vitest';
import { grantLimits } from './sources.repository.js';

describe('grantLimits', () => {
  it('keeps the known keys with whole numbers ≥ 0, including 0', () => {
    expect(grantLimits({ ai_practice_per_cycle: 500, practice_sessions_per_day: 0 }))
      .toEqual({ ai_practice_per_cycle: 500, practice_sessions_per_day: 0 });
  });

  it('drops unknown keys and values that are not whole numbers ≥ 0 from a corrupt stored row', () => {
    expect(grantLimits({ foo: 9, ai_practice_per_cycle: null, ai_lookup_per_cycle: '5', practice_sessions_per_day: -1 })).toEqual({});
    expect(grantLimits({ ai_lookup_per_cycle: 2.5 })).toEqual({});
  });

  it('a value that is not an object gives null', () => {
    expect(grantLimits(null)).toBeNull();
    expect(grantLimits([1, 2])).toBeNull();
    expect(grantLimits(7)).toBeNull();
  });
});
