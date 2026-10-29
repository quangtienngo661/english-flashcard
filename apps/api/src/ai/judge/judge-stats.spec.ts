import { describe, expect, it } from 'vitest';
import type { Agreement } from './agreement.js';
import { gateTally, judgeComparison, judgeStatsRows, judgeTally, type RunJudgeScore } from './judge-stats.js';

const J = { judgeId: 'J', judgeName: 'Chỉ một đáp án', criterion: 'single_answer', problem: null, reason: null } as const;
const score = (itemId: string, split: 'dev' | 'held_out', revisionId: string, revision: number, verdict: RunJudgeScore['verdict']): RunJudgeScore => ({
  ...J, itemId, split, judgeRevisionId: revisionId, revision, verdict,
});
// a: d1 (dev) and h1 (held_out) scored by R1 and by R2; b: d1 scored by R2 only
const A = [
  score('d1', 'dev', 'R1', 1, 'pass'), score('h1', 'held_out', 'R1', 1, 'pass'),
  score('d1', 'dev', 'R2', 2, 'pass'), score('h1', 'held_out', 'R2', 2, 'fail_major'),
];
const B = [score('d1', 'dev', 'R2', 2, 'pass')];
const CALIBRATED: Agreement = { labeled: 30, agree: 30, agree_exact: 30, rate: 1, exact_rate: 1, calibrated: true };

describe('judgeTally and gateTally', () => {
  it('counts each verdict and the ones that could not be judged', () => {
    expect(judgeTally(['pass', 'pass', 'fail_major', 'fail_minor', null])).toEqual({ pass: 2, fail_major: 1, fail_minor: 1, unjudged: 1 });
    expect(judgeTally([])).toEqual({ pass: 0, fail_major: 0, fail_minor: 0, unjudged: 0 });
  });

  it('the gate counts what was judged: passed = pass, counted = pass + both fails; unjudged is not counted', () => {
    expect(gateTally({ pass: 2, fail_major: 1, fail_minor: 1, unjudged: 1 })).toEqual({ passed: 2, counted: 4 });
  });
});

describe('judgeStatsRows (B3: held-out only as a tally)', () => {
  it('one row per judge revision and criterion, dev and held-out apart, newest revision first, with the calibration flag', () => {
    const rows = judgeStatsRows(A, new Map([['R2|single_answer', CALIBRATED]]));
    expect(rows).toEqual([
      {
        judge_id: 'J', judge_name: 'Chỉ một đáp án', judge_revision_id: 'R2', revision: 2, criterion: 'single_answer',
        dev: { pass: 1, fail_major: 0, fail_minor: 0, unjudged: 0 }, held_out: { pass: 0, fail_major: 1, fail_minor: 0, unjudged: 0 }, calibrated: true,
      },
      {
        judge_id: 'J', judge_name: 'Chỉ một đáp án', judge_revision_id: 'R1', revision: 1, criterion: 'single_answer',
        dev: { pass: 1, fail_major: 0, fail_minor: 0, unjudged: 0 }, held_out: { pass: 1, fail_major: 0, fail_minor: 0, unjudged: 0 }, calibrated: false,
      },
    ]);
  });

  it('a revision not in the calibration map is not calibrated; an uncalibrated entry stays false', () => {
    const rows = judgeStatsRows(A, new Map([['R2|single_answer', { ...CALIBRATED, calibrated: false }]]));
    expect(rows.map((row) => row.calibrated)).toEqual([false, false]);
  });

  it('a score that could not be judged is counted as unjudged', () => {
    const rows = judgeStatsRows([score('d1', 'dev', 'R1', 1, null)], new Map());
    expect(rows[0]!.dev).toEqual({ pass: 0, fail_major: 0, fail_minor: 0, unjudged: 1 });
  });

  it('judges are ordered by name, then revision descending, then criterion', () => {
    const other = { ...score('d1', 'dev', 'R9', 1, 'pass'), judgeId: 'K', judgeName: 'A judge' };
    const second = { ...score('d1', 'dev', 'R2', 2, 'pass'), criterion: 'natural' };
    const rows = judgeStatsRows([...A.slice(0, 1), other, second], new Map());
    expect(rows.map((row) => [row.judge_name, row.revision, row.criterion])).toEqual([
      ['A judge', 1, 'single_answer'], ['Chỉ một đáp án', 2, 'natural'], ['Chỉ một đáp án', 1, 'single_answer'],
    ]);
  });
});

describe('judgeComparison (B11: only a revision that scored both runs is compared)', () => {
  it('compares R2 and lists R1 as scored by a only', () => {
    const result = judgeComparison(A, B);
    expect(result.judge.map((row) => row.judge_revision_id)).toEqual(['R2']);
    expect(result.judge[0]).toMatchObject({
      criterion: 'single_answer', a: { dev: { pass: 1 }, held_out: { fail_major: 1 } }, b: { dev: { pass: 1 }, held_out: { pass: 0, fail_major: 0, unjudged: 0 } },
    });
    expect(result.judge_unmatched).toEqual([{ judge_id: 'J', judge_name: 'Chỉ một đáp án', judge_revision_id: 'R1', revision: 1, scored: 'a' }]);
  });

  it('a revision that only scored the later run is "scored b"', () => {
    expect(judgeComparison([], B).judge_unmatched).toEqual([{ judge_id: 'J', judge_name: 'Chỉ một đáp án', judge_revision_id: 'R2', revision: 2, scored: 'b' }]);
    expect(judgeComparison([], []).judge).toEqual([]);
  });
});
