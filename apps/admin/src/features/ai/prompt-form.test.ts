import { describe, expect, it } from 'vitest';
import { fieldOfViolation, fieldText, fieldValue, isPromptForm, samePrompt, toForm, toPayload } from './prompt-form';

const FIELDS = ['word', 'level', 'candidates'];

describe('fieldText / fieldValue (one input field of an example)', () => {
  it.each([
    ['go', 'go'],
    [null, ''],
    [['a', 'b'], '["a","b"]'],
  ])('%j shows as %j and reads back the same', (value, text) => {
    expect(fieldText(value)).toBe(text);
    expect(fieldValue(text)).toEqual(value);
  });

  it('text that only looks like JSON stays text', () => {
    expect(fieldValue('[not json')).toBe('[not json');
  });
});

describe('toForm / toPayload', () => {
  const prompt = { instructions: 'Write.', examples: [{ input: { word: 'go', level: null, candidates: ['a'] }, output: { sentence: 'I go.' } }] };

  it('a prompt round-trips through the form unchanged', () => {
    const form = toForm(prompt, FIELDS);
    expect(form.examples[0].input).toEqual({ word: 'go', level: '', candidates: '["a"]' });
    expect(toPayload(form)).toEqual({ ok: true, body: prompt });
  });

  it('fields the operation takes but the example lacks get an empty box; keys it does not know are kept', () => {
    const form = toForm({ instructions: 'x', examples: [{ input: { word: 'go', extra: 1 }, output: {} }] }, FIELDS);
    expect(Object.keys(form.examples[0].input)).toEqual(['word', 'level', 'candidates', 'extra']);
  });

  it('an output that is not a JSON object is flagged by its index, nothing is sent', () => {
    const form = toForm(prompt, FIELDS);
    form.examples.push({ input: { word: 'x' }, output: '[1]' }, { input: { word: 'y' }, output: '{oops' });
    expect(toPayload(form)).toEqual({ ok: false, badOutputs: [1, 2] });
  });
});

describe('samePrompt (Review Focus 2: did our own lost save land?)', () => {
  it('ignores key order (Postgres jsonb reorders keys)', () => {
    const a = { instructions: 'x', examples: [{ input: { word: 'go', level: null }, output: { b: 1, a: [1, { d: 2, c: 3 }] } }] };
    const b = { instructions: 'x', examples: [{ output: { a: [1, { c: 3, d: 2 }], b: 1 }, input: { level: null, word: 'go' } }] };
    expect(samePrompt(a, b)).toBe(true);
    expect(samePrompt(a, { ...b, instructions: 'y' })).toBe(false);
  });
});

describe('isPromptForm (a kept draft may come from an older build)', () => {
  it.each([
    [{ instructions: 'x', examples: [{ input: { word: 'go' }, output: '{}' }] }, true],
    [{ instructions: 'x', examples: [] }, true],
    [{ instructions: 'x' }, false],
    [{ instructions: 1, examples: [] }, false],
    [{ instructions: 'x', examples: [{ input: { word: 1 }, output: '{}' }] }, false],
    [{ instructions: 'x', examples: [{ input: {}, output: {} }] }, false],
    ['x', false],
    [null, false],
  ])('%j → %s', (value, ok) => {
    expect(isPromptForm(value)).toBe(ok);
  });
});

describe('fieldOfViolation (400 paths → the box to mark)', () => {
  const form = toForm({ instructions: 'x', examples: [{ input: { word: 'go', level: null, candidates: [] }, output: {} }] }, FIELDS);
  it.each([
    ['instructions', 'prompt-instructions'],
    ['examples[0].input.word', 'example-0-input-word'],
    ['examples[0].input.candidates.1', 'example-0-input-candidates'],
    ['examples[0].output', 'example-0-output'],
    ['examples[0]', 'example-0-output'],
    ['examples[3].output', null],
    ['examples', null],
  ])('%s → %s', (path, id) => {
    expect(fieldOfViolation(path, form)).toBe(id);
  });
});
