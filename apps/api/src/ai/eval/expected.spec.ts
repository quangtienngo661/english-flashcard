import { describe, expect, it } from 'vitest';
import { EXPECTED_FORMS_MAX, EXPECTED_OPERATIONS, expectedResultFor, expectedViolations, normalizeExpected } from './expected.js';

const RULES = { matchesExpected: () => true };

describe('expectedViolations', () => {
  it('B2: a cloze or meaning example needs an object with forms', () => {
    expect(expectedViolations('generate_cloze', undefined)).toEqual(['expected: required for generate_cloze']);
    expect(expectedViolations('generate_cloze', null)).toEqual(['expected: required for generate_cloze']);
    expect(expectedViolations('generate_meaning_question', null)).toEqual(['expected: required for generate_meaning_question']);
    expect(expectedViolations('generate_cloze', 'deploy, deployed')).toEqual(['expected: must be an object']);
    expect(expectedViolations('generate_cloze', ['deploy'])).toEqual(['expected: must be an object']);
    expect(expectedViolations('generate_cloze', { forms: [] })).toEqual(['expected.forms: at least one form']);
    expect(expectedViolations('generate_cloze', { forms: 'deploy' })).toEqual(['expected.forms: must be an array']);
    expect(expectedViolations('generate_cloze', { forms: ['deploy', ' '] })).toEqual(['expected.forms.1: empty']);
    expect(expectedViolations('generate_cloze', { forms: ['deploy', 3] })).toEqual(['expected.forms.1: must be a string']);
    expect(expectedViolations('generate_cloze', { forms: Array(EXPECTED_FORMS_MAX + 1).fill('x') })).toEqual(['expected.forms: at most 50 forms']);
    expect(expectedViolations('generate_cloze', { forms: Array(EXPECTED_FORMS_MAX).fill('x') })).toEqual([]);
    expect(expectedViolations('generate_meaning_question', { forms: ['go'], extra: 1 })).toEqual(['expected: unknown key extra']);
    expect(expectedViolations('generate_cloze', {})).toEqual(['expected.forms: required']);
  });

  it('B2: lookup_word needs a lemma and a part of speech from the list', () => {
    expect(expectedViolations('lookup_word', { lemma: 'run', part_of_speech: 'verb' })).toEqual([]);
    expect(expectedViolations('lookup_word', { lemma: 'run', part_of_speech: 'gerund' })).toEqual(['expected.part_of_speech: not a part of speech']);
    expect(expectedViolations('lookup_word', { lemma: ' ', part_of_speech: 'verb' })).toEqual(['expected.lemma: empty']);
    expect(expectedViolations('lookup_word', { lemma: 'x'.repeat(101), part_of_speech: 'verb' })).toEqual(['expected.lemma: at most 100 characters']);
    expect(expectedViolations('lookup_word', { lemma: 'run' })).toEqual(['expected.part_of_speech: required']);
    expect(expectedViolations('lookup_word', null)).toEqual(['expected: required for lookup_word']);
  });

  it('B2: check_private_word needs a verdict', () => {
    expect(expectedViolations('check_private_word', { verdict: 'ok' })).toEqual([]);
    expect(expectedViolations('check_private_word', { verdict: 'not_recognized' })).toEqual([]);
    expect(expectedViolations('check_private_word', { verdict: 'maybe' })).toEqual(['expected.verdict: ok or not_recognized']);
    expect(expectedViolations('check_private_word', { verdict: 'ok', extra: 1 })).toEqual(['expected: unknown key extra']);
  });

  it('B2: the two operations without an expected answer accept none', () => {
    expect(expectedViolations('translate_sentence', { forms: ['x'] })).toEqual(['expected: translate_sentence has no expected answer']);
    expect(expectedViolations('generate_sentence_mcq', { forms: ['x'] })).toEqual(['expected: generate_sentence_mcq has no expected answer']);
    expect(expectedViolations('generate_sentence_mcq', null)).toEqual([]);
    expect(expectedViolations('translate_sentence', undefined)).toEqual([]);
  });

  it('design §5.1: exactly four operations take an expected answer', () => {
    expect([...EXPECTED_OPERATIONS]).toEqual(['generate_cloze', 'generate_meaning_question', 'lookup_word', 'check_private_word']);
  });
});

describe('normalizeExpected', () => {
  it('trims strings and drops duplicate forms, keeping the first', () => {
    expect(normalizeExpected('generate_cloze', { forms: [' deploy ', 'deploy', 'deployed'] })).toEqual({ forms: ['deploy', 'deployed'] });
    expect(normalizeExpected('lookup_word', { lemma: ' run ', part_of_speech: ' verb' })).toEqual({ lemma: 'run', part_of_speech: 'verb' });
    expect(normalizeExpected('check_private_word', { verdict: ' ok ' })).toEqual({ verdict: 'ok' });
  });

  it('is null for an operation without an expected answer and for a missing one', () => {
    expect(normalizeExpected('translate_sentence', null)).toBeNull();
    expect(normalizeExpected('generate_sentence_mcq', undefined)).toBeNull();
  });
});

describe('expectedResultFor', () => {
  it('B9: forms are checked by the port; no port means no result', () => {
    expect(expectedResultFor(null, 'generate_cloze', { accepted_answers: ['go'] }, { forms: ['go'] })).toBeNull();
    expect(expectedResultFor({ matchesExpected: () => false }, 'generate_cloze', { accepted_answers: ['x'] }, { forms: ['go'] })).toBe('fail');
    expect(expectedResultFor(RULES, 'generate_cloze', { accepted_answers: ['go'] }, { forms: ['go'] })).toBe('pass');
  });

  it('Review focus 4: no output, or a migrated example without expected, gives no result', () => {
    expect(expectedResultFor(RULES, 'generate_cloze', null, { forms: ['go'] })).toBeNull();
    expect(expectedResultFor(RULES, 'generate_cloze', { accepted_answers: ['go'] }, null)).toBeNull();
  });

  it('lookup_word and check_private_word compare after trim and lower case, without a port', () => {
    expect(expectedResultFor(null, 'lookup_word', { lemma: 'Run', part_of_speech: 'verb' }, { lemma: ' run', part_of_speech: 'Verb' })).toBe('pass');
    expect(expectedResultFor(null, 'lookup_word', { lemma: 'ran', part_of_speech: 'verb' }, { lemma: 'run', part_of_speech: 'verb' })).toBe('fail');
    expect(expectedResultFor(null, 'lookup_word', { lemma: 'run', part_of_speech: 'noun' }, { lemma: 'run', part_of_speech: 'verb' })).toBe('fail');
    expect(expectedResultFor(null, 'check_private_word', { verdict: 'ok' }, { verdict: 'not_recognized' })).toBe('fail');
    expect(expectedResultFor(null, 'check_private_word', { verdict: ' OK ' }, { verdict: 'ok' })).toBe('pass');
  });

  it('is null for operations without an expected answer', () => {
    expect(expectedResultFor(RULES, 'translate_sentence', { translation_vi: 'x' }, { forms: ['x'] })).toBeNull();
  });
});
