/** Guard the original text before RFC 4180 encoding so the apostrophe stays inside quotes. */
export function csvCell(value: string): string {
  const guarded = /^[=+\-@]/u.test(value) ? `'${value}` : value;
  return /[,"\r\n]/u.test(guarded) ? `"${guarded.replace(/"/gu, '""')}"` : guarded;
}

export function toCsv(headers: string[], rows: string[][]): string {
  return `\uFEFF${[headers, ...rows].map(csvRow).join('')}`;
}

/** One complete CRLF-terminated row, with no BOM; safe to join across stream chunks. */
export function csvRow(cells: string[]): string {
  return `${cells.map(csvCell).join(',')}\r\n`;
}

const REPORT_COLUMNS = new Set(['_row', '_error']);

/** rejected.csv: the batch's own columns (any earlier `_row`/`_error` pair dropped) plus one fresh pair. */
export function rejectedCsv(
  rawHeaders: string[], rows: Array<{ raw: string[]; rowNumber: number; errors: string[] }>,
): string {
  const keep = rawHeaders.map((header) => !REPORT_COLUMNS.has(header.trim().toLowerCase()));
  const pick = (cells: string[]) => cells.filter((_, index) => keep[index] ?? true);
  return toCsv([...pick(rawHeaders), '_row', '_error'],
    rows.map((row) => [...pick(row.raw), String(row.rowNumber), row.errors.join('; ')]));
}
