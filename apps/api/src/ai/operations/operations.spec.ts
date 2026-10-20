import { describe, expect, it } from 'vitest';
import { OPERATIONS, parseOutput } from './operations.js';

const cloze = OPERATIONS.generate_cloze;
const lookup = OPERATIONS.lookup_word;
const translate = OPERATIONS.translate_sentence;

const CLOZE_IN = { word: 'deploy', part_of_speech: 'verb', level: 'B2', meaning_vi: 'triển khai', context_label: null };
const LOOKUP_IN = { text: 'went', context_sentence: null };
const CLOZE_OUT = {
  sentence: 'The team will ___ the new version tomorrow.', accepted_answers: ['deploy'],
  translation_vi: 'Nhóm sẽ triển khai phiên bản mới vào ngày mai.',
};
const LOOKUP_OUT = {
  part_of_speech: 'verb', lemma: 'go', meaning_vi: 'đi', definition_en: 'to move from one place to another',
  examples: ['We went to the beach on Sunday.'],
};

const x = (n: number) => 'x'.repeat(n);
const clozeIn = (patch: Record<string, unknown>) => cloze.validateInput({ ...CLOZE_IN, ...patch });
const clozeOut = (patch: Record<string, unknown>) => cloze.checkOutput({ ...CLOZE_OUT, ...patch });
const lookupOut = (patch: Record<string, unknown>) => lookup.checkOutput({ ...LOOKUP_OUT, ...patch });
const problem = (result: ReturnType<typeof cloze.checkOutput>) => (result.ok ? null : result.problem);
const value = (result: ReturnType<typeof cloze.checkOutput>) => (result.ok ? result.value : null);
const violations = (result: ReturnType<typeof cloze.validateInput>) => (result.ok ? [] : result.violations);

describe('operation inputs', () => {
  it('each operation accepts its valid row', () => {
    expect(cloze.validateInput(CLOZE_IN)).toEqual({ ok: true });
    expect(lookup.validateInput(LOOKUP_IN)).toEqual({ ok: true });
    expect(lookup.validateInput({ text: 'bank', context_sentence: 'We sat on the bank.' })).toEqual({ ok: true });
    expect(translate.validateInput({ sentence: 'She has lived in Hanoi since 2019.' })).toEqual({ ok: true });
  });

  it('word of 0 and 101 characters is refused; 100 is accepted', () => {
    expect(violations(clozeIn({ word: '' }))).toEqual([expect.stringMatching(/^word: /)]);
    expect(violations(clozeIn({ word: x(101) }))).toEqual([expect.stringMatching(/^word: /)]);
    expect(clozeIn({ word: x(100) })).toEqual({ ok: true });
  });

  it("part_of_speech 'gerund' is refused, 'unspecified' accepted", () => {
    expect(violations(clozeIn({ part_of_speech: 'gerund' }))).toEqual([expect.stringMatching(/^part_of_speech: /)]);
    expect(clozeIn({ part_of_speech: 'unspecified' })).toEqual({ ok: true });
  });

  it("level 'D1' is refused, null accepted", () => {
    expect(violations(clozeIn({ level: 'D1' }))).toEqual([expect.stringMatching(/^level: /)]);
    expect(clozeIn({ level: null })).toEqual({ ok: true });
  });

  it("B6E53: meaning_vi of 400 characters → violation 'meaning_vi: …'", () => {
    expect(violations(clozeIn({ meaning_vi: x(400) }))).toEqual([expect.stringMatching(/^meaning_vi: /)]);
  });

  it('R10: context_label of 2 001 is refused, 2 000 accepted', () => {
    expect(violations(clozeIn({ context_label: x(2001) }))).toEqual([expect.stringMatching(/^context_label: /)]);
    expect(clozeIn({ context_label: x(2000) })).toEqual({ ok: true });
  });

  it('lengths count code points, not UTF-16 units', () => {
    expect(clozeIn({ word: '😀'.repeat(100) })).toEqual({ ok: true });
  });

  it('an extra key is refused', () => {
    expect(violations(clozeIn({ user_id: 'u1' }))).toEqual([expect.stringMatching(/^user_id: /)]);
    expect(violations(translate.validateInput({ sentence: 'Hi.', extra: 1 }))).toEqual([expect.stringMatching(/^extra: /)]);
  });

  it('a \\0 is refused', () => {
    expect(violations(clozeIn({ meaning_vi: 'a\0b' }))).toEqual([expect.stringMatching(/^meaning_vi: /)]);
  });

  it('lookup_word.context_sentence of 301 is refused', () => {
    expect(violations(lookup.validateInput({ text: 'bank', context_sentence: x(301) })))
      .toEqual([expect.stringMatching(/^context_sentence: /)]);
  });

  it('a missing field and a non-object are refused', () => {
    expect(violations(translate.validateInput({}))).toEqual([expect.stringMatching(/^sentence: /)]);
    expect(translate.validateInput('Hi.').ok).toBe(false);
  });
});

