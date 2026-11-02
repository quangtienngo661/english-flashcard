import { describe, expect, it } from 'vitest';
import type { ExampleRow } from './ai-api';
import { EXAMPLES_PAGE_SIZE, filterExamples, pageCount, pageOf, sortExamples } from './example-list';
import { evalExample, heldOutExample } from './prompt-test-support';

// The API's order is oldest first: e1 (go), h1 (held-out), e2 (bank), e3 (Apple), h2 (held-out).
const ROWS: ExampleRow[] = [evalExample('e1', 'go'), heldOutExample('h1'), evalExample('e2', 'bank'), evalExample('e3', 'Apple'), heldOutExample('h2')];
const ids = (rows: ExampleRow[]) => rows.map((row) => row.id);

describe('filterExamples', () => {
  const bank = { ...evalExample('bank', 'bank'), input: { word: 'bank', meaning_vi: 'Bờ sông', meaning_en: 'river edge', level: 'B1' } };
  const held = { ...heldOutExample('hidden'), get input(): never { throw new Error('Held-out content must never be read'); } };
  const rows = [evalExample('go', 'go'), bank, held];

  it('searches dev word and meanings case-insensitively and combines split and level filters', () => {
    expect(ids(filterExamples(rows, { search: ' BANK ', level: 'all', split: 'all' }))).toEqual(['bank']);
    expect(ids(filterExamples(rows, { search: 'bờ SÔNG', level: 'B1', split: 'dev' }))).toEqual(['bank']);
    expect(ids(filterExamples(rows, { search: 'RIVER', level: 'all', split: 'all' }))).toEqual(['bank']);
    expect(ids(filterExamples(rows, { search: 'bank', level: 'A1', split: 'dev' }))).toEqual([]);
    expect(ids(filterExamples(rows, { search: '', level: 'all', split: 'held_out' }))).toEqual(['hidden']);
  });

  it('held-out rows never leak text or level through search, level filters, or sorting', () => {
    expect(ids(filterExamples(rows, { search: '', level: 'all', split: 'all' }))).toEqual(['go', 'bank', 'hidden']);
    expect(ids(filterExamples(rows, { search: '', level: 'A1', split: 'all' }))).toEqual(['go']);
    expect(ids(filterExamples(rows, { search: 'hidden', level: 'all', split: 'held_out' }))).toEqual([]);
    expect(ids(filterExamples(rows, { search: '', level: 'B1', split: 'held_out' }))).toEqual([]);
    expect(ids(sortExamples(rows, 'az'))).toEqual(['bank', 'go', 'hidden']);
  });
});

describe('sortExamples', () => {
  it('oldest keeps the API order; newest reverses it, held-out rows included', () => {
    expect(ids(sortExamples(ROWS, 'oldest'))).toEqual(['e1', 'h1', 'e2', 'e3', 'h2']);
    expect(ids(sortExamples(ROWS, 'newest'))).toEqual(['h2', 'e3', 'e2', 'h1', 'e1']);
  });

  it('A → Z and Z → A sort dev rows by their summary, ignoring case; hidden held-out rows stay last in their own order', () => {
    expect(ids(sortExamples(ROWS, 'az'))).toEqual(['e3', 'e2', 'e1', 'h1', 'h2']);
    expect(ids(sortExamples(ROWS, 'za'))).toEqual(['e1', 'e2', 'e3', 'h1', 'h2']);
  });

  it('dev first and held-out first group by split and keep the API order inside each group', () => {
    expect(ids(sortExamples(ROWS, 'devFirst'))).toEqual(['e1', 'e2', 'e3', 'h1', 'h2']);
    expect(ids(sortExamples(ROWS, 'heldOutFirst'))).toEqual(['h1', 'h2', 'e1', 'e2', 'e3']);
  });

  it('does not change the list it was given', () => {
    const copy = [...ROWS];
    sortExamples(ROWS, 'newest');
    expect(ROWS).toEqual(copy);
  });
});

describe('pageCount and pageOf', () => {
  const numbers = Array.from({ length: 45 }, (_, i) => i);

  it('pages of 20: 0 rows is 1 page, 20 is 1, 21 is 2, 45 is 3', () => {
    expect(EXAMPLES_PAGE_SIZE).toBe(20);
    expect([0, 1, 20, 21, 45].map((n) => pageCount(n))).toEqual([1, 1, 1, 2, 3]);
  });

  it('returns the rows of a page; the last page holds the rest', () => {
    expect(pageOf(numbers, 1)).toEqual(numbers.slice(0, 20));
    expect(pageOf(numbers, 2)).toEqual(numbers.slice(20, 40));
    expect(pageOf(numbers, 3)).toEqual([40, 41, 42, 43, 44]);
  });

  it('clamps a page out of range to the first or the last page', () => {
    expect(pageOf(numbers, 0)).toEqual(numbers.slice(0, 20));
    expect(pageOf(numbers, 9)).toEqual([40, 41, 42, 43, 44]);
    expect(pageOf([], 3)).toEqual([]);
  });
});
