import type { AiOperation, GatewayOperation } from '../ai.types.js';
import { checkPrivateWord } from './check-private-word.js';
import type { OperationDefinition, OutputCheck } from './define-operation.js';
import { generateCloze } from './generate-cloze.js';
import { generateMeaningQuestion } from './generate-meaning-question.js';
import { generateSentenceMcq } from './generate-sentence-mcq.js';
import { judgeOperation } from './judge.js';
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

/** The six operations plus the judge: what the runner can run (nhóm B M3, E3). `OPERATIONS` keeps the six. */
export const GATEWAY_DEFINITIONS: Record<GatewayOperation, OperationDefinition> = { ...OPERATIONS, judge: judgeOperation };

/** Adapters return text; the gate parses it (plan choice 1). */
export function parseOutput(op: GatewayOperation, text: string): OutputCheck {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, problem: 'not-json' };
  }
  return GATEWAY_DEFINITIONS[op].checkOutput(value);
}
