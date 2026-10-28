import type { AiPool } from '../entitlements.types.js';

// Where Pro learners stand against their AI limit (the AI dashboard's usage card). Pure: no I/O.

export const PRO_USAGE_BUCKETS = ['0', '1-49', '50-79', '80-99', '100'] as const;
export type ProUsageBucket = (typeof PRO_USAGE_BUCKETS)[number];

type ByPool = Record<AiPool, number>;
const AI_POOLS: AiPool[] = ['ai_practice', 'ai_lookup'];

/**
 * How much of the AI limit a learner has used this cycle: each pool against its own limit, and the larger share counts (a learner
 * who has run out of one pool is as stuck as one who has run out of both). A pool whose limit is not above 0 has no share; null
 * when neither pool has one. Above 1 when the limit was lowered after the use.
 */
export function usedShare(limits: ByPool, used: ByPool): number | null {
  const shares = AI_POOLS.filter((pool) => limits[pool] > 0).map((pool) => used[pool] / limits[pool]);
  return shares.length === 0 ? null : Math.max(...shares);
}

/** 0 only for no use at all, so any use below half the limit is "1–49 %"; 100 is a full limit or more. */
export function bucketOf(share: number): ProUsageBucket {
  if (share <= 0) return '0';
  if (share < 0.5) return '1-49';
  if (share < 0.8) return '50-79';
  if (share < 1) return '80-99';
  return '100';
}

export type ProUsageSpread = {
  pro_learners: number;
  /** Pro learners with no AI limit above 0: they are in `pro_learners` but in no bucket. */
  no_limit: number;
  buckets: Array<{ key: ProUsageBucket; learners: number }>;
};

export function proUsageSpread(learners: Array<{ limits: ByPool; used: ByPool }>): ProUsageSpread {
  const counts = new Map<ProUsageBucket, number>(PRO_USAGE_BUCKETS.map((key) => [key, 0]));
  let noLimit = 0;
  for (const { limits, used } of learners) {
    const share = usedShare(limits, used);
    if (share === null) {
      noLimit += 1;
      continue;
    }
    const bucket = bucketOf(share);
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }
  return {
    pro_learners: learners.length,
    no_limit: noLimit,
    buckets: PRO_USAGE_BUCKETS.map((key) => ({ key, learners: counts.get(key) ?? 0 })),
  };
}
