import { describe, expect, it } from 'vitest';
import { bucketOf, proUsageSpread, usedShare } from './pro-usage.js';

const pools = (ai_practice: number, ai_lookup: number) => ({ ai_practice, ai_lookup });

describe('usedShare', () => {
  it('each pool is measured against its own limit and the larger share wins', () => {
    // practice 10 / 100 = 10 %, lookup 9 / 10 = 90 %: the learner who ran low on lookups counts as 90 %.
    expect(usedShare(pools(100, 10), pools(10, 9))).toBeCloseTo(0.9);
    expect(usedShare(pools(100, 10), pools(80, 1))).toBeCloseTo(0.8);
  });

  it('a pool with no limit above 0 has no share; the other pool decides', () => {
    expect(usedShare(pools(0, 20), pools(0, 5))).toBeCloseTo(0.25);
    expect(usedShare(pools(40, 0), pools(10, 0))).toBeCloseTo(0.25);
  });

  it('no limit in either pool → null (there is nothing to take a share of)', () => {
    expect(usedShare(pools(0, 0), pools(0, 0))).toBeNull();
  });

  it('a learner over the limit (the limit was lowered after the use) has a share above 1', () => {
    expect(usedShare(pools(10, 0), pools(12, 0))).toBeCloseTo(1.2);
  });
});

describe('bucketOf', () => {
  it.each([
    [0, '0'], [0.001, '1-49'], [0.25, '1-49'], [0.499, '1-49'],
    [0.5, '50-79'], [0.79, '50-79'],
    [0.8, '80-99'], [0.999, '80-99'],
    [1, '100'], [1.2, '100'],
  ] as const)('share %s → bucket %s', (share, bucket) => {
    expect(bucketOf(share)).toBe(bucket);
  });

  it('exact fractions fall on the right side of each edge', () => {
    expect(bucketOf(1 / 2)).toBe('50-79');
    expect(bucketOf(4 / 5)).toBe('80-99');
    expect(bucketOf(300 / 300)).toBe('100');
    expect(bucketOf(299 / 300)).toBe('80-99');
    expect(bucketOf(149 / 300)).toBe('1-49');
  });
});

describe('proUsageSpread', () => {
  it('no Pro learner → every bucket 0, in the fixed order', () => {
    expect(proUsageSpread([])).toEqual({
      pro_learners: 0, no_limit: 0,
      buckets: [
        { key: '0', learners: 0 }, { key: '1-49', learners: 0 }, { key: '50-79', learners: 0 }, { key: '80-99', learners: 0 },
        { key: '100', learners: 0 },
      ],
    });
  });

  it('counts each learner once, in the bucket of the larger share', () => {
    const spread = proUsageSpread([
      { limits: pools(300, 100), used: pools(0, 0) },
      { limits: pools(300, 100), used: pools(30, 0) },
      { limits: pools(300, 100), used: pools(0, 49) },
      { limits: pools(300, 100), used: pools(150, 10) },
      { limits: pools(300, 100), used: pools(10, 85) },
      { limits: pools(300, 100), used: pools(300, 5) },
      { limits: pools(300, 100), used: pools(20, 100) },
    ]);
    expect(spread.pro_learners).toBe(7);
    expect(spread.buckets).toEqual([
      { key: '0', learners: 1 }, { key: '1-49', learners: 2 }, { key: '50-79', learners: 1 }, { key: '80-99', learners: 1 },
      { key: '100', learners: 2 },
    ]);
  });

  it('a learner with custom numbers is measured against them, not the plan’s', () => {
    // 20 of a custom 20 is full, although 20 of the plan’s 300 would be 7 %.
    const spread = proUsageSpread([{ limits: pools(20, 100), used: pools(20, 0) }, { limits: pools(300, 100), used: pools(20, 0) }]);
    expect(spread.buckets.map((b) => b.learners)).toEqual([0, 1, 0, 0, 1]);
  });

  it('a learner with no AI limit is counted as a Pro learner and in no_limit, never in a bucket', () => {
    const spread = proUsageSpread([{ limits: pools(0, 0), used: pools(0, 0) }, { limits: pools(10, 0), used: pools(0, 0) }]);
    expect(spread).toMatchObject({ pro_learners: 2, no_limit: 1 });
    expect(spread.buckets.reduce((sum, b) => sum + b.learners, 0)).toBe(1);
  });
});
