// Fixed in code (design 5.4, D21, D30); every other practice number comes from SettingsService.get().practice.
// Typed answer and report note lengths, in code points after NFC + trim.
export const ANSWER_MAX = 100;
export const NOTE_MAX = 300;

// Weak word: at least WEAK_MIN_WRONG wrong among the WEAK_WINDOW most recent counted attempts (D21).
export const WEAK_WINDOW = 5;
export const WEAK_MIN_WRONG = 2;

export const MCQ_OPTIONS = 4;
// Share of sentence prompts for typing when the prompt style is 'mixed' (ASSUMPTION, design 7.3).
export const SENTENCE_SHARE = 0.5;

// What staff see in place of a learner's private word (D36).
export const PRIVATE_WORD_MASK = '[từ riêng của người học]';
export const PRIVATE_MEANING_MASK = '[nghĩa của từ riêng]';

// Bước 7 (design §14, ASSUMPTION; fixed in code).
// retry_after_seconds of a 'preparing' slot.
export const PREPARING_RETRY_SECONDS = 2;
// At most this many distractor candidates are sent to generate_sentence_mcq.
export const MCQ_SENTENCE_CANDIDATES_MAX = 6;
// A 'generating' AI request untouched for this long is taken over by the next caller.
export const AI_REQUEST_STALE_MS = 120_000;
export const AI_REQUEST_RETENTION_DAYS = 7;
