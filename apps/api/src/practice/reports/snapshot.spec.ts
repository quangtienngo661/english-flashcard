import { describe, expect, it } from 'vitest';
import { PRIVATE_MEANING_MASK, PRIVATE_WORD_MASK } from '../practice.constants.js';
import type { AnswerKey, Hints, Prompt } from '../practice.types.js';
import { buildSnapshot } from './snapshot.js';

const reveal = { lemma: 'deploy', meaning: 'triển khai', definition_en: 'to put software into use' };
const hints: Hints = {
  level1: { kind: 'definition', text: 'to put software into use' },
  level2: { first_letter: 'd', length: 6 },
};
const noHints: Hints = { level1: null, level2: null };
const mcqPrompt: Prompt = {
  kind: 'mcq', meaning: 'triển khai', meaning_language: 'vi', context_label: null,
  options: ['release', 'standup', 'deploy', 'merge'],
};
const mcqKey: AnswerKey = {
  reveal, asked_private: false, kind: 'mcq', correct_index: 2, option_private: [false, true, false, false],
};
const answered = (answer_raw: string | null, extra: Partial<{ answers_tried: string[]; result: string | null; hint_level: number }> = {}) =>
  ({ answer_raw, answers_tried: [], result: 'wrong', hint_level: 0, ...extra });
const deepStrings = (value: unknown): string[] => typeof value === 'string' ? [value]
  : Array.isArray(value) ? value.flatMap(deepStrings)
  : value !== null && typeof value === 'object' ? Object.values(value).flatMap(deepStrings) : [];

