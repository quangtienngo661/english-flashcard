import type { CandidateSense } from './practice-senses.js';

/**
 * Wrong meanings from a random catalog sample (design §7.4, D17 step 3): never the asked word or another excluded lemma (any
 * case), only senses with a Vietnamese gloss (sent to AI as `other_meanings_vi`), one per lemma, in the given order, at most `count`.
 */
export function meaningPool(senses: CandidateSense[], excludeLemmas: string[], count: number): CandidateSense[] {
  const seen = new Set(excludeLemmas.map((lemma) => lemma.toLowerCase()));
  const pool: CandidateSense[] = [];
  for (const sense of senses) {
    if (pool.length >= count) break;
    const key = sense.lemma.toLowerCase();
    if (seen.has(key) || !sense.gloss_vi?.trim()) continue;
    seen.add(key);
    pool.push(sense);
  }
  return pool;
}
