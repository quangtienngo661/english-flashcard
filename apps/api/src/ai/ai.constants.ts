// Fixed numbers of the AI gateway (design §13 "cố định trong code"; all ASSUMPTION unless a decision is named). Tunable numbers
// live in the `ai` settings group; nothing outside this file writes these values as literals.

/** Version of the result shapes sent back in `meta` (design §5.5). */
export const AI_SCHEMA_VERSION = 1;
/** A finished result is replayed for 24 h per operation id (design §8.2). */
export const RESULT_TTL_MS = 86_400_000;
/** A `running` row is abandoned 20 s after its `deadline_at` (design §8.1, R1). */
export const ABANDON_GRACE_MS = 20_000;
/** An error within 2 s of the call's start counts as immediate (design §8.3). */
export const IMMEDIATE_ERROR_MS = 2_000;
/** A retry needs at least 2 s left in the budget (design §8.3). */
export const MIN_RETRY_BUDGET_MS = 2_000;
/** Random wait before the quick retry (design §8.3). */
export const RETRY_JITTER_MIN_MS = 250;
export const RETRY_JITTER_MAX_MS = 750;
/** Bound of a call that reads a model's information from the provider (design §4.3). */
export const AI_DESCRIBE_TIMEOUT_MS = 5_000;
/** Default token limit of each operation (design §5.4). */
export const DEFAULT_MAX_OUTPUT_TOKENS = { generate_cloze: 1200, lookup_word: 1200, translate_sentence: 800 } as const;
/** Upper bound of the token setting when the model's maximum is unknown (design §6.3). */
export const MAX_OUTPUT_TOKENS_UPPER = 128_000;
/** Sent to Anthropic when no limit is set and the model's maximum is unknown (D28). */
export const ANTHROPIC_MAX_TOKENS_FALLBACK = 16_000;
/** Prompt limits (design §7.3). */
export const PROMPT_INSTRUCTIONS_MAX = 8_000;
export const PROMPT_EXAMPLES_MAX = 10;
/** Examples per test run of a draft prompt (design §7.4). */
export const TEST_EXAMPLES_MAX = 5;
/** Example set (design §10). */
export const EVAL_EXAMPLES_PER_OPERATION_MAX = 100;
export const EVAL_JOB_CONCURRENCY = 3;
export const EVAL_QUEUED_RECOVER_MS = 600_000;
export const EVAL_RUNNING_STALE_MS = 900_000;
/** A model's information is read again after a day (design §14). */
export const MODEL_REFRESH_AFTER_MS = 86_400_000;
/** Warn this many days before a model's shutdown date (design §6.4). */
export const MODEL_SHUTDOWN_WARNING_DAYS = 30;
/** "Today" of the daily cap, status and costs (design §8.5, §13). */
export const AI_DAY_ZONE = 'Asia/Ho_Chi_Minh';
/** Actor of the gateway's own writes, e.g. the hourly model refresh (design §13). */
export const AI_SYSTEM_ACTOR_ID = '00000000-0000-4000-8000-000000000060';
/** Model ids an admin may add: no `/` or space, so an id never changes a provider URL (B6E96). */
export const MODEL_ID_PATTERN = /^[A-Za-z0-9._:-]{1,100}$/;
/** Operation ids from callers; `#` allows the `#2` suffix of D11 (plan choice 19). */
export const OPERATION_ID_PATTERN = /^[A-Za-z0-9._:#-]{1,100}$/;
/** Cost estimate shown next to a choice (design §6.6). */
export const ESTIMATE_INPUT_TOKENS = 600;
export const ESTIMATE_OUTPUT_TOKENS = 500;
export const ESTIMATE_DAILY_CALLS = 1000;
/** Admin text and price limits (plan choice 22). */
export const MODEL_NOTE_MAX = 500;
export const EVAL_NOTE_MAX = 500;
export const PRICE_MAX = 1000;

// Copies of Content's constants (R17: `ai` never imports Content; `ai.constants.spec.ts` compares them).
export const AI_VALID_POS = [
  'noun', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition', 'determiner',
  'conjunction', 'number', 'modal auxiliary', 'be-verb', 'do-verb', 'have-verb',
  'infinitive-to', 'interjection',
] as const;
export const AI_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
export const AI_POS_UNSET = 'unspecified';
export const WORD_MAX = 100;
export const MEANING_MAX = 300;
export const LEMMA_MAX = 100;
export const SENTENCE_MAX = 300;
/** A literal in `content/senses/senses.service.ts:58` (not exported), so the spec cannot compare it. */
export const CONTEXT_LABEL_MAX = 2_000;

// Output limits of the three operations (design §5.1–5.3).
export const TRANSLATION_MAX = 600;
export const ACCEPTED_ANSWERS_MAX = 5;
export const ACCEPTED_ANSWER_MAX = 100;
export const LOOKUP_EXAMPLES_MAX = 2;
