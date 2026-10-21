import { describe, expect, it } from 'vitest';
import type { CandidateSense } from '../../content/index.js';
import { seededRandom } from '../testing/seeded-random.js';
import { aiQuestion, ownSentenceQuestion } from './ai-question.js';
import { candidate, deploy } from '../testing/ai-senses.js';

const MAX = 200;
const definition = 'to move software to a live system';

describe('aiQuestion: cloze (design §7.8, §8)', () => {
  const result = { sentence: 'We ___ the app every Friday.', accepted_answers: ['deploy'], translation_vi: 'Chúng tôi triển khai ứng dụng.' };

  it('prompt holds only the sentence; answer_key is type_word with translation_vi; blank is the main form', () => {
    const q = aiQuestion({ type: 'cloze', result }, deploy({ definition_en: definition }), 'vi', MAX, seededRandom(1));
    expect(q.type).toBe('cloze');
    expect(q.promptStyle).toBe('sentence');
    expect(q.prompt).toEqual({ kind: 'cloze', sentence: result.sentence });
    expect(q.answerKey).toMatchObject({
      kind: 'type_word', main: 'deploy', accepted: ['deploy'], translation_vi: result.translation_vi, asked_private: false,
    });
    expect(JSON.stringify(q.prompt)).not.toContain('triển khai');
    expect(q.blank).toEqual({ text: 'deploy', base: true });
    expect(q.distractorSenseIds).toEqual([]);
  });

  it('catalog word, vi learner → 3 levels: first letter, definition, Vietnamese meaning', () => {
    const q = aiQuestion({ type: 'cloze', result }, deploy({ definition_en: definition }), 'vi', MAX, seededRandom(1));
    expect(q.hints).toEqual({
      level1: { kind: 'first_letter', text: 'd' }, level2: { kind: 'definition', text: definition },
      level3: { kind: 'meaning', text: 'triển khai' },
    });
  });

  it('private word of a vi learner (no definition) → first letter, then the meaning moves up to level 2', () => {
    const q = aiQuestion({ type: 'cloze', result }, deploy({ scope: 'private', definition_en: null }), 'vi', MAX, seededRandom(1));
    expect(q.hints).toEqual({
      level1: { kind: 'first_letter', text: 'd' }, level2: { kind: 'meaning', text: 'triển khai' }, level3: null,
    });
    expect(q.answerKey.asked_private).toBe(true);
  });

  it('en learner → no Vietnamese meaning level; a definition longer than the setting is left out', () => {
    const en = aiQuestion({ type: 'cloze', result }, deploy({ definition_en: definition }), 'en', MAX, seededRandom(1));
    expect(en.hints).toEqual({ level1: { kind: 'first_letter', text: 'd' }, level2: { kind: 'definition', text: definition }, level3: null });
    const long = aiQuestion({ type: 'cloze', result }, deploy({ definition_en: definition }), 'en', 10, seededRandom(1));
    expect(long.hints).toEqual({ level1: { kind: 'first_letter', text: 'd' }, level2: null, level3: null });
  });

  it('an inflected main answer is not a base blank; accepted answers are normalized', () => {
    const q = aiQuestion({ type: 'cloze', result: { ...result, accepted_answers: ['deployed', 'Deployed'] } }, deploy(), 'vi', MAX,
      seededRandom(1));
    expect(q.answerKey).toMatchObject({ main: 'deployed', accepted: ['deployed'] });
    expect(q.blank).toEqual({ text: 'deployed', base: false });
  });
});

