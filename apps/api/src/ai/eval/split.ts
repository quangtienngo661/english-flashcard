import type { EvalSplit } from './eval.types.js';

/**
 * The split of the next example added to a working set (design §5.1, E10, R21): `held_out` while the held-out share is under the ratio,
 * counted over the whole working set of the operation, else `dev`. Whole percents keep the comparison exact.
 */
export function nextSplit(heldOut: number, total: number, ratio: number): EvalSplit {
  if (total === 0) return 'held_out';
  return heldOut * 100 < Math.round(ratio * 100) * total ? 'held_out' : 'dev';
}
