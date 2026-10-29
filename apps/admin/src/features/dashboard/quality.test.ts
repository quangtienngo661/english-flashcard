import { describe, expect, it } from 'vitest';
import type { DashboardJudgeRevision, JudgeScoreGroup, VerdictCounts } from './dashboard-api';
import { judgeCharts, judgeMarkers, scoredOf } from './quality';

const counts = (over: Partial<VerdictCounts> = {}): VerdictCounts => ({ pass: 0, fail_major: 0, fail_minor: 0, unscored: 0, ...over });
const revision = (id: string, n: number, over: Partial<DashboardJudgeRevision> = {}): DashboardJudgeRevision => ({
  id, judge_id: 'j1', judge_name: 'Chỉ một đáp án', revision: n, saved_at: '2026-10-29T00:00:00.000Z',
  criteria: [{ code: 'single_answer', labeled: 20, agree: n === 1 ? 19 : 10, calibrated: n === 1 }], ...over,
});
const group = (over: Partial<JudgeScoreGroup> = {}): JudgeScoreGroup => ({
  operation: 'generate_cloze', source: 'eval', config_number: 7, model: 'fake:ok', judge_revision_id: 'r1', criterion: 'single_answer',
  counts: counts({ pass: 8, fail_major: 1 }), first_scored_at: '2026-10-29T10:00:00.000Z', ...over,
});

describe('scoredOf', () => {
  it('counts the scores that have a verdict, never the ones that could not be scored', () => {
    expect(scoredOf(counts({ pass: 5, fail_major: 2, fail_minor: 1, unscored: 9 }))).toBe(8);
    expect(scoredOf(counts({ unscored: 3 }))).toBe(0);
  });
});

describe('judgeMarkers', () => {
  it('is every index where the judge revision differs from the one before', () => {
    expect(judgeMarkers([1, 1, 2, 2, 1])).toEqual([2, 4]);
  });

  it('has none for one column or for none, and none while the revision stays the same', () => {
    expect(judgeMarkers([3])).toEqual([]);
    expect(judgeMarkers([])).toEqual([]);
    expect(judgeMarkers([2, 2, 2])).toEqual([]);
  });
});

describe('judgeCharts', () => {
  const revisions = [revision('r1', 1), revision('r2', 2)];

  it('is one chart per operation, judge and criterion, its columns in the order they were first scored, a marker where the revision changes', () => {
    const eval_ = group({ judge_revision_id: 'r1', first_scored_at: '2026-10-29T10:00:00.000Z' });
    const real = group({ source: 'real', judge_revision_id: 'r2', first_scored_at: '2026-10-29T09:00:00.000Z' });
    const charts = judgeCharts([eval_, real], revisions);
    expect(charts).toHaveLength(1);
    expect(charts[0]).toMatchObject({ key: 'generate_cloze|j1|single_answer', operation: 'generate_cloze', judgeName: 'Chỉ một đáp án', criterion: 'single_answer' });
    expect(charts[0].columns.map((c) => [c.source, c.revision, c.calibrated])).toEqual([['real', 2, false], ['eval', 1, true]]);
    expect(charts[0].markers).toEqual([1]);
  });

  it('carries the label counts of the revision on the criterion, for the "x of y labels agree" line', () => {
    const [chart] = judgeCharts([group({ judge_revision_id: 'r2' })], revisions);
    expect(chart.columns[0]).toMatchObject({ revision: 2, labeled: 20, agree: 10, calibrated: false });
  });

  it('orders columns first scored at the same instant by config number, a null number last', () => {
    const at = '2026-10-29T10:00:00.000Z';
    const charts = judgeCharts([
      group({ config_number: null, first_scored_at: at }), group({ config_number: 9, first_scored_at: at }), group({ config_number: 3, first_scored_at: at }),
    ], revisions);
    expect(charts[0].columns.map((c) => c.config_number)).toEqual([3, 9, null]);
  });

  it('keeps two groups of one config number apart when their models differ (R12)', () => {
    const at = '2026-10-29T10:00:00.000Z';
    const [chart] = judgeCharts([group({ model: 'a:x', first_scored_at: at }), group({ model: 'b:y', first_scored_at: at })], revisions);
    expect(chart.columns.map((c) => c.model)).toEqual(['a:x', 'b:y']);
  });

  it('draws a separate chart for each operation and each criterion, operations in the app order', () => {
    const many = [
      group({ operation: 'lookup_word', criterion: 'single_answer' }),
      group({ operation: 'generate_cloze', criterion: 'natural' }),
      group({ operation: 'generate_cloze', criterion: 'single_answer' }),
    ];
    const keys = judgeCharts(many, [revision('r1', 1, { criteria: [{ code: 'single_answer', labeled: 0, agree: 0, calibrated: false }, { code: 'natural', labeled: 0, agree: 0, calibrated: false }] })])
      .map((chart) => chart.key);
    expect(keys).toEqual(['generate_cloze|j1|natural', 'generate_cloze|j1|single_answer', 'lookup_word|j1|single_answer']);
  });

  it('drops a group whose revision is not among the known ones, and a criterion the revision does not have counts as not calibrated', () => {
    expect(judgeCharts([group({ judge_revision_id: 'gone' })], revisions)).toEqual([]);
    const [chart] = judgeCharts([group({ criterion: 'other' })], revisions);
    expect(chart.columns[0].calibrated).toBe(false);
  });

  it('is empty for no groups', () => {
    expect(judgeCharts([], revisions)).toEqual([]);
  });
});
