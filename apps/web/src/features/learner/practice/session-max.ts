import type { AppConfig } from '@/app-shell/queries';

/** The API's ceiling in the scope_words mode when an older API does not send it (#249 §4). */
export const SCOPE_MAX = 100;

/** The most questions a session over `scopeWords` words may have: the admin's fixed number, or the scope's word count up to 100 (#249 §4). */
export function sessionMax(practice: AppConfig['practice'] | undefined, scopeWords: number): number {
  return practice?.session_max_mode === 'scope_words'
    ? Math.max(1, Math.min(scopeWords, practice.scope_questions_max ?? SCOPE_MAX))
    : (practice?.max_questions_per_session ?? 20);
}

/** A "Luyện N từ" start (owner 19/11/2026): one question per word, capped by the session max. */
export function wordsCount(practice: AppConfig['practice'] | undefined, words: number): number {
  return Math.max(1, Math.min(words, sessionMax(practice, words)));
}
