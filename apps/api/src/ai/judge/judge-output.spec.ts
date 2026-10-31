import { describe, expect, it } from 'vitest';
import { scoresFromOutput } from './judge-output.js';
import type { JudgeCriterion } from './judge.types.js';

const C: JudgeCriterion[] = [{ code: 'single_answer', question: 'Q1' }, { code: 'natural', question: 'Q2' }];

describe('scoresFromOutput (design §5.4)', () => {
  it('B13: no usable answer → every criterion is "không chấm được" with the failure as its problem', () => {
    expect(scoresFromOutput(C, null, 'invalid-shape')).toEqual([
      { criterion: 'single_answer', verdict: null, problem: 'invalid-shape', reason: null },
      { criterion: 'natural', verdict: null, problem: 'invalid-shape', reason: null },
    ]);
  });

  it('B14: a sent code with no entry is "missing"; the others keep their verdict and reason, in the order they were sent', () => {
    expect(scoresFromOutput(C, { codes: ['natural'], verdicts: ['fail_minor'], reasons: ['r'] }, null)).toEqual([
      { criterion: 'single_answer', verdict: null, problem: 'missing', reason: null },
      { criterion: 'natural', verdict: 'fail_minor', problem: null, reason: 'r' },
    ]);
  });

  it('Review focus 1: a repeated code is "duplicate" (not judged), and a code that was never sent is ignored', () => {
    expect(scoresFromOutput(C, {
      codes: ['single_answer', 'single_answer', 'natural', 'extra'], verdicts: ['pass', 'fail_major', 'pass', 'pass'], reasons: ['a', 'b', 'c', 'd'],
    }, null)).toEqual([
      { criterion: 'single_answer', verdict: null, problem: 'duplicate', reason: null },
      { criterion: 'natural', verdict: 'pass', problem: null, reason: 'c' },
    ]);
  });

  it('a clean answer gives one verdict per criterion', () => {
    expect(scoresFromOutput(C, { codes: ['natural', 'single_answer'], verdicts: ['pass', 'fail_major'], reasons: ['n', 's'] }, null)).toEqual([
      { criterion: 'single_answer', verdict: 'fail_major', problem: null, reason: 's' },
      { criterion: 'natural', verdict: 'pass', problem: null, reason: 'n' },
    ]);
  });

  it('a verdict outside the three is not judged (the gateway checks this too; the rule never trusts it)', () => {
    expect(scoresFromOutput([C[0]!], { codes: ['single_answer'], verdicts: ['great'], reasons: ['r'] }, null)).toEqual([
      { criterion: 'single_answer', verdict: null, problem: 'invalid-verdict', reason: null },
    ]);
  });

  it('a missing reason entry reads as null', () => {
    expect(scoresFromOutput([C[0]!], { codes: ['single_answer'], verdicts: ['pass'], reasons: [] }, null)).toEqual([
      { criterion: 'single_answer', verdict: 'pass', problem: null, reason: null },
    ]);
  });
});
