import { compareRuns, runStats, type RunItemResult } from '../eval/run-stats.js';
import type { PublishWarning, Tally } from './configs.types.js';

type Criterion = 'shape' | 'rule' | 'expected';
const CRITERIA: Criterion[] = ['shape', 'rule', 'expected'];

/** Pass counts of a run over every item of the set, dev and held-out alike (design §6.3 step 3). */
export function gateTallies(items: RunItemResult[]): Record<Criterion, Tally> {
  const { dev, held_out: heldOut } = runStats(items);
  const sum = (a: number, b: number) => a + b;
  return {
    shape: { passed: sum(dev.shape_pass, heldOut.shape_pass), counted: sum(dev.shape_pass + dev.shape_fail, heldOut.shape_pass + heldOut.shape_fail) },
    rule: { passed: sum(dev.rule_pass, heldOut.rule_pass), counted: sum(dev.rule_pass + dev.rule_fail, heldOut.rule_pass + heldOut.rule_fail) },
    expected: {
      passed: sum(dev.expected_pass, heldOut.expected_pass), counted: sum(dev.expected_pass + dev.expected_fail, heldOut.expected_pass + heldOut.expected_fail),
    },
  };
}

/**
 * True when the candidate's rate is more than 5 points under the baseline's: `100 × (b/bn − a/an) > 5`, written in integers (an exact
 * 5-point drop is no warning). `a` = candidate, `b` = baseline.
 */
const dropsMoreThanFivePoints = (a: Tally, b: Tally): boolean => 100 * (b.passed * a.counted - a.passed * b.counted) > 5 * a.counted * b.counted;

/**
 * What a publish should warn about, comparing the candidate's complete run with the baseline's on the same frozen set (design §6.3
 * step 3). Warnings never block. A criterion that nothing judged on either side is not compared; held-out ids are never listed.
 */
export function publishWarnings(candidate: RunItemResult[], baseline: RunItemResult[]): PublishWarning[] {
  const after = gateTallies(candidate);
  const before = gateTallies(baseline);
  const warnings: PublishWarning[] = [];
  for (const criterion of CRITERIA) {
    if (after[criterion].counted === 0 || before[criterion].counted === 0) continue;
    if (dropsMoreThanFivePoints(after[criterion], before[criterion])) {
      warnings.push({ code: 'rate-drop', criterion, before: before[criterion], after: after[criterion] });
    }
  }
  const regressed = compareRuns(baseline, candidate).regressions.dev.map((entry) => entry.exampleId);
  if (regressed.length > 0) warnings.push({ code: 'dev-regressed', example_ids: regressed });
  const failingBefore = runStats(baseline).held_out.failing;
  const failingAfter = runStats(candidate).held_out.failing;
  if (failingAfter > failingBefore) warnings.push({ code: 'held-out-failures-up', before: failingBefore, after: failingAfter });
  return warnings;
}

/**
 * Whether publishing needs a baseline run of the live config (D37): a live config without a model cannot be evaluated, so there is
 * nothing to compare with and the first model of an operation can be published on its own evidence.
 */
export function baselineRequirement(live: { modelRef: string | null }): 'required' | 'not-required' {
  return live.modelRef === null ? 'not-required' : 'required';
}
