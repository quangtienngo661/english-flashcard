import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  contentHash, LEVELS, MAX_EXAMPLES, normalizeContent, OWNER_SOURCE_ID,
  splitHeadword, VALID_POS, type RevisionContent,
} from '../../content/index.js';
import { contentKey, levelKey, normalizeRow, type NormalizedRow } from './row-normalizer.js';
import type { RowError } from './row-errors.js';

const sourceId = '00000000-0000-4000-8000-000000000002';
const senseId = '00000000-0000-4000-8000-000000000003';
const baseCells = { headword: 'bank', pos: 'noun', cefr: 'B1' };
const contentColumns = [
  'gloss_vi', 'definition_en', 'example_en_1', 'example_en_2', 'example_en_3',
  'topics', 'accepted_forms',
] as const;
const emptyContent: RevisionContent = {
  glossVi: null, definitionEn: null, examplesEn: [], topicCodes: [], acceptedForms: [],
};

function accepted(cells: Record<string, string>, hasLevelColumn = true): NormalizedRow {
  const result = normalizeRow(17, cells, { hasLevelColumn });
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.row;
}

function rejected(cells: Record<string, string>, hasLevelColumn = true): RowError[] {
  const result = normalizeRow(17, cells, { hasLevelColumn });
  expect(result.ok).toBe(false);
  expect(result).not.toHaveProperty('row');
  if (result.ok) throw new Error('Expected a rejected row');
  expect(Object.keys(result).sort()).toEqual(['errors', 'ok']);
  return result.errors;
}

