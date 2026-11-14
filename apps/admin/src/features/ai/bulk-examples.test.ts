import { describe, expect, it } from 'vitest';
import { BULK_MAX, parseExamples } from './bulk-examples';

const FIELDS = ['word', 'part_of_speech', 'level', 'meaning_vi', 'context_label'];
const HEADER = 'word,part_of_speech,level,meaning_vi,context_label,note';

describe('parseExamples: CSV', () => {
  it('reads the header and one row per line; a note column is the note; an empty cell is null; lines count from the header as 1', () => {
    const parsed = parseExamples(`${HEADER}\ndeploy,verb,B1,triển khai,,a natural B1 sentence\nrhythm,noun,B2,nhịp điệu,music,`, FIELDS);
    expect(parsed.problem).toBeNull();
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows).toEqual([
      { line: 2, input: { word: 'deploy', part_of_speech: 'verb', level: 'B1', meaning_vi: 'triển khai', context_label: null }, note: 'a natural B1 sentence' },
      { line: 3, input: { word: 'rhythm', part_of_speech: 'noun', level: 'B2', meaning_vi: 'nhịp điệu', context_label: 'music' }, note: null },
    ]);
  });

  it('quoted cells keep commas, doubled quotes and line breaks, and the next row keeps its true line number', () => {
    const parsed = parseExamples(`word,meaning_vi,note\n"a, b","say ""hi""\nthere",x\nnext,y,`, FIELDS);
    expect(parsed.rows.map((r) => [r.line, r.input.word, r.input.meaning_vi])).toEqual([[2, 'a, b', 'say "hi"\nthere'], [4, 'next', 'y']]);
  });

  it('CRLF, a BOM, blank lines and a missing final newline are fine', () => {
    const parsed = parseExamples(`${String.fromCharCode(0xfeff)}word,meaning_vi\r\n\r\ndeploy,triển khai\r\nrun,chạy`, FIELDS);
    expect(parsed.rows.map((r) => [r.line, r.input.word])).toEqual([[3, 'deploy'], [4, 'run']]);
  });

  it('a copy from a spreadsheet (tabs) is read the same way', () => {
    const parsed = parseExamples('word\tmeaning_vi\tnote\ndeploy\ttriển khai\tn1', FIELDS);
    expect(parsed.rows).toEqual([{ line: 2, input: { word: 'deploy', meaning_vi: 'triển khai' }, note: 'n1' }]);
  });

  it('a cell holding a JSON list or object is that value, like a box of the add form', () => {
    const parsed = parseExamples('word,context_label\ndeploy,"[""a"",""b""]"', ['word', 'context_label']);
    expect(parsed.rows[0]!.input.context_label).toEqual(['a', 'b']);
  });

  it('a header with a column the operation does not have → a file problem naming it, no rows', () => {
    expect(parseExamples('word,meaningvi\ndeploy,x', FIELDS)).toMatchObject({ rows: [], problem: { kind: 'columns', names: ['meaningvi'] } });
  });

  it('a row with more cells than the header is a local error on its line; the others stay', () => {
    const parsed = parseExamples('word,meaning_vi\na,b,c\nd,e', FIELDS);
    expect(parsed.errors).toEqual([{ line: 2, reason: 'columns' }]);
    expect(parsed.rows.map((r) => r.line)).toEqual([3]);
  });

  it('a row with fewer cells leaves the rest empty (null), for the API to judge', () => {
    expect(parseExamples('word,meaning_vi\ndeploy', FIELDS).rows[0]!.input).toEqual({ word: 'deploy', meaning_vi: null });
  });
});

describe('parseExamples: JSON Lines', () => {
  it('reads {"input", "note"} or the flat fields, one per line', () => {
    const parsed = parseExamples('{"input":{"word":"deploy","meaning_vi":"x"},"note":" n "}\n\n{"word":"run","meaning_vi":"y","note":"z"}', FIELDS);
    expect(parsed.rows).toEqual([
      { line: 1, input: { word: 'deploy', meaning_vi: 'x' }, note: 'n' },
      { line: 3, input: { word: 'run', meaning_vi: 'y' }, note: 'z' },
    ]);
  });

  it('a line that is not JSON, or not an object, is a local error on its line', () => {
    const parsed = parseExamples('{"word":"a"}\n{oops\n{"word":"b"}\n[1]', FIELDS);
    expect(parsed.rows.map((r) => r.line)).toEqual([1, 3]);
    expect(parsed.errors).toEqual([{ line: 2, reason: 'bad-json' }, { line: 4, reason: 'not-object' }]);
  });
});

