import { readFileSync } from 'node:fs';
import { parse } from 'csv-parse/sync';
import { describe, expect, it } from 'vitest';
import { contentHash, type RevisionContent } from '../../content/index.js';
import { parseUploadFile } from './csv-file.js';
import { csvCell, rejectedCsv, toCsv } from './csv-writer.js';
import { normalizeRow } from './row-normalizer.js';

const limits = { maxRows: 20_000, maxBytes: 10_000_000 };
const evidenceDirectory = new URL(
  '../../../../../docs/preparation/evidence/wordlists_2026-10-02/', import.meta.url,
);

describe('csvCell', () => {
  it.each(['=1+1', '+x', '-x', '@y'])(
    'B2#54 (export side): guards a leading formula character in %j', (value) => {
      expect(csvCell(value)).toBe(`'${value}`);
    },
  );

  it.each(['', "it's fine", "'m", "'=already guarded", 'plain', 'x=y', ' =1+1'])(
    'B2#54 (export side): leaves unguarded text %j unchanged', (value) => {
      expect(csvCell(value)).toBe(value);
    },
  );

  it.each([
    ['a,b', '"a,b"'], ['say "yes"', '"say ""yes"""'],
    ['line\rbreak', '"line\rbreak"'], ['line\nbreak', '"line\nbreak"'],
    ['line\r\nbreak', '"line\r\nbreak"'], ['=A,B', '"\'=A,B"'],
    ['=SUM(A1),"B1"', '"\'=SUM(A1),""B1"""'],
    ['+"x"', '"\'+""x"""'], ['-x\ny', '"\'-x\ny"'], ['@x\ry', '"\'@x\ry"'],
  ])('B2#54 (export side): RFC 4180 encodes %j with the guard inside quotes', (value, expected) => {
    expect(csvCell(value)).toBe(expected);
  });
});

describe('toCsv', () => {
  it('B2#54: emits UTF-8 BOM and CRLF after every record, including the last one', () => {
    const text = toCsv(['headword', 'pos', 'notes'], [['cat', 'noun', 'say "yes", please']]);
    expect(text).toBe('\uFEFFheadword,pos,notes\r\ncat,noun,"say ""yes"", please"\r\n');
    expect([...Buffer.from(text, 'utf8').subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(parseUploadFile(Buffer.from(text, 'utf8'), limits).rows).toEqual([
      { rowNumber: 2, cells: ['cat', 'noun', 'say "yes", please'] },
    ]);
  });

  it('B2#33: a report without rejected rows is a valid header-only CSV', () => {
    const text = toCsv(['headword', 'pos', '_row', '_error'], []);
    expect(text).toBe('\uFEFFheadword,pos,_row,_error\r\n');
    // Uploads deliberately reject zero data rows; CSV itself permits a header-only download.
    expect(parse(text, { bom: true })).toEqual([['headword', 'pos', '_row', '_error']]);
  });

  it.each([
    ['cefrj-vocabulary-profile-1.5.csv', 7799],
    ['octanove-vocabulary-profile-c1c2-1.0.csv', 2136],
  ] as const)('B2#54 (export side): round-trips every cell of real %s through the upload reader', (name, count) => {
    const original = parseUploadFile(readFileSync(new URL(name, evidenceDirectory)), limits);
    expect(original.rows).toHaveLength(count);
    const readBack = parseUploadFile(Buffer.from(toCsv(
      original.headers, original.rows.map(({ cells }) => cells),
    ), 'utf8'), limits);
    expect(readBack.headers).toEqual(original.headers);
    expect(readBack.rows).toEqual(original.rows);
    const rawHeaderReadBack = parseUploadFile(Buffer.from(toCsv(
      original.rawHeaders, original.rows.map(({ cells }) => cells),
    ), 'utf8'), limits);
    expect(rawHeaderReadBack.rawHeaders).toEqual(original.rawHeaders);
    expect(rawHeaderReadBack.rows).toEqual(original.rows);
    if (name.startsWith('octanove')) {
      expect(original.rows.find(({ rowNumber }) => rowNumber === 606)?.cells)
        .toEqual(['batter', '', 'C1', 'one who bats']);
      expect(original.rows.find(({ rowNumber }) => rowNumber === 2129)?.cells)
        .toEqual(['remonstrate', 'vern', 'C2', '']);
    }
  });

  it.each(['=SUM(A1),"B1"', '+x', '-x', '@y'])(
    'B2#54/Review Focus 2: the existing normalizer removes the exported guard from %j before hashing', (value) => {
      const headers = ['headword', 'pos', 'gloss_vi', 'definition_en', 'example_en_1', 'topics', 'accepted_forms'];
      const cells = ['bank', 'noun', value, value, value, value, value];
      const exported = parseUploadFile(Buffer.from(toCsv(headers, [cells]), 'utf8'), limits);
      expect(exported.rows[0].cells.slice(2)).toEqual(Array(5).fill(`'${value}`));
      const plain = normalizeRow(2, Object.fromEntries(headers.map((header, index) => [header, cells[index]])),
        { hasLevelColumn: false });
      const imported = normalizeRow(2, Object.fromEntries(headers.map((header, index) => [header, exported.rows[0].cells[index]])),
        { hasLevelColumn: false });
      expect(plain.ok).toBe(true);
      expect(imported).toEqual(plain);
      if (!plain.ok || !imported.ok) throw new Error('Invalid round-trip fixture');
      expect(imported.row.content?.glossVi).toBe(value);
      const empty: RevisionContent = { glossVi: null, definitionEn: null, examplesEn: [], topicCodes: [], acceptedForms: [] };
      expect(contentHash({ ...empty, ...imported.row.content })).toBe(contentHash({ ...empty, ...plain.row.content }));
    },
  );
});

describe('rejectedCsv', () => {
  it('control: a round-1 file gains the pair', () => {
    const text = rejectedCsv(['headword', 'pos'], [{ raw: ['cat', 'x'], rowNumber: 2, errors: ['bad pos', 'other'] }]);
    expect(text).toBe('\uFEFFheadword,pos,_row,_error\r\ncat,x,2,bad pos; other\r\n');
  });

  it('T4/FE23: a round-3 file with _row/_error twice comes out with one pair and re-parses through parseUploadFile', () => {
    const text = rejectedCsv(
      ['headword', ' _Row ', 'pos', '_ERROR', '_row', '_error', 'notes'],
      [{ raw: ['cat', '2', 'x', 'old', '5', 'older', 'n'], rowNumber: 9, errors: ['bad'] }],
    );
    expect(text).toBe('\uFEFFheadword,pos,notes,_row,_error\r\ncat,x,n,9,bad\r\n');
    const parsed = parseUploadFile(Buffer.from(text, 'utf8'), limits);
    expect(parsed.headers).toEqual(['headword', 'pos', 'notes', '_row', '_error']);
    expect(parsed.rows[0].cells).toEqual(['cat', 'x', 'n', '9', 'bad']);
  });
});
