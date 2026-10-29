import type { JudgeVerdict } from './judge.types.js';

export type Agreement = {
  labeled: number;
  /** Both the label and the score are `pass`, or neither is. */
  agree: number;
  /** The label and the score are the same level. */
  agree_exact: number;
  rate: number | null;
  exact_rate: number | null;
  calibrated: boolean;
};

/**
 * How far a judge revision agrees with the owner's labels (design §5.4, D15). Calibrated needs enough labels and a high enough
 * agreement; the ratio is compared in whole percents, so 84.9% is not 85%.
 */
export function agreement(pairs: Array<{ label: JudgeVerdict; score: JudgeVerdict }>, min: { labels: number; ratio: number }): Agreement {
  const labeled = pairs.length;
  const agree = pairs.filter((pair) => (pair.label === 'pass') === (pair.score === 'pass')).length;
  const exact = pairs.filter((pair) => pair.label === pair.score).length;
  return {
    labeled,
    agree,
    agree_exact: exact,
    rate: labeled > 0 ? agree / labeled : null,
    exact_rate: labeled > 0 ? exact / labeled : null,
    calibrated: labeled > 0 && labeled >= min.labels && agree * 100 >= Math.round(min.ratio * 100) * labeled,
  };
}
