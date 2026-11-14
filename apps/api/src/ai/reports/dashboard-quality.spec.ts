import { describe, expect, it } from 'vitest';
import { countVerdicts } from './dashboard-quality.js';

describe('countVerdicts (design §8.3)', () => {
  it('adds the rows of each verdict; a score with no verdict is unscored', () => {
    expect(countVerdicts([{ verdict: 'pass', n: 2 }, { verdict: 'fail_minor', n: 1 }, { verdict: null, n: 3 }]))
      .toEqual({ pass: 2, fail_major: 0, fail_minor: 1, unscored: 3 });
  });

  it('rows of the same verdict add up; no row is all zeros', () => {
    expect(countVerdicts([{ verdict: 'fail_major', n: 4 }, { verdict: 'fail_major', n: 1 }, { verdict: 'pass', n: 1 }]))
      .toEqual({ pass: 1, fail_major: 5, fail_minor: 0, unscored: 0 });
    expect(countVerdicts([])).toEqual({ pass: 0, fail_major: 0, fail_minor: 0, unscored: 0 });
  });
});
