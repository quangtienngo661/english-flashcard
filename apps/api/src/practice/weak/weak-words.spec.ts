import { describe, expect, it } from 'vitest';
import { countedAttempts, weakness, type Attempt } from './weak-words.js';

// Builds attempts oldest first, one minute apart: S = wrong, D = correct, H = correct with a hint.
function attempts(codes: string, reported: Attempt['reported'][] = []): Attempt[] {
  return [...codes].map((code, i) => ({
    result: code === 'S' ? 'wrong' : 'correct',
    hint_level: code === 'H' ? 1 : 0,
    reported: reported[i] ?? null,
    answered_at: new Date(Date.UTC(2026, 10, 1, 0, i)).toISOString(),
  }));
}

describe('weakness (design §8 table)', () => {
  it('B4#12: S, S → weak, "2 of 2"', () => {
    expect(weakness(attempts('SS'))).toEqual({ weak: true, wrong: 2, counted: 2, last_wrong_at: '2026-11-01T00:01:00.000Z' });
  });

  it('S, S, D, D, D → weak', () => {
    expect(weakness(attempts('SSDDD'))).toMatchObject({ weak: true, wrong: 2, counted: 5 });
  });

  it('B4#13: S, S then four correct → not weak', () => {
    expect(weakness(attempts('SSDDDD'))).toEqual({ weak: false, wrong: 1, counted: 5, last_wrong_at: '2026-11-01T00:01:00.000Z' });
  });

  it('S, S, then four correct with a hint → weak (hinted correct attempts are not counted)', () => {
    expect(weakness(attempts('SSHHHH'))).toMatchObject({ weak: true, wrong: 2, counted: 2 });
  });

  it('S (report open), S → not weak, only one wrong counted', () => {
    expect(weakness(attempts('SS', ['open', null]))).toMatchObject({ weak: false, wrong: 1, counted: 1 });
  });

  it('B4#14 (rule): a wrong attempt with an open report is not counted, with no_error it is, with fixed it is not', () => {
    expect(countedAttempts(attempts('S', ['open']))).toEqual([]);
    expect(countedAttempts(attempts('S', ['no_error']))).toHaveLength(1);
    expect(countedAttempts(attempts('S', ['fixed']))).toEqual([]);
    // Bước 7 design §8: a confirmed AI error is not the learner's mistake.
    expect(countedAttempts(attempts('S', ['confirmed']))).toEqual([]);
    expect(weakness(attempts('SS', ['no_error', null]))).toMatchObject({ weak: true, wrong: 2 });
    expect(weakness(attempts('SS', ['fixed', null]))).toMatchObject({ weak: false, wrong: 1 });
  });

  it('a wrong attempt with a hint still counts as wrong; the newest five are taken whatever the input order', () => {
    const list = attempts('SSDDDD').map((a, i) => (i === 0 ? { ...a, hint_level: 2 } : a)).reverse();
    expect(weakness(list)).toMatchObject({ weak: false, wrong: 1, counted: 5 });
    expect(weakness(attempts('SHS').map((a) => ({ ...a, hint_level: 1 })))).toMatchObject({ weak: true, wrong: 2, counted: 2 });
  });

  it('no counted attempt → not weak, no last wrong', () => {
    expect(weakness([])).toEqual({ weak: false, wrong: 0, counted: 0, last_wrong_at: null });
  });
});
