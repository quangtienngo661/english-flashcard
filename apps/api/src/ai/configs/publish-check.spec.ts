import { describe, expect, it } from 'vitest';
import type { RuleResult } from '../eval/eval.types.js';
import type { RunItemResult } from '../eval/run-stats.js';
import type { RunJudgeScore } from '../judge/judge-stats.js';
import { baselineRequirement, gateTallies, judgeRateDrops, publishWarnings, rateDropped } from './publish-check.js';

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

describe('rateDropped (the 5-point rule, shared by the shape, rule, expected and judge criteria)', () => {
  it('more than 5 points under the baseline is a drop; exactly 5, or none, or better, is not', () => {
    expect(rateDropped({ passed: 20, counted: 20 }, { passed: 18, counted: 20 })).toBe(true);
    expect(rateDropped({ passed: 20, counted: 20 }, { passed: 19, counted: 20 })).toBe(false);
    expect(rateDropped({ passed: 20, counted: 20 }, { passed: 20, counted: 20 })).toBe(false);
    expect(rateDropped({ passed: 10, counted: 20 }, { passed: 20, counted: 20 })).toBe(false);
    expect(rateDropped({ passed: 40, counted: 40 }, { passed: 37, counted: 40 })).toBe(true);
  });
});

const R2 = 'rev-2';
const R3 = 'rev-3';
let itemSeq = 0;
const judged = (verdict: RunJudgeScore['verdict'], over: Partial<RunJudgeScore> = {}): RunJudgeScore => ({
  itemId: `item-${(itemSeq += 1)}`, split: 'dev', judgeId: 'J', judgeName: 'Chỉ một đáp án', judgeRevisionId: R2, revision: 2, criterion: 'single_answer',
  verdict, problem: null, reason: null, ...over,
});
/** `pass` passes and `fail` fail_minor, in that order. */
const verdicts = (pass: number, fail: number, over: Partial<RunJudgeScore> = {}): RunJudgeScore[] => [
  ...Array.from({ length: pass }, () => judged('pass', over)), ...Array.from({ length: fail }, () => judged('fail_minor', over)),
];

describe('judgeRateDrops (M3-T12, design §6.3 step 3, R11)', () => {
  it('baseline 20 of 20 pass, candidate 18 pass and 2 fail_minor → judge-rate-drop with both tallies', () => {
    expect(judgeRateDrops(verdicts(18, 2), verdicts(20, 0))).toEqual([{
      code: 'judge-rate-drop', judge_id: 'J', judge_name: 'Chỉ một đáp án', judge_revision_id: R2, revision: 2, criterion: 'single_answer',
      before: { passed: 20, counted: 20 }, after: { passed: 18, counted: 20 },
    }]);
  });

  it('19 of 20 is exactly 5 points: no warning', () => {
    expect(judgeRateDrops(verdicts(19, 1), verdicts(20, 0))).toEqual([]);
  });

  it('fail_major counts as not passed too; both splits are counted, held-out only as part of the tally', () => {
    const candidate = [...verdicts(10, 0), ...verdicts(0, 0), judged('fail_major', { split: 'held_out' }), judged('fail_major', { split: 'held_out' }), judged('pass', { split: 'held_out' })];
    const baseline = [...verdicts(10, 0), ...verdicts(3, 0, { split: 'held_out' })];
    const [warning] = judgeRateDrops(candidate, baseline);
    expect(warning).toMatchObject({ before: { passed: 13, counted: 13 }, after: { passed: 11, counted: 13 } });
    expect(JSON.stringify(warning)).not.toContain('item-');
  });

  it('B11: a candidate scored by R3 and a baseline scored by R2 share no revision → nothing is compared', () => {
    expect(judgeRateDrops(verdicts(0, 20, { judgeRevisionId: R3, revision: 3 }), verdicts(20, 0))).toEqual([]);
  });

  it('a revision that scored only one criterion in common is compared on that criterion alone', () => {
    const candidate = [...verdicts(0, 20), ...verdicts(20, 0, { criterion: 'natural' })];
    const baseline = [...verdicts(20, 0), ...verdicts(20, 0, { criterion: 'other' })];
    expect(judgeRateDrops(candidate, baseline).map((warning) => (warning as { criterion: string }).criterion)).toEqual(['single_answer']);
  });

  it('a NULL verdict lowers counted, not passed: 17 pass + 3 unjudged is 17 of 17, no drop; with a fail it is 17 of 18', () => {
    const baseline = verdicts(20, 0);
    expect(judgeRateDrops([...verdicts(17, 0), judged(null), judged(null), judged(null)], baseline)).toEqual([]);
    expect(judgeRateDrops([...verdicts(17, 1), judged(null), judged(null)], baseline)).toEqual([{
      code: 'judge-rate-drop', judge_id: 'J', judge_name: 'Chỉ một đáp án', judge_revision_id: R2, revision: 2, criterion: 'single_answer',
      before: { passed: 20, counted: 20 }, after: { passed: 17, counted: 18 },
    }]);
  });

  it('counted 0 on either side is not compared (nothing was judged there)', () => {
    expect(judgeRateDrops([judged(null), judged(null)], verdicts(20, 0))).toEqual([]);
    expect(judgeRateDrops(verdicts(0, 20), [judged(null)])).toEqual([]);
    expect(judgeRateDrops([], [])).toEqual([]);
  });

  it('rows are ordered by judge name, then newest revision first, then criterion', () => {
    const other = { judgeId: 'K', judgeName: 'A judge' } as const;
    const rows = (over: Partial<RunJudgeScore>) => verdicts(0, 20, over);
    const base = (over: Partial<RunJudgeScore>) => verdicts(20, 0, over);
    const candidate = [...rows({}), ...rows({ criterion: 'natural' }), ...rows({ ...other, judgeRevisionId: 'rev-k', revision: 1 })];
    const baseline = [...base({}), ...base({ criterion: 'natural' }), ...base({ ...other, judgeRevisionId: 'rev-k', revision: 1 })];
    expect(judgeRateDrops(candidate, baseline).map((warning) => { const w = warning as { judge_name: string; criterion: string }; return `${w.judge_name}/${w.criterion}`; }))
      .toEqual(['A judge/single_answer', 'Chỉ một đáp án/natural', 'Chỉ một đáp án/single_answer']);
  });
});

describe('publishWarnings with the judge (M3-T12)', () => {
  const judge = { candidate: verdicts(0, 20), baseline: verdicts(20, 0) };

  it('without judge scores the warnings are the ones of M2', () => {
    expect(publishWarnings(devItems(20), devItems(20))).toEqual([]);
    expect(publishWarnings(devItems(20), devItems(20), { candidate: [], baseline: [] })).toEqual([]);
  });

  it('the judge warning comes after the shape rate-drop and before dev-regressed and held-out-failures-up', () => {
    const baseline = [...devItems(20), item('h1')];
    const candidate = [...devItems(20, 2), item('h1', failedCall)];
    const codes = publishWarnings(candidate, baseline, judge).map((warning) => warning.code);
    expect(codes).toEqual(['rate-drop', 'judge-rate-drop', 'dev-regressed', 'held-out-failures-up']);
  });

  it('judge verdicts change neither dev-regressed nor the held-out failure count', () => {
    const items = devItems(20);
    expect(publishWarnings(items, items, judge).map((warning) => warning.code)).toEqual(['judge-rate-drop']);
  });
});
