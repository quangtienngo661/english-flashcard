import { describe, expect, it } from 'vitest';
import type { CandidateSense } from '../../content/index.js';
import type { StoredAiInput } from '../ai/ai-question-generator.service.js';
import type { AnswerKey } from '../practice.types.js';
import { isFailing, maskedOptionIn, metaOf, parseOutput, PRACTICE_AI_OPERATIONS, sessionWords, touchesPrivateWord } from './real-questions.js';

const REVEAL = { lemma: 'go', meaning: 'đi', definition_en: null };
const clozeKey = (asked_private = false): AnswerKey => ({ kind: 'type_word', main: 'go', accepted: ['go'], reveal: REVEAL, asked_private });
const mcqKey = (option_private: boolean[], asked_private = false): AnswerKey => ({
  kind: 'mcq', correct_index: 0, option_private, reveal: REVEAL, asked_private,
});
const sense = (id: string, scope: 'catalog' | 'private'): CandidateSense => ({
  sense_id: id, entry_id: `e-${id}`, scope, lemma: id, meaning: { language: 'vi', text: 'x' } as never, gloss_vi: 'x', definition_en: null,
  form_of_entry_id: null, function_word: false, inflections: [],
});
const clozeInput = (contentKey: string | null = null): StoredAiInput => ({
  senseRevisionId: 'rev', contentKey, type: 'cloze', data: { word: 'go', part_of_speech: 'verb', level: 'B1', meaning_vi: 'đi', context_label: null },
});
const mcqInput = (scopes: Array<'catalog' | 'private'>): StoredAiInput => ({
  senseRevisionId: 'rev', contentKey: null, type: 'mcq_sentence',
  data: { word: 'go', part_of_speech: 'verb', level: 'B1', meaning_vi: 'đi', context_label: null, answer_form: 'go', candidates: scopes.map((_, i) => `w${i}`) },
  form: { answerForm: 'go', candidates: scopes.map((_, i) => `w${i}`), senses: scopes.map((scope, i) => sense(`w${i}`, scope)) },
});
const meaningInput = (scopes: Array<'catalog' | 'private'>): StoredAiInput => ({
  senseRevisionId: 'rev', contentKey: null, type: 'meaning_in_sentence',
  data: { word: 'go', part_of_speech: 'verb', level: 'B1', meaning_vi: 'đi', context_label: null, other_meanings_vi: ['a', 'b', 'c'] },
  wrong: scopes.map((scope, i) => sense(`m${i}`, scope)),
});

describe('PRACTICE_AI_OPERATIONS', () => {
  it('the three operations Practice makes questions with, in this order', () => {
    expect([...PRACTICE_AI_OPERATIONS]).toEqual(['generate_cloze', 'generate_meaning_question', 'generate_sentence_mcq']);
  });
});

describe('touchesPrivateWord (R6, B39)', () => {
  it('a catalog cloze: not asked private, no content key → false', () => {
    expect(touchesPrivateWord({ answerKey: clozeKey(false), aiInput: clozeInput(null) })).toBe(false);
  });

  it('the asked word is private → true', () => {
    expect(touchesPrivateWord({ answerKey: clozeKey(true), aiInput: clozeInput(null) })).toBe(true);
  });

  it('B39: an MCQ with one private option among the four → true', () => {
    expect(touchesPrivateWord({ answerKey: mcqKey([false, true, false, false]), aiInput: mcqInput(['catalog', 'catalog', 'catalog', 'catalog']) })).toBe(true);
  });

  it('Review focus 1: no private option among the four, but a private word was among the candidates sent to the AI → true', () => {
    expect(touchesPrivateWord({ answerKey: mcqKey([false, false, false, false]), aiInput: mcqInput(['catalog', 'catalog', 'private', 'catalog']) })).toBe(true);
  });

  it('an MCQ whose candidates are all catalog and whose options are none private → false', () => {
    expect(touchesPrivateWord({ answerKey: mcqKey([false, false, false, false]), aiInput: mcqInput(['catalog', 'catalog', 'catalog', 'catalog']) })).toBe(false);
  });

  it('a meaning question with one wrong meaning from a private word → true; with all catalog → false', () => {
    expect(touchesPrivateWord({ answerKey: mcqKey([false, false, false, false]), aiInput: meaningInput(['catalog', 'private', 'catalog']) })).toBe(true);
    expect(touchesPrivateWord({ answerKey: mcqKey([false, false, false, false]), aiInput: meaningInput(['catalog', 'catalog', 'catalog']) })).toBe(false);
  });

  it('a content key means the asked word was a private word checked by AI → true', () => {
    expect(touchesPrivateWord({ answerKey: clozeKey(false), aiInput: clozeInput('abc') })).toBe(true);
  });

  it('no stored input (cleaned up after 7 days) and a catalog key → false; no answer key but a private candidate → true', () => {
    expect(touchesPrivateWord({ answerKey: clozeKey(false), aiInput: null })).toBe(false);
    expect(touchesPrivateWord({ answerKey: null, aiInput: mcqInput(['catalog', 'private', 'catalog']) })).toBe(true);
    expect(touchesPrivateWord({ answerKey: null, aiInput: null })).toBe(false);
  });
});

