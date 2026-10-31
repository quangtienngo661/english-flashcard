import { describe, expect, it } from 'vitest';
import type { RuleResult } from './eval.types.js';
import { compareRuns, isComplete, itemPasses, runStats, type RunItemResult } from './run-stats.js';

const rule = (status: RuleResult['status']): RuleResult => ({ status, problems: [], reason: null });
let position = 0;
const item = (exampleId: string, over: Partial<RunItemResult> = {}): RunItemResult => ({
  exampleId, position: (position += 1), split: exampleId.startsWith('h') ? 'held_out' : 'dev', status: 'succeeded', rule: rule('pass'), expectedResult: 'pass', ...over,
});
const noResult = { rule: null, expectedResult: null } as const;

const ITEMS: RunItemResult[] = [
  item('d1'),
  item('d2', { status: 'transient_failure', ...noResult }),
  item('d3', { rule: rule('fail') }),
  item('d4', { rule: rule('skipped'), expectedResult: null }),
  item('d5', { status: 'pending', ...noResult }),
  item('h1', { expectedResult: 'fail' }),
];

describe('runStats', () => {
  it('B3: dev statistics are pinned per count', () => {
    expect(runStats(ITEMS).dev).toEqual({
      total: 5, pending: 1, skipped: 0, shape_pass: 3, shape_fail: 1, shape_transient: 1, rule_pass: 1, rule_fail: 1,
      rule_skipped: 1, rule_not_applicable: 0, expected_pass: 2, expected_fail: 0, expected_none: 1, failing: 2,
    });
  });

  it('B3: held-out statistics are computed apart from dev', () => {
    expect(runStats(ITEMS).held_out).toEqual({
      total: 1, pending: 0, skipped: 0, shape_pass: 1, shape_fail: 0, shape_transient: 0, rule_pass: 1, rule_fail: 0,
      rule_skipped: 0, rule_not_applicable: 0, expected_pass: 0, expected_fail: 1, expected_none: 0, failing: 1,
    });
  });

  it('counts skipped, unavailable and not_applicable rules', () => {
    const stats = runStats([
      item('d1', { status: 'skipped', ...noResult }),
      item('d2', { status: 'unavailable', ...noResult }),
      item('d3', { rule: rule('not_applicable') }),
    ]).dev;
    expect(stats).toEqual({
      total: 3, pending: 0, skipped: 1, shape_pass: 1, shape_fail: 1, shape_transient: 0, rule_pass: 0, rule_fail: 0,
      rule_skipped: 0, rule_not_applicable: 1, expected_pass: 1, expected_fail: 0, expected_none: 0, failing: 1,
    });
  });

  it('an empty run has all-zero statistics for both splits', () => {
    const zero = {
      total: 0, pending: 0, skipped: 0, shape_pass: 0, shape_fail: 0, shape_transient: 0, rule_pass: 0, rule_fail: 0,
      rule_skipped: 0, rule_not_applicable: 0, expected_pass: 0, expected_fail: 0, expected_none: 0, failing: 0,
    };
    expect(runStats([])).toEqual({ dev: zero, held_out: zero });
  });
});

describe('itemPasses', () => {
  it('needs a succeeded call, no failing rule and no failing expected answer', () => {
    expect(itemPasses(item('d1'))).toBe(true);
    expect(itemPasses(item('d1', { rule: rule('skipped'), expectedResult: null }))).toBe(true);
    expect(itemPasses(item('d1', { rule: rule('fail') }))).toBe(false);
    expect(itemPasses(item('d1', { expectedResult: 'fail' }))).toBe(false);
    expect(itemPasses(item('d1', { status: 'permanent_failure', ...noResult }))).toBe(false);
    expect(itemPasses(item('d1', { status: 'pending', ...noResult }))).toBe(false);
  });
});

describe('isComplete', () => {
  it('R11: a finished run is complete even with transient failures', () => {
    expect(isComplete('finished', [{ status: 'succeeded' }, { status: 'transient_failure' }])).toBe(true);
  });

  it('R11: a pending or skipped item, an unfinished run or a run without items is not complete', () => {
    expect(isComplete('finished', [{ status: 'pending' }])).toBe(false);
    expect(isComplete('finished', [{ status: 'skipped' }])).toBe(false);
    expect(isComplete('finished', [{ status: 'in_progress' }])).toBe(false);
    expect(isComplete('failed', [{ status: 'succeeded' }])).toBe(false);
    expect(isComplete('running', [{ status: 'succeeded' }])).toBe(false);
    expect(isComplete('finished', [])).toBe(false);
  });
});

describe('compareRuns', () => {
  const a = [item('x1'), item('x2'), item('x3', { status: 'transient_failure', ...noResult }), item('x4'), item('h1'), item('h2')];
  const b = [
    item('x1', { rule: rule('fail') }), item('x2'), item('x3'), item('x4', { status: 'pending', ...noResult }),
    item('h1', { expectedResult: 'fail' }), item('h2'),
  ];

  it('B10: a dev regression lists its failed criteria, a held-out one is only counted; pending items never count', () => {
    expect(compareRuns(a, b).regressions).toEqual({ dev: [{ exampleId: 'x1', failed: ['rule'] }], held_out: 1 });
  });

  it('lists failed criteria in the order shape, rule, expected, in the position order of the later run', () => {
    const later = [item('x2', { status: 'permanent_failure', ...noResult }), item('x1', { rule: rule('fail'), expectedResult: 'fail' })];
    expect(compareRuns([item('x1'), item('x2')], later).regressions.dev).toEqual([
      { exampleId: 'x2', failed: ['shape'] },
      { exampleId: 'x1', failed: ['rule', 'expected'] },
    ]);
  });

  it('carries both runs statistics', () => {
    const result = compareRuns(a, b);
    expect(result.a).toEqual(runStats(a));
    expect(result.b).toEqual(runStats(b));
  });

  it('an example that failed before and passes now is not a regression', () => {
    expect(compareRuns([item('x1', { rule: rule('fail') })], [item('x1')]).regressions).toEqual({ dev: [], held_out: 0 });
  });
});
