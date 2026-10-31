// Pure rules for judging the real AI questions of the last days (nhóm B M4, design §7.1): which question may be judged, what the judge is told.
import { AI_OPERATIONS, type AiOperation, type JudgeVerdict } from '../../ai/index.js';
import type { StoredAiInput } from '../ai/ai-question-generator.service.js';
import { PRIVATE_MEANING_MASK, PRIVATE_WORD_MASK } from '../practice.constants.js';
import type { AnswerKey } from '../practice.types.js';

/** The operations Practice makes questions with (the three a real-question pass can judge). */
export const PRACTICE_AI_OPERATIONS = ['generate_cloze', 'generate_meaning_question', 'generate_sentence_mcq'] as const;
export type PracticeAiOperation = (typeof PRACTICE_AI_OPERATIONS)[number];

/** One AI question of the window with what Practice kept about it: its meta, answer key, the data sent to the AI (null once the request was cleaned up) and the session's words. */
export type RealQuestionRow = {
  id: string;
  userId: string;
  senseId: string;
  createdAt: Date;
  aiMeta: unknown;
  answerKey: AnswerKey;
  aiInput: StoredAiInput | null;
  sessionSenseIds: string[];
};

/**
 * True when anything of the question is a learner's private word: the asked word, an option, a content key, or anything that was sent to the AI
 * (a private candidate that did not become one of the three distractors, a private wrong meaning). Such a question is never judged nor copied (R6, B39).
 */
export function touchesPrivateWord(q: { answerKey: AnswerKey | null; aiInput: StoredAiInput | null }): boolean {
  const { answerKey: key, aiInput: input } = q;
  if (key !== null) {
    if (key.asked_private) return true;
    if (key.kind === 'mcq' && key.option_private.some(Boolean)) return true;
  }
  if (input === null) return false;
  if (input.contentKey !== null) return true;
  if (input.type === 'mcq_sentence') return (input.form?.senses ?? []).some((sense) => sense.scope === 'private');
  if (input.type === 'meaning_in_sentence') return (input.wrong ?? []).some((sense) => sense.scope === 'private');
  return false;
}

/** A report's snapshot already shows an option as the mask of a private word or meaning (the question row is gone, so this is all that is left). */
export function maskedOptionIn(snapshot: unknown): boolean {
  if (snapshot === null || typeof snapshot !== 'object') return false;
  const prompt = (snapshot as { prompt?: unknown }).prompt;
  if (prompt === null || typeof prompt !== 'object') return false;
  const options = (prompt as { options?: unknown }).options;
  return Array.isArray(options) && options.some((option) => option === PRIVATE_WORD_MASK || option === PRIVATE_MEANING_MASK);
}

/** What the model answered: a JSON object, else null (a response that is not an object cannot be judged). */
export function parseOutput(response: string | null): Record<string, unknown> | null {
  if (response === null) return null;
  try {
    const parsed: unknown = JSON.parse(response);
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

/**
 * The words of the same session the judge may see: catalog lemmas in session order, without the asked sense, without a word that is not in the
 * catalog or is not known, and without a repeat in another case (the first spelling stays). A private word never gets here (R6).
 */
export function sessionWords(
  askedSenseId: string, sessionSenseIds: string[], senses: ReadonlyMap<string, { lemma: string; scope: 'catalog' | 'private' }>,
): string[] {
  const seen = new Set<string>();
  const words: string[] = [];
  for (const id of sessionSenseIds) {
    if (id === askedSenseId) continue;
    const sense = senses.get(id);
    if (!sense || sense.scope !== 'catalog') continue;
    const key = sense.lemma.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    words.push(sense.lemma);
  }
  return words;
}

const text = (value: unknown): string | null => (typeof value === 'string' ? value : null);

/** The fields of `practice_questions.ai_meta` that the pages and the dashboard read; anything missing or of another type is null. */
export function metaOf(aiMeta: unknown): {
  operation: AiOperation | null; config_number: number | null; model: string | null; provider: string | null; call_operation_id: string | null;
} {
  const meta = aiMeta !== null && typeof aiMeta === 'object' ? aiMeta as Record<string, unknown> : {};
  const operation = (AI_OPERATIONS as readonly unknown[]).includes(meta.operation) ? meta.operation as AiOperation : null;
  return {
    operation, config_number: Number.isInteger(meta.prompt_revision) ? meta.prompt_revision as number : null,
    model: text(meta.model), provider: text(meta.provider), call_operation_id: text(meta.call_operation_id),
  };
}

/** Some criterion failed (major or minor); a score with no verdict ("không chấm được") is neither a pass nor a failure. */
export function isFailing(scores: Array<{ verdict: JudgeVerdict | null }>): boolean {
  return scores.some((score) => score.verdict === 'fail_major' || score.verdict === 'fail_minor');
}
