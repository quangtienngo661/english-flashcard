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
