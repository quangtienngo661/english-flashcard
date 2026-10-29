import { describe, expect, it } from 'vitest';
import type { RuleResult } from '../eval/eval.types.js';
import type { RunItemResult } from '../eval/run-stats.js';
import { baselineRequirement, gateTallies, publishWarnings } from './publish-check.js';

const rule = (status: RuleResult['status']): RuleResult => ({ status, problems: [], reason: null });
let position = 0;
const item = (exampleId: string, over: Partial<RunItemResult> = {}): RunItemResult => ({
  exampleId, position: (position += 1), split: exampleId.startsWith('h') ? 'held_out' : 'dev', status: 'succeeded', rule: rule('pass'), expectedResult: 'pass', ...over,
});
const failedCall = { status: 'permanent_failure', rule: null, expectedResult: null } as const;
const devItems = (count: number, failing = 0, prefix = 'x'): RunItemResult[] =>
  Array.from({ length: count }, (_, i) => item(`${prefix}${i}`, i < failing ? failedCall : {}));

describe('gateTallies (design §6.3 step 3)', () => {
  it('sums dev and held-out: shape over every item, rule and expected only where one was judged', () => {
    const items = [item('d1'), item('d2', { rule: rule('skipped'), expectedResult: null }), item('d3', { status: 'transient_failure', rule: null, expectedResult: null })];
    expect(gateTallies(items)).toEqual({ shape: { passed: 2, counted: 3 }, rule: { passed: 1, counted: 1 }, expected: { passed: 1, counted: 1 } });
  });

  it('counts held-out items too', () => {
    const tallies = gateTallies([item('d1'), item('h1', { rule: rule('fail'), expectedResult: 'fail' })]);
    expect(tallies).toEqual({ shape: { passed: 2, counted: 2 }, rule: { passed: 1, counted: 2 }, expected: { passed: 1, counted: 2 } });
  });

  it('pending and skipped items are not counted anywhere', () => {
    const tallies = gateTallies([item('d1'), item('d2', { status: 'pending', rule: null, expectedResult: null }), item('d3', { status: 'skipped', rule: null, expectedResult: null })]);
    expect(tallies.shape).toEqual({ passed: 1, counted: 1 });
  });
});

describe('publishWarnings', () => {
  it('Rate edge: a drop of exactly 5 points is no warning; 10 points is the first one', () => {
    const baseline = devItems(20);
    expect(publishWarnings(devItems(20, 1), baseline)).toEqual([{ code: 'dev-regressed', example_ids: ['x0'] }]);
    const warnings = publishWarnings(devItems(20, 2), baseline);
    expect(warnings[0]).toEqual({ code: 'rate-drop', criterion: 'shape', before: { passed: 20, counted: 20 }, after: { passed: 18, counted: 20 } });
  });

  it('is exact in integers: 5 points over a different number of items', () => {
    // 19/20 = 95% against 100%: exactly 5 points → none. 37/40 = 92.5% against 100% → 7.5 points → warns.
    expect(publishWarnings(devItems(40, 3), devItems(40)).map((w) => w.code)).toContain('rate-drop');
    expect(publishWarnings(devItems(40, 2), devItems(40)).map((w) => w.code)).not.toContain('rate-drop');
  });

  it('a criterion with nothing judged on either side is not compared: rules all skipped in the candidate → no rule warning', () => {
    const skipped = devItems(10).map((entry) => ({ ...entry, rule: rule('skipped') }));
    const warnings = publishWarnings(skipped, devItems(10));
    expect(warnings.filter((w) => w.code === 'rate-drop' && w.criterion === 'rule')).toEqual([]);
    expect(warnings).toEqual([]);
  });

  it('a rule drop and an expected-answer drop are named by criterion', () => {
    const baseline = devItems(10);
    const candidate = devItems(10).map((entry, i) => (i < 3 ? { ...entry, rule: rule('fail'), expectedResult: 'fail' as const } : entry));
    const warnings = publishWarnings(candidate, baseline);
    expect(warnings.filter((w) => w.code === 'rate-drop').map((w) => (w as { criterion: string }).criterion)).toEqual(['rule', 'expected']);
  });

  it('a dev example that passed before and fails now is listed; a held-out one is only a count and never named', () => {
    const baseline = [item('e1'), item('e2'), item('h1')];
    const candidate = [item('e1', { rule: rule('fail') }), item('e2'), item('h1', { expectedResult: 'fail' })];
    const warnings = publishWarnings(candidate, baseline);
    expect(warnings).toContainEqual({ code: 'dev-regressed', example_ids: ['e1'] });
    expect(warnings).toContainEqual({ code: 'held-out-failures-up', before: 0, after: 1 });
    expect(JSON.stringify(warnings)).not.toContain('h1');
  });

  it('the held-out failure count only warns when it rose', () => {
    const baseline = [item('d1'), item('h1', { expectedResult: 'fail' })];
    expect(publishWarnings([item('d1'), item('h1', { expectedResult: 'fail' })], baseline)).toEqual([]);
    expect(publishWarnings([item('d1'), item('h1')], baseline)).toEqual([]);
  });

  it('keeps the documented order: rate drops, then dev regressions, then held-out failures', () => {
    const baseline = [...devItems(20), item('h1')];
    const candidate = [...devItems(20, 4), item('h1', failedCall)];
    expect(publishWarnings(candidate, baseline).map((w) => w.code)).toEqual(['rate-drop', 'dev-regressed', 'held-out-failures-up']);
  });

  it('identical item lists → no warning', () => {
    const items = [item('d1'), item('d2'), item('h1')];
    expect(publishWarnings(items, structuredClone(items))).toEqual([]);
  });
});

describe('baselineRequirement (D37)', () => {
  it('a live config with a model needs a baseline run', () => {
    expect(baselineRequirement({ modelRef: '0b3c7a52-2c1d-4a8e-9a43-1f6f2f6a9d10' })).toBe('required');
  });

  it('a live config without a model has nothing to compare with', () => {
    expect(baselineRequirement({ modelRef: null })).toBe('not-required');
  });
});
