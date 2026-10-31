import { isDevExample, type ExampleRow } from './ai-api';
import { exampleSummary } from './prompt-form';

/** Orders of the example list. The API sends the working set oldest first, so `oldest` is the order as received. */
export const EXAMPLE_SORTS = ['oldest', 'newest', 'az', 'za', 'devFirst', 'heldOutFirst'] as const;
export type ExampleSort = (typeof EXAMPLE_SORTS)[number];

export const EXAMPLES_PAGE_SIZE = 20;

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
