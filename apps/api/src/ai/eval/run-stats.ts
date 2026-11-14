import type { EvalRunStatus } from './eval-runs.repository.js';
import type { EvalSplit, ExpectedResult, RuleResult, RunItemStatus } from './eval.types.js';

/** One example's result in a run, as the statistics read it. */
export type RunItemResult = {
  exampleId: string;
  position: number;
  split: EvalSplit;
  status: RunItemStatus;
  rule: RuleResult | null;
  expectedResult: ExpectedResult | null;
};

export type SplitStats = {
  total: number;
  pending: number;
  skipped: number;
  shape_pass: number;
  shape_fail: number;
  shape_transient: number;
  rule_pass: number;
  rule_fail: number;
  rule_skipped: number;
  rule_not_applicable: number;
  expected_pass: number;
  expected_fail: number;
  expected_none: number;
  /** Items that were tried and do not pass. */
  failing: number;
};

export type RegressionCriterion = 'shape' | 'rule' | 'expected';

const tried = (item: Pick<RunItemResult, 'status'>): boolean => item.status !== 'pending' && item.status !== 'skipped';

/** Passes = the call succeeded, no rule failed and no expected answer failed. */
export function itemPasses(item: RunItemResult): boolean {
  return item.status === 'succeeded' && item.rule?.status !== 'fail' && item.expectedResult !== 'fail';
}

const emptyStats = (): SplitStats => ({
  total: 0, pending: 0, skipped: 0, shape_pass: 0, shape_fail: 0, shape_transient: 0, rule_pass: 0, rule_fail: 0,
  rule_skipped: 0, rule_not_applicable: 0, expected_pass: 0, expected_fail: 0, expected_none: 0, failing: 0,
});

function addItem(stats: SplitStats, item: RunItemResult): void {
  stats.total += 1;
  if (item.status === 'pending') stats.pending += 1;
  else if (item.status === 'skipped') stats.skipped += 1;
  else if (item.status === 'succeeded') stats.shape_pass += 1;
  else {
    stats.shape_fail += 1;
    if (item.status === 'transient_failure') stats.shape_transient += 1;
  }
  if (item.status === 'succeeded') {
    if (item.rule?.status === 'pass') stats.rule_pass += 1;
    else if (item.rule?.status === 'fail') stats.rule_fail += 1;
    else if (item.rule?.status === 'skipped') stats.rule_skipped += 1;
    else if (item.rule?.status === 'not_applicable') stats.rule_not_applicable += 1;
    if (item.expectedResult === 'pass') stats.expected_pass += 1;
    else if (item.expectedResult === 'fail') stats.expected_fail += 1;
    else stats.expected_none += 1;
  }
  if (tried(item) && !itemPasses(item)) stats.failing += 1;
}

export function runStats(items: RunItemResult[]): { dev: SplitStats; held_out: SplitStats } {
  const result = { dev: emptyStats(), held_out: emptyStats() };
  for (const item of items) addItem(result[item.split], item);
  return result;
}

/** R11: a finished run whose every example has a call result; a transient failure counts as a result (it did not pass). */
export function isComplete(status: EvalRunStatus, items: Array<Pick<RunItemResult, 'status'>>): boolean {
  return status === 'finished' && items.length > 0 && items.every((item) => tried(item) && item.status !== 'in_progress');
}

function failedCriteria(item: RunItemResult): RegressionCriterion[] {
  const failed: RegressionCriterion[] = [];
  if (item.status !== 'succeeded') failed.push('shape');
  if (item.rule?.status === 'fail') failed.push('rule');
  if (item.expectedResult === 'fail') failed.push('expected');
  return failed;
}

/** Two runs on the same set (D20): statistics of both, and the examples that passed in `a` and do not pass in `b`. */
export function compareRuns(a: RunItemResult[], b: RunItemResult[]): {
  a: ReturnType<typeof runStats>;
  b: ReturnType<typeof runStats>;
  regressions: { dev: Array<{ exampleId: string; failed: RegressionCriterion[] }>; held_out: number };
} {
  const before = new Map(a.map((item) => [item.exampleId, item]));
  const regressions: { dev: Array<{ exampleId: string; failed: RegressionCriterion[] }>; held_out: number } = { dev: [], held_out: 0 };
  for (const now of [...b].sort((x, y) => x.position - y.position)) {
    const was = before.get(now.exampleId);
    if (!was || !tried(was) || !tried(now) || !itemPasses(was) || itemPasses(now)) continue;
    if (now.split === 'held_out') regressions.held_out += 1;
    else regressions.dev.push({ exampleId: now.exampleId, failed: failedCriteria(now) });
  }
  return { a: runStats(a), b: runStats(b), regressions };
}
