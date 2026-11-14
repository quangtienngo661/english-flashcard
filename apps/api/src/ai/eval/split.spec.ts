import { describe, expect, it } from 'vitest';
import type { EvalSplit } from './eval.types.js';
import { nextSplit } from './split.js';

/** Folds `nextSplit` over `additions` new examples, starting from a working set of `total` examples of which `heldOut` are held-out. */
function fold(additions: number, ratio: number, heldOut: number, total: number): EvalSplit[] {
  const splits: EvalSplit[] = [];
  for (let i = 0; i < additions; i += 1) {
    const split = nextSplit(heldOut, total, ratio);
    splits.push(split);
    total += 1;
    if (split === 'held_out') heldOut += 1;
  }
  return splits;
}

describe('nextSplit', () => {
  it('B3: an empty set and a set at exactly the ratio', () => {
    expect(nextSplit(0, 0, 0.3)).toBe('held_out');
    expect(nextSplit(0, 1, 0.3)).toBe('held_out');
    expect(nextSplit(1, 1, 0.3)).toBe('dev');
    expect(nextSplit(3, 10, 0.3)).toBe('dev');
    expect(nextSplit(2, 10, 0.3)).toBe('held_out');
  });

  it('R21: ten examples added one by one to an empty set land 3 held-out', () => {
    expect(fold(10, 0.3, 0, 0)).toEqual(['held_out', 'dev', 'dev', 'dev', 'held_out', 'dev', 'dev', 'held_out', 'dev', 'dev']);
  });

  it('R14: seven examples added after 14 migrated dev examples fill the held-out share first', () => {
    expect(fold(7, 0.3, 0, 14)).toEqual(['held_out', 'held_out', 'held_out', 'held_out', 'held_out', 'held_out', 'dev']);
  });

  it('the bounds 0.1 and 0.5 give one in ten and one in two', () => {
    expect(fold(10, 0.1, 0, 0)).toEqual(['held_out', 'dev', 'dev', 'dev', 'dev', 'dev', 'dev', 'dev', 'dev', 'dev']);
    expect(fold(4, 0.5, 0, 0)).toEqual(['held_out', 'dev', 'dev', 'held_out']);
  });
});