describe('parseExamples: expected and split (nhóm B M1)', () => {
  const FORMS = '"{""forms"":[""deploy""]}"';

  it('CSV: an expected cell holding a JSON object is that object and a split cell is kept; neither is part of the input', () => {
    const parsed = parseExamples(`word,meaning_vi,expected,split\ndeploy,x,${FORMS},held_out`, FIELDS);
    expect(parsed.problem).toBeNull();
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows).toEqual([{ line: 2, input: { word: 'deploy', meaning_vi: 'x' }, note: null, expected: { forms: ['deploy'] }, split: 'held_out' }]);
  });

  it('CSV: an empty split cell leaves split out of the row; an empty expected cell is null', () => {
    const parsed = parseExamples(`word,expected,split\ndeploy,${FORMS},\nrun,,dev`, FIELDS);
    expect(parsed.rows[0]).toEqual({ line: 2, input: { word: 'deploy' }, note: null, expected: { forms: ['deploy'] } });
    expect('split' in parsed.rows[0]!).toBe(false);
    expect(parsed.rows[1]).toEqual({ line: 3, input: { word: 'run' }, note: null, expected: null, split: 'dev' });
  });

  it('CSV: an expected cell that is plain text stays text and is no local error: only that row will be refused, by the API', () => {
    const parsed = parseExamples('word,expected\ndeploy,"deploy, deployed"\nrun,"{""forms"":[""run""]}"', FIELDS);
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows.map((row) => row.expected)).toEqual(['deploy, deployed', { forms: ['run'] }]);
  });

  it('CSV without those columns: the rows carry no expected and no split key', () => {
    const parsed = parseExamples('word,meaning_vi\ndeploy,x', FIELDS);
    expect('expected' in parsed.rows[0]!).toBe(false);
    expect('split' in parsed.rows[0]!).toBe(false);
  });

  it('the header names expected and split are columns; any other unknown name is still a problem', () => {
    expect(parseExamples('word,expected,split,note\ndeploy,,,', FIELDS).problem).toBeNull();
    expect(parseExamples('word,expectd\ndeploy,x', FIELDS)).toMatchObject({ rows: [], problem: { kind: 'columns', names: ['expectd'] } });
  });

  it('TSV (a copy from a spreadsheet) reads the two columns as well', () => {
    const parsed = parseExamples('word\texpected\tsplit\ndeploy\t{"forms":["deploy"]}\theld_out', FIELDS);
    expect(parsed.rows).toEqual([{ line: 2, input: { word: 'deploy' }, note: null, expected: { forms: ['deploy'] }, split: 'held_out' }]);
  });

  it('JSON Lines, flat: expected and split are row fields and never copied into the input', () => {
    const parsed = parseExamples('{"word":"run","expected":{"forms":["run"]},"split":"dev","note":" n "}', FIELDS);
    expect(parsed.rows).toEqual([{ line: 1, input: { word: 'run' }, note: 'n', expected: { forms: ['run'] }, split: 'dev' }]);
  });

  it('JSON Lines, nested: {"input", "note", "expected", "split"}', () => {
    const parsed = parseExamples('{"input":{"word":"run"},"expected":{"forms":["run","ran"]},"split":"held_out"}\n{"input":{"word":"go"}}', FIELDS);
    expect(parsed.rows).toEqual([
      { line: 1, input: { word: 'run' }, note: null, expected: { forms: ['run', 'ran'] }, split: 'held_out' },
      { line: 2, input: { word: 'go' }, note: null },
    ]);
  });

  it('JSON Lines: a split that is not a string is passed on as text, for the API to refuse; an empty one is left out', () => {
    const parsed = parseExamples('{"word":"a","split":5}\n{"word":"b","split":""}\n{"word":"c","split":null}', FIELDS);
    expect(parsed.rows.map((row) => row.split)).toEqual(['5', undefined, undefined]);
  });
});

describe('parseExamples: limits', () => {
  it('nothing but whitespace, or a header only → empty', () => {
    expect(parseExamples('  \n ', FIELDS).problem).toEqual({ kind: 'empty' });
    expect(parseExamples('word,meaning_vi\n', FIELDS).problem).toEqual({ kind: 'empty' });
  });

  it('more rows than one request carries → too-many with the count', () => {
    const text = `word\n${Array.from({ length: BULK_MAX + 1 }, (_, i) => `w${i}`).join('\n')}`;
    expect(parseExamples(text, FIELDS)).toMatchObject({ problem: { kind: 'too-many', count: BULK_MAX + 1 } });
    expect(parseExamples(`word\n${Array.from({ length: BULK_MAX }, (_, i) => `w${i}`).join('\n')}`, FIELDS).problem).toBeNull();
  });
});
