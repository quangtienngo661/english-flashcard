import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { QuestionType } from '../practice.types.js';
import { seededRandom } from '../testing/seeded-random.js';
import type { QuestionWord } from './distractors.js';
import { availableTypes, chooseType, typingStyle } from './question-types.js';

const all: QuestionType[] = ['mcq_definition', 'true_false_definition', 'type_word'];
const word = (data: Partial<QuestionWord> = {}): QuestionWord => ({
  sense_id: randomUUID(), entry_id: randomUUID(), scope: 'catalog', lemma: 'deploy', gloss_vi: 'triển khai', definition_en: null,
  form_of_entry_id: null, function_word: false, ...data,
});

describe('availableTypes', () => {
  it('B4#19: two eligible → no multiple choice, true/false and typing available', () => {
    expect(availableTypes(word(), 2, all)).toEqual(['true_false_definition', 'type_word']);
  });

  it('three eligible → all three; none → typing only; only the chosen types are offered', () => {
    expect(availableTypes(word(), 3, all)).toEqual(all);
    expect(availableTypes(word(), 0, all)).toEqual(['type_word']);
    expect(availableTypes(word(), 0, ['mcq_definition'])).toEqual([]);
  });

  it('a function word → typing only', () => {
    expect(availableTypes(word({ function_word: true }), 10, all)).toEqual(['type_word']);
    expect(availableTypes(word({ function_word: true }), 10, ['mcq_definition', 'true_false_definition'])).toEqual([]);
  });

  it('a private word can take every type', () => {
    expect(availableTypes(word({ scope: 'private' }), 3, all)).toEqual(all);
  });
});

describe('chooseType', () => {
  it('chooseType prefers a different type', () => {
    for (let seed = 1; seed <= 50; seed++) {
      expect(chooseType(['mcq_definition', 'type_word'], 'mcq_definition', seededRandom(seed))).toBe('type_word');
    }
    // Only the previous type is available: it is used again.
    expect(chooseType(['type_word'], 'type_word', seededRandom(1))).toBe('type_word');
  });

  it('without a previous type, each available type gets picked', () => {
    const random = seededRandom(7);
    const seen = new Set(Array.from({ length: 100 }, () => chooseType(all, null, random)));
    expect(seen).toEqual(new Set(all));
  });
});

describe('typingStyle', () => {
  it('meaning → meaning; sentence → sentence when there is one, else meaning', () => {
    const random = seededRandom(1);
    expect(typingStyle('meaning', true, random)).toBe('meaning');
    expect(typingStyle('sentence', true, random)).toBe('sentence');
    expect(typingStyle('sentence', false, random)).toBe('meaning');
    expect(typingStyle('mixed', false, random)).toBe('meaning');
  });

  it('typingStyle mixed gives about half sentences over 1,000 seeded draws (seeded random)', () => {
    const random = seededRandom(42);
    const sentences = Array.from({ length: 1000 }, () => typingStyle('mixed', true, random)).filter((s) => s === 'sentence').length;
    expect(sentences).toBeGreaterThan(450);
    expect(sentences).toBeLessThan(550);
  });
});
