import type { AiOperation } from '../ai.types.js';
import { checkPrivateWord } from './check-private-word.js';
import type { OperationDefinition, OutputCheck } from './define-operation.js';
import { generateCloze } from './generate-cloze.js';
import { generateMeaningQuestion } from './generate-meaning-question.js';
import { generateSentenceMcq } from './generate-sentence-mcq.js';
import { lookupWord } from './lookup-word.js';
import { translateSentence } from './translate-sentence.js';

export type { OperationDefinition, OutputCheck, OutputProblem } from './define-operation.js';

export const OPERATIONS: Record<AiOperation, OperationDefinition> = {
  generate_cloze: generateCloze,
  lookup_word: lookupWord,
  translate_sentence: translateSentence,
  generate_meaning_question: generateMeaningQuestion,
  generate_sentence_mcq: generateSentenceMcq,
  check_private_word: checkPrivateWord,
};

/** Adapters return text; the gate parses it (plan choice 1). */
export function parseOutput(op: AiOperation, text: string): OutputCheck {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, problem: 'not-json' };
  }
  return OPERATIONS[op].checkOutput(value);
}