describe('operation outputs', () => {
  it('each operation accepts its valid output unchanged', () => {
    expect(cloze.checkOutput(CLOZE_OUT)).toEqual({ ok: true, value: CLOZE_OUT });
    expect(lookup.checkOutput(LOOKUP_OUT)).toEqual({ ok: true, value: LOOKUP_OUT });
    expect(translate.checkOutput({ translation_vi: 'Xin chào.' })).toEqual({ ok: true, value: { translation_vi: 'Xin chào.' } });
  });

  it('B6E46: two blanks / no blank → blank-count', () => {
    expect(problem(clozeOut({ sentence: 'I ___ and ___ it.' }))).toBe('blank-count');
    expect(problem(clozeOut({ sentence: 'I deploy it.' }))).toBe('blank-count');
  });

  it("B6E47: '____' becomes '___'", () => {
    expect(value(clozeOut({ sentence: 'We ____ it daily.' }))?.sentence).toBe('We ___ it daily.');
  });

  it("B6E48: [] and ['  '] → answers-count / empty", () => {
    expect(problem(clozeOut({ accepted_answers: [] }))).toBe('answers-count');
    expect(problem(clozeOut({ accepted_answers: ['  '] }))).toBe('empty');
  });

  it("B6E49: ['deploy','Deploy'] → ['deploy']", () => {
    expect(value(clozeOut({ accepted_answers: ['deploy', 'Deploy'] }))?.accepted_answers).toEqual(['deploy']);
  });

  it('six distinct answers → answers-count', () => {
    expect(problem(clozeOut({ accepted_answers: ['a', 'b', 'c', 'd', 'e', 'f'] }))).toBe('answers-count');
  });

  it("'de_ploy' → answer-underscore", () => {
    expect(problem(clozeOut({ accepted_answers: ['de_ploy'] }))).toBe('answer-underscore');
  });

  it('an answer of 101 characters → too-long', () => {
    expect(problem(clozeOut({ accepted_answers: [x(101)] }))).toBe('too-long');
  });

  it('B6E50: a sentence with <script> is accepted unchanged', () => {
    const sentence = 'The <script>alert(1)</script> will ___ now.';
    expect(value(clozeOut({ sentence }))?.sentence).toBe(sentence);
  });

  it('a \\n in sentence → shape', () => {
    expect(problem(clozeOut({ sentence: 'We ___ it.\nAgain.' }))).toBe('shape');
    expect(problem(clozeOut({ sentence: 'We ___ it.\r' }))).toBe('shape');
  });

  it('sentence 301 → too-long', () => {
    expect(problem(clozeOut({ sentence: `___ ${x(297)}` }))).toBe('too-long');
    expect(clozeOut({ sentence: `___ ${x(296)}` }).ok).toBe(true);
  });

  it('translation_vi 601 → too-long', () => {
    expect(problem(clozeOut({ translation_vi: x(601) }))).toBe('too-long');
    expect(problem(translate.checkOutput({ translation_vi: x(601) }))).toBe('too-long');
    expect(translate.checkOutput({ translation_vi: x(600) }).ok).toBe(true);
  });

  it('a missing key or an extra key → shape', () => {
    const { translation_vi: _, ...missing } = CLOZE_OUT;
    expect(problem(cloze.checkOutput(missing))).toBe('shape');
    expect(problem(clozeOut({ note: 'x' }))).toBe('shape');
    expect(problem(clozeOut({ accepted_answers: 'deploy' }))).toBe('shape');
    expect(problem(clozeOut({ accepted_answers: [1] }))).toBe('shape');
    expect(problem(cloze.checkOutput(null))).toBe('shape');
    expect(problem(cloze.checkOutput([CLOZE_OUT]))).toBe('shape');
  });

  it('a control character inside meaning_vi is removed; both ends are trimmed', () => {
    expect(value(lookupOut({ meaning_vi: '  đi\u0007 bộ  ' }))?.meaning_vi).toBe('đi bộ');
  });

  it("B6E52: 'Noun' → 'noun'; 'Gerund' → pos", () => {
    expect(value(lookupOut({ part_of_speech: 'Noun' }))?.part_of_speech).toBe('noun');
    expect(problem(lookupOut({ part_of_speech: 'Gerund' }))).toBe('pos');
    expect(problem(lookupOut({ part_of_speech: 'unspecified' }))).toBe('pos');
  });

  it('lookup examples of 0 and 3 are refused', () => {
    expect(problem(lookupOut({ examples: [] }))).toBe('empty');
    expect(problem(lookupOut({ examples: ['a.', 'b.', 'c.'] }))).toBe('too-long');
    expect(lookupOut({ examples: ['a.', 'b.'] }).ok).toBe(true);
  });

  it('a blank lookup field → empty; a lemma of 101 → too-long', () => {
    expect(problem(lookupOut({ definition_en: ' ' }))).toBe('empty');
    expect(problem(lookupOut({ lemma: x(101) }))).toBe('too-long');
  });

  it("parseOutput('not json') → not-json; valid JSON goes through checkOutput", () => {
    expect(parseOutput('generate_cloze', 'not json')).toEqual({ ok: false, problem: 'not-json' });
    expect(parseOutput('translate_sentence', '{"translation_vi":" Chào. "}'))
      .toEqual({ ok: true, value: { translation_vi: 'Chào.' } });
    expect(parseOutput('translate_sentence', '{}')).toEqual({ ok: false, problem: 'shape' });
  });
});