describe('normalizeRow', () => {
  it.each(['nuon', '', ' \t '])('B2#11: invalid pos %j names the given value and every valid pos', (pos) => {
    const errors = rejected({ ...baseCells, pos });
    expect(errors).toEqual([{ code: 'invalid-pos', message: expect.any(String) }]);
    expect(errors[0].message).toContain(JSON.stringify(pos));
    expect(errors[0].message).toContain(VALID_POS.join(', '));
    expect(VALID_POS).toHaveLength(15);
  });

  it('B2#11: D1 names the given level and all six valid levels', () => {
    const errors = rejected({ ...baseCells, cefr: 'D1' });
    expect(errors).toEqual([{ code: 'invalid-level', message: expect.any(String) }]);
    expect(errors[0].message).toContain('"D1"');
    expect(errors[0].message).toContain(LEVELS.join(', '));
    expect(LEVELS).toHaveLength(6);
  });

  it('B2#11: bad pos and bad level both report their own errors in one call', () => {
    const errors = rejected({ ...baseCells, pos: 'nuon', cefr: 'D1' });
    expect(errors.map(({ code }) => code)).toEqual(['invalid-pos', 'invalid-level']);
    expect(errors[0].message).toContain('"nuon"');
    expect(errors[0].message).toContain(VALID_POS.join(', '));
    expect(errors[1].message).toContain('"D1"');
    expect(errors[1].message).toContain(LEVELS.join(', '));
  });

  it('B2#12: normalizes case, NFC and irregular internal whitespace through existing helpers', () => {
    const row = accepted({ ...baseCells, headword: ' \tCafe\u0301\n  March ', pos: ' Noun ', cefr: 'b1',
      gloss_vi: '  nga\u0302n\t  ha\u0300ng  ', definition_en: ' A\n  financial institution. ',
      context_label: ' \tfinance\n  office ' });
    expect(row).toEqual({
      rowNumber: 17, lemma: 'Café March', variants: [], pos: 'noun', level: 'B1', levelExtra: null,
      content: { glossVi: 'ngân hàng', definitionEn: 'A financial institution.' },
      senseId: null, revision: null, contextLabel: 'finance office', replaceMeaning: false, inflections: null, formOf: null,
    });
    expect(accepted({ ...baseCells, pos: ' Modal\t  Auxiliary ' }).pos).toBe('modal auxiliary');
  });

  it.each(['ｎoun', 'ｎｏｕｎ'])('B2#12: rejects full-width Latin pos %s instead of applying NFKC', (pos) => {
    expect(rejected({ ...baseCells, pos })[0]).toMatchObject({ code: 'invalid-pos' });
  });

  it('B2#12: NFC and NFD lemma/gloss yield identical content and both identity hashes', () => {
    const nfc = accepted({ ...baseCells, headword: 'café', gloss_vi: 'ngân hàng' });
    const nfd = accepted({ ...baseCells, headword: 'cafe\u0301', gloss_vi: 'nga\u0302n ha\u0300ng' });
    expect(nfd).toEqual(nfc);
    expect(levelKey(nfd, sourceId)).toEqual(levelKey(nfc, sourceId));
    expect(contentKey(nfd)).toEqual(contentKey(nfc));
    expect(contentHash({ ...emptyContent, ...nfd.content })).toBe(contentHash({ ...emptyContent, ...nfc.content }));
  });

  it.each([
    ['turn to ', 'turn to', []], ['according to', 'according to', []],
    ["o'clock", "o'clock", []], ["'re", "'re", []], ["'m", "'m", []], ["'s", "'s", []],
    ['a.m./A.M./am/AM', 'a.m.', ['A.M.', 'am', 'AM']],
    ["driver's license/driving licence", "driver's license", ['driving licence']],
    [' / a.m. // A.M. / / am / AM / ', 'a.m.', ['A.M.', 'am', 'AM']],
    ['emphasize/emphasize', 'emphasize', []],
    ['emphasize / emphasise / emphasize / emphasise', 'emphasize', ['emphasise']],
    ['a.m./A.M.', 'a.m.', ['A.M.']],
    ['a.m./A.M./am/am/a.m.', 'a.m.', ['A.M.', 'am']],
    ['a.m./A.M./AM', 'a.m.', ['A.M.', 'AM']],
    [' Cafe\u0301 / Café / CAFE\u0301 / CAFE\u0301 ', 'Café', ['CAFÉ']],
    [' Cafe\u0301\t  March ', 'Café March', []],
    ['analyze/analyse', 'analyze', ['analyse']],
  ] as Array<[string, string, string[]]>)('B2#13/B2#13a/B2E3: reuses Task 4 behavior for %s', (headword, lemma, variants) => {
    const row = accepted({ ...baseCells, headword });
    expect({ lemma: row.lemma, variants: row.variants }).toEqual({ lemma, variants });
    expect({ lemma: row.lemma, variants: row.variants }).toEqual(splitHeadword(headword));
  });

  it('B2#12: preserves case-sensitive lemma identity', () => {
    const upper = accepted({ ...baseCells, headword: 'March' });
    const lower = accepted({ ...baseCells, headword: 'march' });
    expect(levelKey(upper, sourceId).hash).not.toBe(levelKey(lower, sourceId).hash);
    expect(contentKey(upper).hash).not.toBe(contentKey(lower).hash);
  });

  it('B2#12: reads lemma/level aliases and prefers a present headword/cefr cell', () => {
    expect(accepted({ lemma: ' bank ', pos: 'noun', level: ' b1 ' })).toEqual(accepted(baseCells));
    expect(accepted({ ...baseCells, lemma: 'other', level: 'D1' }).lemma).toBe('bank');
    expect(accepted({ ...baseCells, cefr: '', level: 'D1' }).level).toBeNull();
    expect(rejected({ ...baseCells, headword: '', lemma: 'other' })[0].code).toBe('lemma-required');
  });

  it.each(['', ' \t\n '])('B2#16: a blank level %j gives null without an error', (cefr) => {
    expect(accepted({ ...baseCells, cefr }).level).toBeNull();
  });

  it('B2#16: a missing level cell gives null, and a layout without level ignores stray level/extras', () => {
    expect(accepted({ headword: 'bank', pos: 'noun' }).level).toBeNull();
    const row = accepted({ ...baseCells, cefr: 'D1', level: 'D2', notes: 'raw' }, false);
    expect(row.level).toBeNull();
    expect(row.levelExtra).toBeNull();
  });

  it('B2#16: all absent or blank content cells give content null', () => {
    expect(accepted(baseCells).content).toBeNull();
    expect(accepted({ ...baseCells, ...Object.fromEntries(contentColumns.map((column) => [column, ' \t\n '])) }).content).toBeNull();
    expect(accepted({ ...baseCells, gloss_vi: '', example_en_2: '  ' }).content).toBeNull();
  });

  it('B2#26: preserves present blank fields and omits absent fields in a nonblank content patch', () => {
    expect(accepted({ ...baseCells, gloss_vi: 'ngân hàng' }).content).toEqual({ glossVi: 'ngân hàng' });
    expect(accepted({ ...baseCells, gloss_vi: 'ngân hàng', definition_en: ' ',
      example_en_2: '', topics: ' ', accepted_forms: '' }).content).toEqual({
      glossVi: 'ngân hàng', definitionEn: null, examplesEn: [], topicCodes: [], acceptedForms: [],
    });
    expect(accepted({ ...baseCells, gloss_vi: ' ', definition_en: 'A bank.' }).content).toEqual({
      glossVi: null, definitionEn: 'A bank.',
    });
  });

  it('B2#26: example_en_2 alone is one list value and topics keep normalizeContent insertion order', () => {
    const row = accepted({ ...baseCells, example_en_2: ' that one value ', topics: 'Food; Business ;food' });
    const expected = normalizeContent({ examplesEn: ['that one value'], topicCodes: ['Food', 'Business', 'food'] }, 'bank');
    expect(expected.topicCodes).toEqual(['food', 'business']);
    expect(row.content).toEqual(expected);
    expect(row.content?.examplesEn).toEqual(['that one value']);
  });

  it('B2#26: examples follow column order, drop blanks/gaps and allow MAX_EXAMPLES', () => {
    expect(MAX_EXAMPLES).toBe(3);
    expect(accepted({ ...baseCells, example_en_3: 'third', example_en_1: 'first', example_en_2: 'second' })
      .content?.examplesEn).toEqual(['first', 'second', 'third']);
    expect(accepted({ ...baseCells, example_en_1: ' ', example_en_2: 'second', example_en_3: '' })
      .content?.examplesEn).toEqual(['second']);
  });

  it('B2#29: accepted_forms drop the lemma and case-insensitive duplicates but keep the first spelling', () => {
    expect(accepted({ ...baseCells, accepted_forms: 'Bank; BANKS ;banks' }).content).toEqual({ acceptedForms: ['BANKS'] });
    expect(accepted({ ...baseCells, headword: 'be', accepted_forms: "I'm; i'm; Mondays; ;" }).content)
      .toEqual({ acceptedForms: ["I'm", 'Mondays'] });
  });

  it('B2#30: all four extra columns preserve their raw text byte for byte even without a level value', () => {
    const extras = { 'coreinventory 1': '  MiXeD  ', 'coreinventory 2': '\tCaFe\u0301  ',
      threshold: '\r\n Yes \t', notes: '  Multi\n line; RAW  ' };
    for (const cefr of ['B1', '']) {
      const row = accepted({ ...baseCells, ...extras, cefr });
      expect(row.levelExtra).toEqual(extras);
      for (const column of Object.keys(extras) as Array<keyof typeof extras>) {
        expect(Buffer.from(row.levelExtra![column])).toEqual(Buffer.from(extras[column]));
      }
    }
  });

  it('B2#30: absent/blank extras yield null and only known nonblank extras are retained', () => {
    expect(accepted({ ...baseCells, notes: ' ', threshold: '' }).levelExtra).toBeNull();
    expect(accepted({ ...baseCells, notes: ' raw ', threshold: ' ', unknown: 'value' }).levelExtra)
      .toEqual({ notes: ' raw ' });
  });

  it.each([
    ["'=SUM(A1)", '=SUM(A1)'], ["'+1", '+1'], ["'-1", '-1'], ["'@mention", '@mention'],
    ["'hello", "'hello"], ["''=notaformula", "''=notaformula"],
    ["'", "'"], [" '=SUM(A1)", "'=SUM(A1)"],
  ])('B2#54: formula-prefix stripping is one anchored pass for %s', (raw, expected) => {
    expect(accepted({ ...baseCells, gloss_vi: raw }).content?.glossVi).toBe(expected);
  });

  it.each(contentColumns)('B2#54: strips formula prefixes in %s before content hashing', (column) => {
    const guarded = accepted({ ...baseCells, [column]: "'@mention" });
    const plain = accepted({ ...baseCells, [column]: '@mention' });
    expect(guarded.content).toEqual(plain.content);
    expect(contentHash({ ...emptyContent, ...guarded.content })).toBe(contentHash({ ...emptyContent, ...plain.content }));
  });

  it('B2#54/B2#27: removes the formula prefix before checking raw code-point length', () => {
    const value = `=${'😀'.repeat(1_999)}`;
    expect(accepted({ ...baseCells, gloss_vi: `'${value}` }).content?.glossVi).toBe(value);
    const errors = rejected({ ...baseCells, gloss_vi: `'${value}😀` });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ code: 'cell-too-long' });
    expect(errors[0].message).toContain('2001');
  });

  it.each([...contentColumns, 'context_label'])('B2#27: %s accepts 2000 code points and rejects 2001', (column) => {
    const value = '😀'.repeat(2_000);
    expect([...value]).toHaveLength(2_000);
    expect(value.length).toBe(4_000);
    accepted({ ...baseCells, [column]: value });
    const errors = rejected({ ...baseCells, [column]: `${value}😀` });
    expect(errors).toEqual([{ code: 'cell-too-long', message: expect.any(String) }]);
    expect(errors[0].message).toContain(column);
    expect(errors[0].message).toContain('2001');
    expect(errors[0].message).toContain('2000');
  });

  it('B2#27: checks raw length before whitespace collapse and NFC composition', () => {
    expect(rejected({ ...baseCells, gloss_vi: ` ${' '.repeat(2_000)}` })[0].code).toBe('cell-too-long');
    expect(rejected({ ...baseCells, definition_en: 'e\u0301'.repeat(1_001) })[0].code).toBe('cell-too-long');
  });

  it('B2#27: every overlong cell adds a separate error without losing other field errors', () => {
    const errors = rejected({ ...baseCells, headword: ' ', pos: 'nuon', cefr: 'D1',
      gloss_vi: 'a'.repeat(2_001), definition_en: 'b'.repeat(2_002),
      sense_id: senseId, revision: '0' });
    expect(errors.map(({ code }) => code)).toEqual([
      'lemma-required', 'invalid-pos', 'invalid-level', 'cell-too-long', 'cell-too-long', 'revision-required',
    ]);
    expect(errors.filter(({ code }) => code === 'cell-too-long').map(({ message }) => message))
      .toEqual([expect.stringContaining('gloss_vi'), expect.stringContaining('definition_en')]);
  });

  it('B2#27: a ContentRuleError for NUL content becomes a row error rather than escaping', () => {
    const errors = rejected({ ...baseCells, gloss_vi: 'nul\0text', pos: 'nuon' });
    expect(errors.map(({ code }) => code)).toEqual(['invalid-pos', 'cell-too-long']);
    expect(errors[1].message).toContain('gloss_vi');
    expect(errors[1].message).toContain('NUL');
  });

  it.each([' \t\n ', ' / / '])('B2#13 (Review Focus 4): empty normalized lemma %j is rejected', (headword) => {
    const errors = rejected({ ...baseCells, headword });
    expect(errors).toEqual([{ code: 'lemma-required', message: expect.any(String) }]);
    expect(errors[0].message).toContain(JSON.stringify(headword));
  });

  it('B2#13 (Review Focus 4): lemma lengths use Unicode code points after NFC normalization', () => {
    expect(accepted({ ...baseCells, headword: 'a'.repeat(100) }).lemma).toHaveLength(100);
    const tooLong = 'a'.repeat(101);
    const errors = rejected({ ...baseCells, headword: tooLong });
    expect(errors[0]).toMatchObject({ code: 'lemma-too-long' });
    expect(errors[0].message).toContain(tooLong);
    expect(errors[0].message).toContain('101');
    expect(errors[0].message).toContain('100');
    expect(accepted({ ...baseCells, headword: 'e\u0301'.repeat(100) }).lemma).toBe('é'.repeat(100));
    expect('😀'.length).toBe(2);
    expect([...'😀']).toHaveLength(1);
    expect(accepted({ ...baseCells, headword: '😀' }).lemma).toBe('😀');
    expect(accepted({ ...baseCells, headword: '😀'.repeat(100) }).lemma).toBe('😀'.repeat(100));
    expect(rejected({ ...baseCells, headword: '😀'.repeat(101) })[0].code).toBe('lemma-too-long');
  });

  it.each([undefined, '', ' ', '0', '-1', '1.5', '01', '+1', '1e2', '1x', '9007199254740992'])(
    'B2#23: a valid sense_id with revision %j rejects the whole row without partial row data', (revision) => {
      const cells: Record<string, string> = { ...baseCells, sense_id: senseId };
      if (revision !== undefined) cells.revision = revision;
      const errors = rejected(cells);
      expect(errors).toEqual([{ code: 'revision-required', message: expect.any(String) }]);
      expect(errors[0].message).toContain(senseId);
      expect(errors[0].message).toContain(JSON.stringify(revision ?? ''));
    },
  );

  it('B2#23: a well-formed UUID and positive integral revision are accepted without database lookups', () => {
    const row = accepted({ ...baseCells, sense_id: ` ${senseId} `, revision: ' 12 ' });
    expect(row.senseId).toBe(senseId);
    expect(row.revision).toBe(12);
  });

  it('B2#23: malformed sense_id reports sense-not-found rather than revision-required', () => {
    const errors = rejected({ ...baseCells, sense_id: 'abc' });
    expect(errors).toEqual([{ code: 'sense-not-found', message: expect.any(String) }]);
    expect(errors[0].message).toContain('"abc"');
    expect(errors[0].message).toContain('UUID');
  });

  it.each([undefined, '', ' \t '])('B2#23: absent/blank sense_id %j ignores even an invalid revision', (sense_id) => {
    const cells: Record<string, string> = { ...baseCells, revision: 'not-an-integer' };
    if (sense_id !== undefined) cells.sense_id = sense_id;
    const row = accepted(cells);
    expect(row.senseId).toBeNull();
    expect(row.revision).toBeNull();
  });

  it.each([undefined, '', ' \t '])('B2E30: context_label %j means the main sense', (context_label) => {
    const cells: Record<string, string> = { ...baseCells };
    if (context_label !== undefined) cells.context_label = context_label;
    expect(accepted(cells).contextLabel).toBeNull();
  });

  it.each([['true', true], [' TRUE ', true], ['false', false], ['', false], ['yes', false]])(
    'B2#21: replace_meaning %j is only a boolean convenience flag', (replace_meaning, expected) => {
      expect(accepted({ ...baseCells, replace_meaning: String(replace_meaning) }).replaceMeaning).toBe(expected);
    },
  );
});

