import { describe, expect, it } from 'vitest';
import { buildHints } from './hints.js';

const base = {
  type: 'type_word' as const,
  style: 'meaning' as const,
  meaning: { text: 'triển khai (phần mềm)', language: 'vi' as const },
  definition_en: 'to put software into use',
  maskedFirstExample: 'We ___ the app yesterday.',
  main: 'deploy',
  maxDefinitionChars: 200,
};

describe('buildHints', () => {
  it('meaning prompt: a short definition is level 1; typing has level 2', () => {
    expect(buildHints(base)).toEqual({
      level1: { kind: 'definition', text: 'to put software into use' },
      level2: { first_letter: 'd', length: 6 },
    });
  });

  it('hints: definition over 200 chars → masked example', () => {
    expect(buildHints({ ...base, definition_en: 'x'.repeat(201) }).level1).toEqual({ kind: 'example', text: 'We ___ the app yesterday.' });
    expect(buildHints({ ...base, definition_en: 'x'.repeat(200) }).level1).toEqual({ kind: 'definition', text: 'x'.repeat(200) });
  });

  it('hints: English meaning learner → masked example', () => {
    const hints = buildHints({ ...base, meaning: { text: 'to put software into use', language: 'en' } });
    expect(hints.level1).toEqual({ kind: 'example', text: 'We ___ the app yesterday.' });
  });

  it('no usable definition and no matching example → no level 1', () => {
    expect(buildHints({ ...base, definition_en: null, maskedFirstExample: null }).level1).toBeNull();
  });

  it('hints: private word → level 2 only', () => {
    const hints = buildHints({ ...base, meaning: { text: 'chỗ làm', language: 'vi' }, definition_en: null, maskedFirstExample: null, main: 'workplace' });
    expect(hints).toEqual({ level1: null, level2: { first_letter: 'w', length: 9 } });
  });

  it('level 2 of deploy → { first_letter: \'d\', length: 6 }; spaces are not counted', () => {
    expect(buildHints(base).level2).toEqual({ first_letter: 'd', length: 6 });
    expect(buildHints({ ...base, main: 'look after' }).level2).toEqual({ first_letter: 'l', length: 9 });
  });

  it('multiple choice and true/false have no level 2', () => {
    expect(buildHints({ ...base, type: 'mcq_definition' }).level2).toBeNull();
    expect(buildHints({ ...base, type: 'true_false_definition' }).level2).toBeNull();
  });

  it('sentence prompt: a short definition, else the meaning; level 2 uses the form in the sentence', () => {
    const sentence = { ...base, style: 'sentence' as const, main: 'deployed' };
    expect(buildHints(sentence)).toEqual({
      level1: { kind: 'definition', text: 'to put software into use' },
      level2: { first_letter: 'd', length: 8 },
    });
    expect(buildHints({ ...sentence, definition_en: 'x'.repeat(201) }).level1).toEqual({ kind: 'meaning', text: 'triển khai (phần mềm)' });
    expect(buildHints({ ...sentence, definition_en: null }).level1).toEqual({ kind: 'meaning', text: 'triển khai (phần mềm)' });
  });
});
