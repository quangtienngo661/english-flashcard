import { MCQ_OPTIONS, SENTENCE_SHARE } from '../practice.constants.js';
import type { ClozeRole, ClozeSource, PromptStyle, QuestionType } from '../practice.types.js';
import type { QuestionWord } from './distractors.js';

/** What the Bước 7 types need to know about a word (design §6.2); the caller gathers it. */
export type AiTypeFacts = {
  clozeSource: ClozeSource | null;
  // Only for 'own_then_ai': the side the caller asks about. Missing = either side is enough (the word stays in the session).
  clozeRole?: ClozeRole;
  hasViMeaning: boolean;
  // A saved context sentence of the sense that maskExample can mask.
  ownSentence: boolean;
  // Wrong meanings usable for meaning_in_sentence (with a Vietnamese meaning; for an `en` learner also an English definition).
  meaningPool: number;
  // Distractor candidates sharing a form with the asked word (design 7.5).
  mcqForms: number;
  // A private word whose current content was checked as not recognized (design 7.6).
  wordRejected: boolean;
};

/**
 * The chosen types this word can take (design 7.3): typing always; multiple choice needs MCQ_OPTIONS - 1 eligible
 * candidates, true/false one; a function word takes typing only. The Bước 7 types (design §6.2) need `extra`.
 */
export function availableTypes(
  asked: QuestionWord, eligibleCount: number, chosen: QuestionType[], extra?: AiTypeFacts,
): QuestionType[] {
  const aiBase = !!extra && extra.hasViMeaning && !asked.function_word && !extra.wordRejected;
  return chosen.filter((type) => {
    if (type === 'type_word') return true;
    if (type === 'cloze') return clozeAvailable(extra, aiBase);
    if (type === 'meaning_in_sentence') return aiBase && extra.meaningPool >= MCQ_OPTIONS - 1;
    if (type === 'mcq_sentence') return aiBase && extra.mcqForms >= MCQ_OPTIONS - 1;
    if (asked.function_word) return false;
    return eligibleCount >= (type === 'mcq_definition' ? MCQ_OPTIONS - 1 : 1);
  });
}

/**
 * Whether the cloze can be asked for this word. 'own' needs a maskable saved sentence; 'ai' needs what AI needs; 'own_then_ai' is
 * a saved sentence when the word has one, else AI: the own side takes the first, the AI side only a word with no saved sentence.
 */
function clozeAvailable(extra: AiTypeFacts | undefined, aiBase: boolean): boolean {
  if (extra?.clozeSource === 'own') return extra.ownSentence;
  if (extra?.clozeSource === 'own_then_ai') {
    if (extra.clozeRole === 'own') return extra.ownSentence;
    if (extra.clozeRole === 'ai') return aiBase && !extra.ownSentence;
    return extra.ownSentence || aiBase;
  }
  return aiBase;
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