describe('row identity keys', () => {
  it('B2#10: repeated key calls on one normalized row are deterministic JSON tuples and SHA-256', () => {
    const row = accepted({ ...baseCells, context_label: 'finance' });
    const level = levelKey(row, sourceId);
    const content = contentKey(row);
    expect(levelKey(row, sourceId)).toEqual(level);
    expect(contentKey(row)).toEqual(content);
    expect(level.key).toBe(JSON.stringify([sourceId, 'bank', 'noun']));
    expect(content.key).toBe(JSON.stringify([OWNER_SOURCE_ID, 'bank', 'noun', 'finance']));
    for (const result of [level, content]) {
      expect(result.hash).toMatch(/^[a-f0-9]{64}$/u);
      expect(result.hash).toBe(createHash('sha256').update(result.key, 'utf8').digest('hex'));
    }
  });

  it('B2#10: identity hashes exclude the gloss; revision content hashes detect a gloss change', () => {
    const first = accepted({ ...baseCells, gloss_vi: 'ngân hàng' });
    const second = accepted({ ...baseCells, gloss_vi: 'bờ sông' });
    expect(levelKey(first, sourceId)).toEqual(levelKey(second, sourceId));
    expect(contentKey(first)).toEqual(contentKey(second));
    expect(contentHash({ ...emptyContent, ...first.content })).not.toBe(contentHash({ ...emptyContent, ...second.content }));
  });

  it('B2#10: source, lemma and pos each distinguish level identities', () => {
    const row = accepted(baseCells);
    const first = levelKey(row, sourceId);
    expect(levelKey(row, OWNER_SOURCE_ID).hash).not.toBe(first.hash);
    expect(levelKey({ ...row, lemma: 'other' }, sourceId).hash).not.toBe(first.hash);
    expect(levelKey({ ...row, pos: 'verb' }, sourceId).hash).not.toBe(first.hash);
    const changed: NormalizedRow = { ...row, level: 'C2', content: { glossVi: 'changed' }, variants: ['banks'],
      contextLabel: 'other', senseId, revision: 2, replaceMeaning: true, levelExtra: { notes: 'new' }, rowNumber: 99 };
    expect(levelKey(changed, sourceId)).toEqual(first);
  });

  it('B2#20/B2#23: content identity uses owner plus sense_id in preference to label, or null for the main sense', () => {
    const main = accepted(baseCells);
    const labeled = accepted({ ...baseCells, context_label: 'finance' });
    const targeted = accepted({ ...baseCells, context_label: 'finance', sense_id: senseId, revision: '1' });
    expect(contentKey(main).key).toBe(JSON.stringify([OWNER_SOURCE_ID, 'bank', 'noun', null]));
    expect(contentKey(labeled).hash).not.toBe(contentKey(main).hash);
    expect(contentKey(targeted).key).toBe(JSON.stringify([OWNER_SOURCE_ID, 'bank', 'noun', senseId]));
    expect(contentKey({ ...targeted, contextLabel: 'other' })).toEqual(contentKey(targeted));
    expect(contentKey({ ...targeted, senseId: sourceId }).hash).not.toBe(contentKey(targeted).hash);
  });

  it('B2#10: JSON tuple keys cannot collide when component values contain separators or quotes', () => {
    const first = { lemma: 'a:b', pos: 'c', contextLabel: 'label,"value"', senseId: null };
    const second = { ...first, lemma: 'a', pos: 'b:c' };
    expect(levelKey(first, sourceId).hash).not.toBe(levelKey(second, sourceId).hash);
    expect(contentKey(first).hash).not.toBe(contentKey(second).hash);
  });
});
