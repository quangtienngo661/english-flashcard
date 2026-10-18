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
      hints_shown: { level1: null, level2: null },
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
      hints_shown: { level1: null, level2: null },
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
      hints_shown: { level1: hints.level1, level2: null },
      learner: { answer: 'deploy', answers_tried: ['deplo'], result: 'wrong', hint_level: 1 },
    });
    expect(buildSnapshot(question, answered('x', { hint_level: 2 }))).toMatchObject({ hints_shown: hints });
    expect(buildSnapshot(question, answered('x'))).toMatchObject({ hints_shown: { level1: null, level2: null } });
  });
});
