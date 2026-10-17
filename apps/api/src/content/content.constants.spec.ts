import { describe, expect, it } from 'vitest';
import {
  FUNCTION_WORD_POS, LEVELS, MAX_EXAMPLES, OWNER_SOURCE_ID, VALID_POS, isFunctionWordPos,
  type Level,
} from './index.js';

describe('content constants', () => {
  it("VALID_POS has the 15 CEFR-J 1.5 values; FUNCTION_WORD_POS is exactly the 9 values of design §5 and isFunctionWordPos('number') is false", () => {
    expect(VALID_POS).toEqual([
      'noun', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition', 'determiner',
      'conjunction', 'number', 'modal auxiliary', 'be-verb', 'do-verb', 'have-verb',
      'infinitive-to', 'interjection',
    ]);
    expect(FUNCTION_WORD_POS).toEqual([
      'pronoun', 'preposition', 'determiner', 'conjunction', 'modal auxiliary',
      'be-verb', 'do-verb', 'have-verb', 'infinitive-to',
    ]);
    for (const pos of FUNCTION_WORD_POS) expect(isFunctionWordPos(pos), pos).toBe(true);
    for (const pos of ['noun', 'verb', 'adjective', 'adverb', 'number', 'interjection', '', 'unknown']) {
      expect(isFunctionWordPos(pos), pos).toBe(false);
    }
    const level: Level = 'C2';
    expect(LEVELS).toEqual(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
    expect(LEVELS).toContain(level);
    expect(OWNER_SOURCE_ID).toBe('00000000-0000-4000-8000-000000000001');
    expect(MAX_EXAMPLES).toBe(3);
  });
});
