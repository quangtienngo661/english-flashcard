import { describe, expect, it } from 'vitest';
import { hasLevelColumn, readCsvHeader } from './csv-header';

const csv = (text: string) => new File([text], 'x.csv', { type: 'text/csv' });

describe('readCsvHeader', () => {
  it('trims and lower-cases the first line, like the API does', async () => {
    expect(await readCsvHeader(csv('Headword, POS ,CEFR\r\ncat,noun,A1\r\n'))).toEqual(['headword', 'pos', 'cefr']);
  });

  it('strips a BOM', async () => {
    expect(await readCsvHeader(csv('﻿pos,headword\n'))).toEqual(['pos', 'headword']);
  });

  it('detects ; and tab separators', async () => {
    expect(await readCsvHeader(csv('pos;headword;level\n'))).toEqual(['pos', 'headword', 'level']);
    expect(await readCsvHeader(csv('pos\theadword\tcefr\n'))).toEqual(['pos', 'headword', 'cefr']);
  });

  it('a quoted header cell may contain the separator', async () => {
    expect(await readCsvHeader(csv('pos,"head,word",level\n'))).toEqual(['pos', 'head,word', 'level']);
  });

  it('an empty file has no headers', async () => {
    expect(await readCsvHeader(csv(''))).toEqual([]);
  });
});

describe('hasLevelColumn', () => {
  it('true for cefr or level, false otherwise', () => {
    expect(hasLevelColumn(['pos', 'cefr'])).toBe(true);
    expect(hasLevelColumn(['pos', 'level'])).toBe(true);
    expect(hasLevelColumn(['pos', 'headword', 'threshold'])).toBe(false);
  });
});
