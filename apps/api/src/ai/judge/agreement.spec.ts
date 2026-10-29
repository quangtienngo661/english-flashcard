import { describe, expect, it } from 'vitest';
import { agreement } from './agreement.js';
import type { JudgeVerdict } from './judge.types.js';

const MIN = { labels: 30, ratio: 0.85 };
const same = (n: number): Array<{ label: JudgeVerdict; score: JudgeVerdict }> => Array.from({ length: n }, () => ({ label: 'pass', score: 'pass' }));
const off = (n: number): Array<{ label: JudgeVerdict; score: JudgeVerdict }> => Array.from({ length: n }, () => ({ label: 'pass', score: 'fail_major' }));

describe('agreement (D15, B17: "29 / 30 nhãn, 84,9% / 85%")', () => {
  it('29 labels agree 100% but are too few → not calibrated; 30 → calibrated', () => {
    expect(agreement(same(29), MIN)).toEqual({ labeled: 29, agree: 29, agree_exact: 29, rate: 1, exact_rate: 1, calibrated: false });
    expect(agreement(same(30), MIN).calibrated).toBe(true);
  });

  it('84.9% is not enough, 85.0% is (integer arithmetic over 1000 labels)', () => {
    expect(agreement([...same(849), ...off(151)], MIN)).toMatchObject({ labeled: 1000, agree: 849, rate: 0.849, calibrated: false });
    expect(agreement([...same(850), ...off(150)], MIN).calibrated).toBe(true);
  });

  it('agree = both pass or both not pass; exact needs the same level', () => {
    expect(agreement([{ label: 'fail_major', score: 'fail_minor' }], MIN)).toMatchObject({ agree: 1, agree_exact: 0 });
    expect(agreement([{ label: 'pass', score: 'fail_minor' }], MIN)).toMatchObject({ agree: 0 });
    expect(agreement([{ label: 'fail_minor', score: 'pass' }], MIN)).toMatchObject({ agree: 0 });
  });

  it('nothing labelled → no rate, not calibrated', () => {
    expect(agreement([], MIN)).toEqual({ labeled: 0, agree: 0, agree_exact: 0, rate: null, exact_rate: null, calibrated: false });
  });

  it('the thresholds are the settings: 10 labels at 0.5 are enough when the setting says so', () => {
    expect(agreement([...same(5), ...off(5)], { labels: 10, ratio: 0.5 }).calibrated).toBe(true);
    expect(agreement([...same(4), ...off(6)], { labels: 10, ratio: 0.5 }).calibrated).toBe(false);
  });
});
