import { WEAK_MIN_WRONG, WEAK_WINDOW } from '../practice.constants.js';

// The weak-word rule (design §8); the reference for the SQL of PracticeStats (Task 14).
// One attempt = an item with a final result (correct / wrong); void items are never passed in.
export type Attempt = {
  result: 'correct' | 'wrong';
  hint_level: number;
  reported: 'open' | 'fixed' | 'no_error' | 'confirmed' | null;
  answered_at: string;
};

/** Drops correct attempts that used a hint, and attempts whose report is open, fixed or confirmed (no_error counts again). */
export function countedAttempts(attempts: Attempt[]): Attempt[] {
  return attempts.filter((a) => !(a.result === 'correct' && a.hint_level > 0) && a.reported !== 'open' && a.reported !== 'fixed' && a.reported !== 'confirmed');
}

/** Over the newest WEAK_WINDOW counted attempts: weak when at least WEAK_MIN_WRONG are wrong. */
export function weakness(attempts: Attempt[]): { weak: boolean; wrong: number; counted: number; last_wrong_at: string | null } {
  const recent = countedAttempts(attempts)
    .sort((a, b) => (a.answered_at < b.answered_at ? 1 : a.answered_at > b.answered_at ? -1 : 0))
    .slice(0, WEAK_WINDOW);
  const wrong = recent.filter((a) => a.result === 'wrong');
  return { weak: wrong.length >= WEAK_MIN_WRONG, wrong: wrong.length, counted: recent.length, last_wrong_at: wrong[0]?.answered_at ?? null };
}
