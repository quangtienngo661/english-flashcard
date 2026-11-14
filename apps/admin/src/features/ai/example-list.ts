import { isDevExample, type ExampleRow } from './ai-api';
import { exampleSummary } from './prompt-form';

/** Orders of the example list. The API sends the working set oldest first, so `oldest` is the order as received. */
export const EXAMPLE_SORTS = ['oldest', 'newest', 'az', 'za', 'devFirst', 'heldOutFirst'] as const;
export type ExampleSort = (typeof EXAMPLE_SORTS)[number];

export const EXAMPLES_PAGE_SIZE = 20;

export type ExampleFilters = { search: string; level: string; split: 'all' | 'dev' | 'held_out' };
export const EXAMPLE_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

/** Text and level filters apply only to dev; never inspect a held-out input, even if a caller supplies one. */
export function filterExamples(rows: readonly ExampleRow[], filters: ExampleFilters): ExampleRow[] {
  const search = filters.search.trim().toLowerCase();
  return rows.filter((row) => {
    if (filters.split !== 'all' && row.split !== filters.split) return false;
    if (!isDevExample(row)) return search === '' && filters.level === 'all';
    const input = row.input !== null && typeof row.input === 'object' ? row.input as Record<string, unknown> : {};
    if (filters.level !== 'all' && input.level !== filters.level) return false;
    const text = [input.word, input.meaning_vi, input.meaning_en, input.meaning, input.sentence].filter((v) => typeof v === 'string').join(' ').toLowerCase();
    return search === '' || text.includes(search);
  });
}

/**
 * The rows in the chosen order, as a new list. Held-out rows show no text, so the A → Z orders keep them last in the API's
 * order; every tie keeps the API's order too.
 */
export function sortExamples(rows: readonly ExampleRow[], sort: ExampleSort): ExampleRow[] {
  const indexed = rows.map((row, index) => ({ row, index, text: isDevExample(row) ? exampleSummary(row.input).toLowerCase() : null }));
  const byIndex = (a: { index: number }, b: { index: number }) => a.index - b.index;
  const heldOutLast = (a: { row: ExampleRow }, b: { row: ExampleRow }) => Number(!isDevExample(a.row)) - Number(!isDevExample(b.row));
  const byText = (direction: 1 | -1) => (a: (typeof indexed)[number], b: (typeof indexed)[number]) => {
    if (a.text === null || b.text === null) return heldOutLast(a, b) || byIndex(a, b);
    return direction * a.text.localeCompare(b.text) || byIndex(a, b);
  };
  const compare = {
    oldest: byIndex,
    newest: (a: { index: number }, b: { index: number }) => b.index - a.index,
    az: byText(1),
    za: byText(-1),
    devFirst: (a: (typeof indexed)[number], b: (typeof indexed)[number]) => heldOutLast(a, b) || byIndex(a, b),
    heldOutFirst: (a: (typeof indexed)[number], b: (typeof indexed)[number]) => heldOutLast(b, a) || byIndex(a, b),
  }[sort];
  return indexed.sort(compare).map(({ row }) => row);
}

/** Pages needed for `total` rows; an empty list is one (empty) page. */
export function pageCount(total: number, size = EXAMPLES_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / size));
}

/** The rows of page `page` (1-based), clamped to the first and the last page. */
export function pageOf<T>(rows: readonly T[], page: number, size = EXAMPLES_PAGE_SIZE): T[] {
  const last = pageCount(rows.length, size);
  const current = Math.min(Math.max(page, 1), last);
  return rows.slice((current - 1) * size, current * size);
}
