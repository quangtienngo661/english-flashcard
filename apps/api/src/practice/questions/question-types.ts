import { MCQ_OPTIONS, SENTENCE_SHARE } from '../practice.constants.js';
import type { PromptStyle, QuestionType } from '../practice.types.js';
import type { QuestionWord } from './distractors.js';

/**
 * The chosen types this word can take (design 7.3): typing always; multiple choice needs MCQ_OPTIONS - 1 eligible
 * candidates, true/false one; a function word takes typing only.
 */
export function availableTypes(asked: QuestionWord, eligibleCount: number, chosen: QuestionType[]): QuestionType[] {
  return chosen.filter((type) => {
    if (type === 'type_word') return true;
    if (asked.function_word) return false;
    return eligibleCount >= (type === 'mcq_definition' ? MCQ_OPTIONS - 1 : 1);
  });
}

/** A random available type, preferring one other than the word's previous type in the session (design 7.2). */
export function chooseType(available: QuestionType[], previous: QuestionType | null, random: () => number): QuestionType {
  const other = available.filter((type) => type !== previous);
  const pool = other.length > 0 ? other : available;
  return pool[Math.floor(random() * pool.length)];
}

/** Prompt of a typing question: a sentence only when the word has a matching example (design 7.3 table). */
export function typingStyle(style: 'meaning' | 'sentence' | 'mixed', hasSentence: boolean, random: () => number): PromptStyle {
  if (!hasSentence || style === 'meaning') return 'meaning';
  if (style === 'sentence') return 'sentence';
  return random() < SENTENCE_SHARE ? 'sentence' : 'meaning';
}