describe('output schemas', () => {
  const ALLOWED = new Set(['type', 'properties', 'items', 'enum', 'required', 'additionalProperties']);
  const nodes = (schema: Record<string, unknown>): Array<Record<string, unknown>> => [
    schema,
    ...Object.values((schema.properties ?? {}) as Record<string, Record<string, unknown>>).flatMap(nodes),
    ...(schema.items ? nodes(schema.items as Record<string, unknown>) : []),
  ];

  it('every output schema uses only the allowed keywords', () => {
    for (const op of Object.values(OPERATIONS)) {
      for (const node of nodes(op.outputSchema.schema)) {
        for (const key of Object.keys(node)) expect(ALLOWED.has(key), `${op.name}: ${key}`).toBe(true);
      }
    }
  });

  it('required lists every property', () => {
    for (const op of Object.values(OPERATIONS)) {
      for (const node of nodes(op.outputSchema.schema).filter((n) => n.type === 'object')) {
        expect(node.required, op.name).toEqual(Object.keys(node.properties as object));
      }
    }
  });

  it('every object has additionalProperties false', () => {
    for (const op of Object.values(OPERATIONS)) {
      for (const node of nodes(op.outputSchema.schema).filter((n) => n.type === 'object')) {
        expect(node.additionalProperties, op.name).toBe(false);
      }
    }
  });

  it('schema names are versioned, lookup part_of_speech is an enum of the valid parts of speech, default token limits', () => {
    expect(Object.values(OPERATIONS).map((op) => op.outputSchema.name))
      .toEqual(['generate_cloze_v1', 'lookup_word_v1', 'translate_sentence_v1']);
    const pos = (lookup.outputSchema.schema.properties as Record<string, { enum?: string[] }>).part_of_speech;
    expect(pos.enum).toContain('modal auxiliary');
    expect(pos.enum).not.toContain('unspecified');
    expect(Object.values(OPERATIONS).map((op) => op.defaultMaxOutputTokens)).toEqual([1200, 1200, 800]);
    expect(lookup.inputFields).toEqual(['text', 'context_sentence']);
  });
});
