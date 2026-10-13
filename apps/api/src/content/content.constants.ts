export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
export type Level = (typeof LEVELS)[number];

export const VALID_POS = [
  'noun', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition', 'determiner',
  'conjunction', 'number', 'modal auxiliary', 'be-verb', 'do-verb', 'have-verb',
  'infinitive-to', 'interjection',
] as const;

export const FUNCTION_WORD_POS = [
  'pronoun', 'preposition', 'determiner', 'conjunction', 'modal auxiliary',
  'be-verb', 'do-verb', 'have-verb', 'infinitive-to',
] as const;

export function isFunctionWordPos(pos: string): boolean {
  return FUNCTION_WORD_POS.some((value) => value === pos);
}

export const OWNER_SOURCE_ID = '00000000-0000-4000-8000-000000000001';
export const MAX_EXAMPLES = 3;
