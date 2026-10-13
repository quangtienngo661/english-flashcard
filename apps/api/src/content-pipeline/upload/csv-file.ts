import { TextDecoder } from 'node:util';
import { CsvError, parse } from 'csv-parse/sync';

export class UploadFileError extends Error {
  readonly type: 'file-invalid' | 'file-too-large';
  readonly detail: string;

  constructor(type: 'file-invalid' | 'file-too-large', detail: string) {
    super(detail);
    this.name = 'UploadFileError';
    this.type = type;
    this.detail = detail;
  }
}

export type ParsedFile = {
  delimiter: ',' | ';' | '\t';
  rawHeaders: string[];
  headers: string[];
  rows: Array<{ rowNumber: number; cells: string[] }>;
};

const delimiters = [',', ';', '\t'] as const;
const delimiterNames = {
  ',': 'comma (,)',
  ';': 'semicolon (;)',
  '\t': 'tab (\\t)',
};

function detectDelimiter(text: string): ParsedFile['delimiter'] {
  const headerLine = text.split(/\r\n|\r|\n/u, 1)[0];
  const counts = { ',': 0, ';': 0, '\t': 0 };
  let quoted = false;
  for (let index = 0; index < headerLine.length; index++) {
    const character = headerLine[index];
    if (character === '"') {
      if (quoted && headerLine[index + 1] === '"') index++;
      else quoted = !quoted;
    } else if (
      !quoted &&
      (character === ',' || character === ';' || character === '\t')
    ) {
      counts[character]++;
    }
  }

  const found = delimiters.filter((delimiter) => counts[delimiter] > 0);
  // Any two unquoted candidates are ambiguous, regardless of their counts.
  // With no candidates, comma lets parsing/header validation report the problem.
  if (found.length > 1) {
    const description = found
      .map((delimiter) => `${delimiterNames[delimiter]}: ${counts[delimiter]}`)
      .join(', ');
    throw new UploadFileError(
      'file-invalid',
      `Ambiguous header delimiters (${description}). Use one delimiter throughout the file and quote header cells containing other delimiters.`,
    );
  }
  return found[0] ?? ',';
}

export function parseUploadFile(
  bytes: Buffer,
  limits: { maxRows: number; maxBytes: number },
): ParsedFile {
  if (bytes.length > limits.maxBytes) {
    throw new UploadFileError(
      'file-too-large',
      `File contains ${bytes.length} bytes; the limit is ${limits.maxBytes} bytes. Upload a smaller file.`,
    );
  }

  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new UploadFileError(
      'file-invalid',
      'File is not valid UTF-8. Save it as "CSV UTF-8" in Excel or download it as CSV from Google Sheets, then upload it again.',
    );
  }

  const delimiter = detectDelimiter(text);
  let rawHeaders: string[] | undefined;
  let records: Record<string, string>[];
  try {
    records = parse<Record<string, string>>(text, {
      bom: true,
      delimiter,
      skip_empty_lines: true,
      relax_column_count: false,
      columns: (header) => {
        rawHeaders = header;
        // Positional keys preserve all cells even when header names repeat.
        // Columns mode also gives CSV_RECORD_INCONSISTENT_COLUMNS for ragged rows.
        return header.map((_, index) => String(index));
      },
    });
  } catch (error) {
    const code = error instanceof CsvError ? ` (${error.code})` : '';
    const message = error instanceof Error ? error.message : String(error);
    throw new UploadFileError(
      'file-invalid',
      `CSV parsing failed${code}: ${message}. Correct the CSV structure and upload it again.`,
    );
  }

  if (rawHeaders === undefined) {
    throw new UploadFileError(
      'file-invalid',
      'File has no header row. Add a header containing pos and either headword or lemma.',
    );
  }

  const headers = rawHeaders.map((header) => header.trim().toLowerCase());
  if (!headers.includes('pos')) {
    throw new UploadFileError(
      'file-invalid',
      'Missing required pos column. Add pos to the header row.',
    );
  }
  if (!headers.includes('headword') && !headers.includes('lemma')) {
    throw new UploadFileError(
      'file-invalid',
      'Missing both headword and lemma columns. Add either headword or lemma to the header row.',
    );
  }

  const seen = new Set<string>();
  for (const header of headers) {
    if (seen.has(header)) {
      throw new UploadFileError(
        'file-invalid',
        `Duplicate header "${header}" after trimming and lower-casing. Rename or remove the repeated column.`,
      );
    }
    seen.add(header);
  }

  if (records.length === 0) {
    throw new UploadFileError(
      'file-invalid',
      'File contains no data rows. Add at least one data row below the header.',
    );
  }
  if (records.length > limits.maxRows) {
    throw new UploadFileError(
      'file-too-large',
      `File contains ${records.length} data rows; the limit is ${limits.maxRows} data rows. Split the file into smaller uploads.`,
    );
  }

  return {
    delimiter,
    rawHeaders,
    headers,
    rows: records.map((record, index) => ({
      rowNumber: index + 2,
      cells: Object.values(record),
    })),
  };
}
