/** Admin spend (tests, evals, judge passes) is capped per day, apart from the learners' cap (B20). `null` is no cap; 0 blocks everything. */
export function adminCapReached(spentUsd: number, capUsd: number | null): boolean {
  return capUsd !== null && spentUsd >= capUsd;
}
