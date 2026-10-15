/** The API reads the header as in `apps/api/src/content-pipeline/upload/csv-file.ts` (delimiter) and `columns.ts` (names). */
const LEVEL_COLUMNS = new Set(['cefr', 'level']);
const DELIMITERS = [',', ';', '\t'] as const;
/** Enough for any header row; the file itself is not read further in the browser. */
const HEAD_BYTES = 64 * 1024;
const BOM = 0xfeff;

function splitCells(line: string): string[] {
  const counts: Record<string, number> = { ',': 0, ';': 0, '\t': 0 };
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (quoted && line[i + 1] === '"') i++;
      else quoted = !quoted;
    } else if (!quoted && c in counts) counts[c]++;
  }
  const delimiter = DELIMITERS.reduce((best, d) => (counts[d] > counts[best] ? d : best), ',' as (typeof DELIMITERS)[number]);

  const cells: string[] = [];
  let cell = '';
  quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (quoted && line[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === delimiter && !quoted) {
      cells.push(cell);
      cell = '';
    } else cell += c;
  }
  cells.push(cell);
  return cells;
}

/** The first line of the file as the API normalizes it: BOM stripped, trimmed, lower-case. `[]` for an empty file. */
export async function readCsvHeader(file: File): Promise<string[]> {
  const raw = await file.slice(0, HEAD_BYTES).text();
  const text = raw.charCodeAt(0) === BOM ? raw.slice(1) : raw;
  const line = text.split(/\r\n|\r|\n/u, 1)[0];
  if (line === undefined || line.trim() === '') return [];
  return splitCells(line).map((header) => header.trim().toLowerCase());
}

export function hasLevelColumn(headers: string[]): boolean {
  return headers.some((header) => LEVEL_COLUMNS.has(header));
}