describe('buildSnapshot', () => {
  it('B4E48: a private option and the learner\'s choice of it are masked; no field holds the private lemma', () => {
    const snapshot = buildSnapshot({ type: 'mcq_definition', prompt: mcqPrompt, answerKey: mcqKey, hints: noHints }, answered('1'));
    expect(snapshot).toEqual({
      type: 'mcq_definition',
      prompt: { ...mcqPrompt, options: ['release', PRIVATE_WORD_MASK, 'deploy', 'merge'] },
      correct: { lemma: 'deploy', meaning: 'triển khai', definition_en: 'to put software into use', option_index: 2 },
      hints_shown: { level1: null, level2: null, level3: null },
      learner: { answer: PRIVATE_WORD_MASK, answers_tried: [], result: 'wrong', hint_level: 0 },
    });
    expect(deepStrings(snapshot).some((text) => text.includes('standup'))).toBe(false);
  });

  it('a catalog option the learner chose is shown as its text', () => {
    const snapshot = buildSnapshot({ type: 'mcq_definition', prompt: mcqPrompt, answerKey: mcqKey, hints: noHints }, answered('0'));
    expect(snapshot).toMatchObject({ learner: { answer: 'release' } });
  });

  it('an unanswered item has no learner answer', () => {
    const snapshot = buildSnapshot({ type: 'mcq_definition', prompt: mcqPrompt, answerKey: mcqKey, hints: noHints },
      answered(null, { result: null }));
    expect(snapshot).toMatchObject({ learner: { answer: null, result: null } });
  });

  it('B4E49: a true/false paired with a private meaning masks that meaning', () => {
    const prompt: Prompt = { kind: 'true_false', lemma: 'deploy', meaning: 'buổi họp đứng', meaning_language: 'vi', context_label: null };
    const answerKey: AnswerKey = { reveal, asked_private: false, kind: 'true_false', is_true: false, paired_private: true };
    const snapshot = buildSnapshot({ type: 'true_false_definition', prompt, answerKey, hints: noHints }, answered('true'));
    expect(snapshot).toEqual({
      type: 'true_false_definition',
      prompt: { ...prompt, meaning: PRIVATE_MEANING_MASK },
      correct: { ...reveal, is_true: false },
      hints_shown: { level1: null, level2: null, level3: null },
      learner: { answer: 'true', answers_tried: [], result: 'wrong', hint_level: 0 },
    });
    expect(deepStrings(snapshot).some((text) => text.includes('họp đứng'))).toBe(false);
  });

  it('a true/false with a catalog pairing keeps its meaning', () => {
    const prompt: Prompt = { kind: 'true_false', lemma: 'deploy', meaning: 'hợp nhất', meaning_language: 'vi', context_label: null };
    const answerKey: AnswerKey = { reveal, asked_private: false, kind: 'true_false', is_true: false, paired_private: false };
    expect(buildSnapshot({ type: 'true_false_definition', prompt, answerKey, hints: noHints }, answered('false', { result: 'correct' })))
      .toMatchObject({ prompt: { meaning: 'hợp nhất' } });
  });

  it('typing carries the accepted answers, the earlier tries and the hints seen up to hint_level', () => {
    const prompt: Prompt = { kind: 'type_sentence', sentence: 'We ___ the app yesterday.' };
    const answerKey: AnswerKey = { reveal, asked_private: false, kind: 'type_word', main: 'deployed', accepted: ['deployed'] };
    const question = { type: 'type_word' as const, prompt, answerKey, hints };
    expect(buildSnapshot(question, answered('deploy', { answers_tried: ['deplo'], hint_level: 1 }))).toEqual({
      type: 'type_word',
      prompt,
      correct: { ...reveal, main: 'deployed', accepted: ['deployed'] },
      hints_shown: { level1: hints.level1, level2: null, level3: null },
      learner: { answer: 'deploy', answers_tried: ['deplo'], result: 'wrong', hint_level: 1 },
    });
    expect(buildSnapshot(question, answered('x', { hint_level: 2 }))).toMatchObject({ hints_shown: hints });
    expect(buildSnapshot(question, answered('x'))).toMatchObject({ hints_shown: { level1: null, level2: null } });
  });

  it('B7E80 meaning_in_sentence: private wrong meanings are masked as meanings; the asked private word and its meaning are kept', () => {
    const prompt: Prompt = {
      kind: 'meaning_in_sentence', sentence: 'We deploy on Fridays.', highlight: 'deploy', meaning_language: 'vi',
      options: ['buổi họp đứng', 'triển khai', 'hợp nhất', 'nghĩa riêng khác'],
    };
    const answerKey: AnswerKey = {
      reveal, asked_private: true, translation_vi: 'Chúng tôi triển khai vào thứ Sáu.', kind: 'mcq', correct_index: 1,
      option_private: [true, true, false, true],
    };
    const snapshot = buildSnapshot({ type: 'meaning_in_sentence', prompt, answerKey, hints: noHints }, answered('0'));
    expect(snapshot).toEqual({
      type: 'meaning_in_sentence',
      prompt: { ...prompt, options: [PRIVATE_MEANING_MASK, 'triển khai', 'hợp nhất', PRIVATE_MEANING_MASK] },
      correct: { ...reveal, option_index: 1 },
      hints_shown: { level1: null, level2: null, level3: null },
      learner: { answer: PRIVATE_MEANING_MASK, answers_tried: [], result: 'wrong', hint_level: 0 },
    });
    const strings = deepStrings(snapshot);
    expect(strings.some((text) => text.includes('họp đứng') || text.includes('nghĩa riêng khác'))).toBe(false);
  });

  it('mcq_sentence: a private distractor word is masked as a word', () => {
    const prompt: Prompt = { kind: 'mcq_sentence', sentence: 'We ___ on Fridays.', options: ['standup', 'deploy', 'merge', 'release'] };
    const answerKey: AnswerKey = { reveal, asked_private: false, kind: 'mcq', correct_index: 1, option_private: [true, false, false, false] };
    const snapshot = buildSnapshot({ type: 'mcq_sentence', prompt, answerKey, hints: noHints }, answered('1', { result: 'correct' }));
    expect(snapshot).toMatchObject({
      prompt: { options: [PRIVATE_WORD_MASK, 'deploy', 'merge', 'release'] }, correct: { option_index: 1 }, learner: { answer: 'deploy' },
    });
    expect(deepStrings(snapshot).some((text) => text.includes('standup'))).toBe(false);
  });

  it('a Bước 4 mcq asking a catalog word still masks a private option at the correct index', () => {
    const answerKey: AnswerKey = { ...mcqKey, option_private: [false, false, true, false] };
    expect(buildSnapshot({ type: 'mcq_definition', prompt: mcqPrompt, answerKey, hints: noHints }, answered('2')))
      .toMatchObject({ prompt: { options: ['release', 'standup', PRIVATE_WORD_MASK, 'merge'] } });
  });

  it('cloze carries main and accepted; level 3 is in hints_shown once seen', () => {
    const prompt: Prompt = { kind: 'cloze', sentence: 'We ___ the app yesterday.' };
    const answerKey: AnswerKey = { reveal, asked_private: false, kind: 'type_word', main: 'deployed', accepted: ['deployed'] };
    const clozeHints: Hints = {
      level1: { kind: 'first_letter', text: 'd' }, level2: { kind: 'definition', text: 'to put software into use' },
      level3: { kind: 'meaning', text: 'triển khai' },
    };
    const question = { type: 'cloze' as const, prompt, answerKey, hints: clozeHints };
    expect(buildSnapshot(question, answered('deploy', { hint_level: 3 }))).toEqual({
      type: 'cloze', prompt, correct: { ...reveal, main: 'deployed', accepted: ['deployed'] }, hints_shown: clozeHints,
      learner: { answer: 'deploy', answers_tried: [], result: 'wrong', hint_level: 3 },
    });
    expect(buildSnapshot(question, answered('x', { hint_level: 2 }))).toMatchObject({ hints_shown: { level3: null } });
  });
});
