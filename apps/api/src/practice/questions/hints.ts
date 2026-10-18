import type { Hints, PromptStyle, QuestionType } from '../practice.types.js';

export type HintInput = {
  type: QuestionType;
  style: PromptStyle;
  meaning: { text: string; language: 'vi' | 'en' };
  definition_en: string | null;
  // The first example (stored order) that maskExample accepts, already masked; null when none matches.
  maskedFirstExample: string | null;
  // The expected answer: the lemma for a meaning prompt, the form in the sentence for a sentence prompt.
  main: string;
  maxDefinitionChars: number;
};

/**
 * Hints computed when the question is built (design 7.7, 7.4b step 4). Level 1: for a meaning prompt the short definition
 * unless the prompt already shows the English meaning, else the masked first example; for a sentence prompt the short
 * definition, else the meaning. Level 2, typing only: first letter and letter count of `main`, spaces not counted.
 */
export function buildHints(input: HintInput): Hints {
  const definition = input.definition_en;
  const short = definition !== null && [...definition].length <= input.maxDefinitionChars ? definition : null;
  let level1: Hints['level1'];
  if (input.style === 'sentence') {
    level1 = short !== null ? { kind: 'definition', text: short } : { kind: 'meaning', text: input.meaning.text };
  } else if (short !== null && input.meaning.language !== 'en') {
    level1 = { kind: 'definition', text: short };
  } else {
    level1 = input.maskedFirstExample !== null ? { kind: 'example', text: input.maskedFirstExample } : null;
  }
  const level2 = input.type === 'type_word'
    ? { first_letter: [...input.main][0] ?? '', length: [...input.main].filter((ch) => ch !== ' ').length }
    : null;
  return { level1, level2 };
}
