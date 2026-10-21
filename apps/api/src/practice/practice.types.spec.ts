import { describe, expect, it } from 'vitest';
import { isAiType } from './practice.types.js';

describe('isAiType (design §5)', () => {
  const rows: Array<[Parameters<typeof isAiType>[0], Parameters<typeof isAiType>[1], boolean]> = [
    ['cloze', 'ai', true],
    ['cloze', 'own', false],
    ['cloze', null, false],
    ['mcq_sentence', null, true],
    ['meaning_in_sentence', 'own', true],
    ['type_word', 'ai', false],
    ['mcq_definition', 'ai', false],
  ];
  for (const [type, clozeSource, expected] of rows) {
    it(`${type} with cloze source ${clozeSource} → ${expected}`, () => {
      expect(isAiType(type, clozeSource)).toBe(expected);
    });
  }
});
