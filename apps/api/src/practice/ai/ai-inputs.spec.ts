import { describe, expect, it } from 'vitest';
import { deploy } from '../testing/ai-senses.js';
import { clozeInput, contentKey, mcqInput, meaningInput, wordCheckInput } from './ai-inputs.js';

describe('AI inputs (design §7.1, §15)', () => {
  it('learning content only: word, part of speech, level, Vietnamese meaning, context label', () => {
    const s = deploy({ context_label: 'software' });
    expect(clozeInput(s)).toEqual({ word: 'deploy', part_of_speech: 'verb', level: 'B1', meaning_vi: 'triển khai', context_label: 'software' });
    expect(meaningInput(s, ['a', 'b', 'c'])).toEqual({ ...clozeInput(s), other_meanings_vi: ['a', 'b', 'c'] });
    expect(mcqInput(s, 'deployed', ['released', 'shipped', 'posted']))
      .toEqual({ ...clozeInput(s), answer_form: 'deployed', candidates: ['released', 'shipped', 'posted'] });
  });

  it('a private word without part of speech or level sends unspecified and null', () => {
    const s = deploy({ scope: 'private', pos: null, level: null });
    expect(clozeInput(s)).toMatchObject({ part_of_speech: 'unspecified', level: null });
    expect(wordCheckInput(s)).toEqual({ word: 'deploy', part_of_speech: 'unspecified', meaning_vi: 'triển khai' });
  });

  it('a sense without a Vietnamese meaning is refused (availableTypes never offers it an AI type)', () => {
    expect(() => clozeInput(deploy({ gloss_vi: null }))).toThrow();
  });
});

describe('contentKey (design §7.6)', () => {
  it('sha-256 hex; NFC and trimmed meaning give the same key; case of the lemma, pos and meaning change it', () => {
    const key = contentKey('café', 'noun', 'quán cà phê');
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(contentKey('café', 'noun', '  quán cà phê ')).toBe(key);
    expect(contentKey('Café', 'noun', 'quán cà phê')).not.toBe(key);
    expect(contentKey('café', null, 'quán cà phê')).toBe(contentKey('café', 'unspecified', 'quán cà phê'));
    expect(contentKey('café', 'verb', 'quán cà phê')).not.toBe(key);
    expect(contentKey('café', 'noun', 'cà phê')).not.toBe(key);
  });
});
