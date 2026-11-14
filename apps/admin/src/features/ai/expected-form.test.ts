import { describe, expect, it } from 'vitest';
import { expectedFields, expectedFromFields, fieldsFromExpected, formsFromText } from './expected-form';

describe('formsFromText', () => {
  it('splits on commas, trims, and drops empty and repeated forms (first kept)', () => {
    expect(formsFromText(' deploy, deployed ,,deploy')).toEqual(['deploy', 'deployed']);
  });

  it('nothing but separators and spaces is no form', () => {
    expect(formsFromText('')).toEqual([]);
    expect(formsFromText(' , ,')).toEqual([]);
  });

  it('keeps an apostrophe inside a form and a repeat that differs in case', () => {
    expect(formsFromText("don't, Don't")).toEqual(["don't", "Don't"]);
  });
});

describe('expectedFields', () => {
  it.each([
    ['generate_cloze', ['forms']],
    ['generate_meaning_question', ['forms']],
    ['lookup_word', ['lemma', 'part_of_speech']],
    ['check_private_word', ['verdict']],
    ['translate_sentence', []],
    ['generate_sentence_mcq', []],
  ] as const)('%s asks for %j', (op, fields) => {
    expect(expectedFields(op)).toEqual(fields);
  });
});

describe('expectedFromFields', () => {
  it('forms: the typed text becomes the list, in order', () => {
    expect(expectedFromFields('generate_cloze', { forms: ' deploy, deployed ,,deploy' })).toEqual({ forms: ['deploy', 'deployed'] });
    expect(expectedFromFields('generate_meaning_question', { forms: 'run, ran' })).toEqual({ forms: ['run', 'ran'] });
  });

  it('forms: an empty box is an empty list, so the API names the problem under the box', () => {
    expect(expectedFromFields('generate_cloze', { forms: '' })).toEqual({ forms: [] });
    expect(expectedFromFields('generate_cloze', {})).toEqual({ forms: [] });
  });

  it('lookup_word: lemma and part of speech, trimmed', () => {
    expect(expectedFromFields('lookup_word', { lemma: 'run', part_of_speech: 'verb' })).toEqual({ lemma: 'run', part_of_speech: 'verb' });
    expect(expectedFromFields('lookup_word', { lemma: ' run ', part_of_speech: '' })).toEqual({ lemma: 'run', part_of_speech: '' });
  });

  it('check_private_word: the verdict as chosen, empty when none is chosen', () => {
    expect(expectedFromFields('check_private_word', { verdict: 'not_recognized' })).toEqual({ verdict: 'not_recognized' });
    expect(expectedFromFields('check_private_word', {})).toEqual({ verdict: '' });
  });

  it('an operation without an expected answer sends none', () => {
    expect(expectedFromFields('translate_sentence', { forms: 'x' })).toBeNull();
    expect(expectedFromFields('generate_sentence_mcq', {})).toBeNull();
  });
});

describe('fieldsFromExpected', () => {
  it('forms are joined with ", "', () => {
    expect(fieldsFromExpected('generate_cloze', { forms: ['deploy', 'deployed'] })).toEqual({ forms: 'deploy, deployed' });
  });

  it('no expected answer (a migrated example) leaves the boxes empty', () => {
    expect(fieldsFromExpected('generate_cloze', null)).toEqual({ forms: '' });
    expect(fieldsFromExpected('lookup_word', null)).toEqual({ lemma: '', part_of_speech: '' });
    expect(fieldsFromExpected('check_private_word', null)).toEqual({ verdict: '' });
  });

  it('lookup_word and check_private_word read their own keys', () => {
    expect(fieldsFromExpected('lookup_word', { lemma: 'run', part_of_speech: 'verb' })).toEqual({ lemma: 'run', part_of_speech: 'verb' });
    expect(fieldsFromExpected('check_private_word', { verdict: 'ok' })).toEqual({ verdict: 'ok' });
  });

  it('a stored value of the wrong shape is read as empty, not as a crash', () => {
    expect(fieldsFromExpected('generate_cloze', { forms: 'deploy' })).toEqual({ forms: '' });
    expect(fieldsFromExpected('lookup_word', { lemma: 3 })).toEqual({ lemma: '', part_of_speech: '' });
  });

  it('an operation without an expected answer has no fields', () => {
    expect(fieldsFromExpected('translate_sentence', null)).toEqual({});
  });
});
