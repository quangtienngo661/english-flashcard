import { fieldValue } from './prompt-form';

/** The API's limit per operation (`ai.constants.ts` EVAL_EXAMPLES_PER_OPERATION_MAX) and per request. */
export const BULK_MAX = 1000;

/** `expected` and `split` are present only when the line gave them (a column, or a key of the JSON line); `expected` text that is no object is for the API to refuse. */
export type BulkRow = { line: number; input: Record<string, unknown>; note: string | null; expected?: unknown; split?: string };
export type BulkLocalError = { line: number; reason: 'bad-json' | 'not-object' | 'columns' };
export type BulkParse = {
  rows: BulkRow[];
  /** Lines that could not even be read as a row; the API never sees them. */
  errors: BulkLocalError[];
  /** The whole text is unusable: nothing to import, a header with unknown columns, or more rows than one request may carry. */
  problem: { kind: 'empty' } | { kind: 'columns'; names: string[] } | { kind: 'too-many'; count: number } | null;
};

const NOTE = 'note';
const EXPECTED = 'expected';
const SPLIT = 'split';
/** Columns of a line besides the operation's input fields. */
export const EXTRA_COLUMNS = [EXPECTED, SPLIT, NOTE];
const isRowField = (name: string) => name === NOTE || name === EXPECTED || name === SPLIT;

/** A split cell or key: trimmed text; empty or null is no split (the API then takes the next one by the ratio), another type is passed on as text to be refused. */
function splitOf(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const text = typeof value === 'string' ? value.trim() : JSON.stringify(value);
  return text === '' ? undefined : text;
}
const BOM = new RegExp('^' + String.fromCharCode(0xfeff));

/** RFC 4180 reader: quoted cells may hold the delimiter, doubled quotes and line breaks. Returns each record with its first line. */
function readRecords(text: string, delimiter: string): Array<{ line: number; cells: string[] }> {
  const records: Array<{ line: number; cells: string[] }> = [];
  let cells: string[] = [];
  let cell = '';
  let quoted = false;
  let line = 1;
  let start = 1;
  let touched = false;
  const endCell = () => { cells.push(cell); cell = ''; };
  const endRecord = () => {
    endCell();
    // A record of one empty cell is a blank line, not a row.
    if (touched || cells.some((value) => value.trim() !== '')) records.push({ line: start, cells });
    cells = [];
    touched = false;
    start = line;
  };
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { cell += '"'; i += 1; } else if (char === '"') quoted = false;
      else { if (char === '\n') line += 1; cell += char; }
      continue;
    }
    if (char === '"' && cell === '') { quoted = true; touched = true; } else if (char === delimiter) { endCell(); touched = true; } else if (char === '\n') {
      line += 1;
      endRecord();
    } else if (char !== '\r') cell += char;
  }
  if (cell !== '' || cells.length > 0 || touched) endRecord();
  return records;
}

/**
 * Text pasted or read from a file → example rows (owner 28/10/2026: file or paste, the same reader).
 * - JSON Lines when the first character is `{`: one object per line, either `{"input": {...}, "note": "..."}` or the input fields flat;
 *   `expected` and `split` are keys of the line in both forms, never part of the input.
 * - Otherwise CSV, or TSV when the header holds a tab (a copy from a spreadsheet): the first line names the columns, each other line is an
 *   example. Columns are the operation's input fields plus optional `note`, `expected` and `split`; a cell is read like a box of the add form
 *   (empty is null, a JSON list or object is that value). An empty `split` cell leaves the split to the API.
 */
export function parseExamples(raw: string, inputFields: string[]): BulkParse {
  const text = raw.replace(BOM, '');
  const result: BulkParse = { rows: [], errors: [], problem: null };
  if (text.trim() === '') return { ...result, problem: { kind: 'empty' } };

  if (text.trimStart().startsWith('{')) {
    text.split('\n').forEach((source, index) => {
      if (source.trim() === '') return;
      const line = index + 1;
      let value: unknown;
      try {
        value = JSON.parse(source);
      } catch {
        result.errors.push({ line, reason: 'bad-json' });
        return;
      }
      if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        result.errors.push({ line, reason: 'not-object' });
        return;
      }
      const object = value as Record<string, unknown>;
      const nested = object.input !== null && typeof object.input === 'object' && !Array.isArray(object.input);
      const input = nested ? (object.input as Record<string, unknown>) : Object.fromEntries(Object.entries(object).filter(([key]) => !isRowField(key)));
      const note = typeof object.note === 'string' && object.note.trim() !== '' ? object.note.trim() : null;
      const split = splitOf(object.split);
      result.rows.push({ line, input, note, ...(EXPECTED in object ? { expected: object.expected } : {}), ...(split ? { split } : {}) });
    });
  } else {
    const header = text.slice(0, text.indexOf('\n') < 0 ? undefined : text.indexOf('\n'));
    const records = readRecords(text, header.includes('\t') ? '\t' : ',');
    const [head, ...body] = records;
    const names = head.cells.map((name) => name.trim());
    const unknown = names.filter((name) => !isRowField(name) && !inputFields.includes(name));
    if (unknown.length > 0) return { ...result, problem: { kind: 'columns', names: unknown } };
    for (const record of body) {
      if (record.cells.length > names.length) {
        result.errors.push({ line: record.line, reason: 'columns' });
        continue;
      }
      const input: Record<string, unknown> = {};
      let note: string | null = null;
      let expected: unknown;
      let split: string | undefined;
      names.forEach((name, index) => {
        const cell = (record.cells[index] ?? '').trim();
        if (name === NOTE) note = cell === '' ? null : cell;
        else if (name === EXPECTED) expected = fieldValue(cell);
        else if (name === SPLIT) split = splitOf(cell);
        else input[name] = fieldValue(cell);
      });
      result.rows.push({ line: record.line, input, note, ...(names.includes(EXPECTED) ? { expected } : {}), ...(split ? { split } : {}) });
    }
  }
  if (result.rows.length + result.errors.length === 0) return { ...result, problem: { kind: 'empty' } };
  if (result.rows.length > BULK_MAX) return { ...result, problem: { kind: 'too-many', count: result.rows.length } };
  return result;
}
