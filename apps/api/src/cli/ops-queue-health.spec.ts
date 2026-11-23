import { describe, expect, it } from 'vitest';
import { oldestWaitingSeconds } from './ops-queue-health.js';

describe('oldestWaitingSeconds (OPS-04)', () => {
  it('returns null for an empty list', () => {
    expect(oldestWaitingSeconds([], 1000)).toBeNull();
  });

  it('returns floored seconds since the oldest job timestamp', () => {
    expect(oldestWaitingSeconds([1_000, 5_000], 61_000)).toBe(60);
    expect(oldestWaitingSeconds([10_500, 1_200], 61_900)).toBe(60);
  });
});