describe('aiQuestion: meaning_in_sentence', () => {
  const wrong: CandidateSense[] = [
    candidate({ lemma: 'release', gloss_vi: 'phát hành' }), candidate({ lemma: 'post', gloss_vi: 'đăng' }),
    candidate({ lemma: 'mine', gloss_vi: 'mỏ', scope: 'private' }),
  ];
  const result = { sentence: 'We deployed the app.', word_in_sentence: 'deployed', translation_vi: 'Chúng tôi đã triển khai.' };

  it('4 meanings shuffled; correct_index points at the right one; option_private follows each option; level 1 definition only', () => {
    const s = deploy({ definition_en: definition });
    const q = aiQuestion({ type: 'meaning_in_sentence', result, wrong }, s, 'vi', MAX, seededRandom(3));
    if (q.prompt.kind !== 'meaning_in_sentence' || q.answerKey.kind !== 'mcq') throw new Error('wrong kind');
    expect(q.prompt).toMatchObject({ sentence: result.sentence, highlight: 'deployed', meaning_language: 'vi' });
    expect([...q.prompt.options].sort()).toEqual(['mỏ', 'phát hành', 'triển khai', 'đăng'].sort());
    expect(q.prompt.options[q.answerKey.correct_index]).toBe('triển khai');
    expect(q.answerKey.option_private).toEqual(q.prompt.options.map((o) => o === 'mỏ'));
    expect(q.answerKey.translation_vi).toBe(result.translation_vi);
    expect(q.hints).toEqual({ level1: { kind: 'definition', text: definition }, level2: null });
    expect(q.distractorSenseIds).toEqual(wrong.map((w) => w.sense_id));
    expect(q.blank).toBeNull();
  });
});

describe('aiQuestion: mcq_sentence', () => {
  const senses = [candidate({ lemma: 'release' }), candidate({ lemma: 'post', scope: 'private' }), candidate({ lemma: 'ship' }),
    candidate({ lemma: 'build' })];
  const form = { answerForm: 'deployed', candidates: ['released', 'posted', 'shipped', 'built'], senses };
  const result = { sentence: 'Yesterday we ___ the app.', distractors: ['Released', 'posted', 'built'], translation_vi: 'Hôm qua…' };

  it('options are the answer form and the 3 distractors; the distractor senses are stored; no definition → no hint', () => {
    const q = aiQuestion({ type: 'mcq_sentence', result, form }, deploy({ definition_en: null }), 'vi', MAX, seededRandom(5));
    if (q.prompt.kind !== 'mcq_sentence' || q.answerKey.kind !== 'mcq') throw new Error('wrong kind');
    expect([...q.prompt.options].sort()).toEqual(['Released', 'built', 'deployed', 'posted'].sort());
    expect(q.prompt.options[q.answerKey.correct_index]).toBe('deployed');
    expect(q.answerKey.option_private).toEqual(q.prompt.options.map((o) => o === 'posted'));
    expect([...q.distractorSenseIds].sort()).toEqual([senses[0], senses[1], senses[3]].map((x) => x.sense_id).sort());
    expect(q.hints).toEqual({ level1: null, level2: null });
    expect(q.answerKey.translation_vi).toBe(result.translation_vi);
  });
});

describe('ownSentenceQuestion (design §7.3)', () => {
  it('cloze from a saved sentence: the Bước 4 accepted rule, translation_vi null, cloze hints', () => {
    const s = deploy({ accepted: ['deploy'] });
    const q = ownSentenceQuestion(s, { masked: 'They ___ on Monday.', blank: 'deploy', base: true }, 'vi', MAX);
    expect(q.prompt).toEqual({ kind: 'cloze', sentence: 'They ___ on Monday.' });
    expect(q.answerKey).toMatchObject({ kind: 'type_word', main: 'deploy', accepted: ['deploy'], translation_vi: null });
    expect(q.hints.level1).toEqual({ kind: 'first_letter', text: 'd' });
    expect(q.blank).toEqual({ text: 'deploy', base: true });
  });

  it('an inflected blank only accepts itself', () => {
    const q = ownSentenceQuestion(deploy(), { masked: 'They ___ it.', blank: 'deployed', base: false }, 'vi', MAX);
    expect(q.answerKey).toMatchObject({ main: 'deployed', accepted: ['deployed'] });
  });
});