describe('maskedOptionIn (Review focus 4)', () => {
  it('an option equal to the private word mask or the private meaning mask → true', () => {
    expect(maskedOptionIn({ prompt: { options: ['go', '[từ riêng của người học]', 'run', 'see'] } })).toBe(true);
    expect(maskedOptionIn({ prompt: { options: ['a', 'b', '[nghĩa của từ riêng]', 'd'] } })).toBe(true);
  });

  it('options with no mask, a prompt without options, no prompt, null → false', () => {
    expect(maskedOptionIn({ prompt: { options: ['go', 'run', 'see', 'eat'] } })).toBe(false);
    expect(maskedOptionIn({ prompt: { kind: 'cloze' } })).toBe(false);
    expect(maskedOptionIn({})).toBe(false);
    expect(maskedOptionIn(null)).toBe(false);
    expect(maskedOptionIn('text')).toBe(false);
  });
});

describe('parseOutput', () => {
  it('a JSON object comes back as that object', () => {
    expect(parseOutput('{"sentence":"A ___.","accepted_answers":["go"]}')).toEqual({ sentence: 'A ___.', accepted_answers: ['go'] });
  });

  it.each(['[1]', 'nope', '"text"', '3', 'null', '', '{"broken":'])('%j is not an object → null', (response) => {
    expect(parseOutput(response)).toBeNull();
  });

  it('no response (content kept without one) → null', () => {
    expect(parseOutput(null)).toBeNull();
  });
});

describe('sessionWords', () => {
  const senses = new Map<string, { lemma: string; scope: 'catalog' | 'private' }>([
    ['s1', { lemma: 'go', scope: 'catalog' }], ['s2', { lemma: 'Run', scope: 'catalog' }], ['s3', { lemma: 'run', scope: 'catalog' }],
    ['s4', { lemma: 'zq', scope: 'private' }],
  ]);

  it('catalog lemmas in session order, without the asked sense, a private word, an unknown id or a repeat in other case (the first spelling stays)', () => {
    expect(sessionWords('s1', ['s2', 's1', 's3', 's4', 's5'], senses)).toEqual(['Run']);
  });

  it('keeps the session order and several words', () => {
    const more = new Map(senses).set('s6', { lemma: 'beat', scope: 'catalog' });
    expect(sessionWords('s1', ['s6', 's1', 's2'], more)).toEqual(['beat', 'Run']);
  });

  it('a session of one sense, or no ids → []', () => {
    expect(sessionWords('s1', ['s1'], senses)).toEqual([]);
    expect(sessionWords('s1', [], senses)).toEqual([]);
  });
});

describe('metaOf', () => {
  it('the fields of an AI question meta; the config number is the prompt revision', () => {
    expect(metaOf({ operation: 'generate_cloze', provider: 'fake', model: 'fake:ok', prompt_revision: 4, call_operation_id: 'r1#2' })).toEqual({
      operation: 'generate_cloze', config_number: 4, model: 'fake:ok', provider: 'fake', call_operation_id: 'r1#2',
    });
  });

  it('no meta, or fields of the wrong type → every field null', () => {
    const empty = { operation: null, config_number: null, model: null, provider: null, call_operation_id: null };
    expect(metaOf(null)).toEqual(empty);
    expect(metaOf('x')).toEqual(empty);
    expect(metaOf({ operation: 'judge', provider: 3, model: false, prompt_revision: 'x', call_operation_id: 7 })).toEqual(empty);
    expect(metaOf({ prompt_revision: 2.5 })).toEqual(empty);
  });

  it('a prompt revision of 0 is a number, not a missing one', () => {
    expect(metaOf({ operation: 'generate_sentence_mcq', prompt_revision: 0 })).toMatchObject({ operation: 'generate_sentence_mcq', config_number: 0 });
  });
});

describe('isFailing', () => {
  it('a fail_major or fail_minor on any criterion → true', () => {
    expect(isFailing([{ verdict: 'fail_minor' }])).toBe(true);
    expect(isFailing([{ verdict: 'pass' }, { verdict: 'fail_major' }])).toBe(true);
  });

  it('only pass and "không chấm được" (null) → false; no scores → false', () => {
    expect(isFailing([{ verdict: 'pass' }, { verdict: null }])).toBe(false);
    expect(isFailing([])).toBe(false);
  });
});
