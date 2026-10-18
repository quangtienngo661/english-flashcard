import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { classifyColumns } from './columns.js';

const emptyClassification = {
  hasLevelColumn: false,
  contentColumns: [],
  extraColumns: [],
  ignoredColumns: [],
  unknownColumns: [],
  problems: [],
};

describe('classifyColumns', () => {
  it('B2#28: preserves the input order of every content column', () => {
    const headers = [
      'example_en_3',
      'topics',
      'gloss_vi',
      'accepted_forms',
      'example_en_1',
      'definition_en',
      'example_en_2',
    ];
    expect(classifyColumns(['headword', 'pos', ...headers])).toEqual({
      ...emptyClassification,
      contentColumns: headers,
    });
  });

  it('B2#28: recognizes all four extra columns using the two real source headers', () => {
    const directory = new URL(
      '../../../../../docs/preparation/evidence/wordlists_2026-10-02/',
      import.meta.url,
    );
    const realHeaders = [
      'cefrj-vocabulary-profile-1.5.csv',
      'octanove-vocabulary-profile-c1c2-1.0.csv',
    ].map((fileName) =>
      readFileSync(new URL(fileName, directory), 'utf8')
        .split(/\r?\n/u, 1)[0]
        .split(','),
    );
    expect(realHeaders).toEqual([
      [
        'headword',
        'pos',
        'CEFR',
        'CoreInventory 1',
        'CoreInventory 2',
        'Threshold',
      ],
      ['headword', 'pos', 'CEFR', 'notes'],
    ]);
    expect(
      classifyColumns(
        realHeaders[0].map((header) => header.trim().toLowerCase()),
      ),
    ).toEqual({
      ...emptyClassification,
      hasLevelColumn: true,
      extraColumns: ['coreinventory 1', 'coreinventory 2', 'threshold'],
    });
    expect(
      classifyColumns(
        realHeaders[1].map((header) => header.trim().toLowerCase()),
      ),
    ).toEqual({
      ...emptyClassification,
      hasLevelColumn: true,
      extraColumns: ['notes'],
    });
  });

  it('B2#28: preserves the input order of the extra columns', () => {
    const headers = [
      'notes',
      'threshold',
      'coreinventory 2',
      'coreinventory 1',
    ];
    expect(classifyColumns(headers)).toEqual({
      ...emptyClassification,
      extraColumns: headers,
    });
  });

  it('B2#28: silently ignores every underscore-prefixed column', () => {
    const headers = [
      '_row',
      '_error',
      '_missing',
      '_status',
      '_anything_else',
      '_',
      '_gloss_vi',
    ];
    expect(classifyColumns(headers)).toEqual({
      ...emptyClassification,
      ignoredColumns: headers,
    });
  });

  it('B2#28: warns that each unknown column is ignored without throwing', () => {
    const result = classifyColumns([
      'headword',
      'pos',
      'glos_vi',
      'unrecognized',
    ]);
    expect(result.unknownColumns).toEqual(['glos_vi', 'unrecognized']);
    expect(result.problems).toHaveLength(2);
    for (const [index, header] of result.unknownColumns.entries()) {
      expect(result.problems[index]).toContain(header);
      expect(result.problems[index]).toMatch(/unknown/iu);
      expect(result.problems[index]).toMatch(/ignored/iu);
    }
    expect(result.contentColumns).toEqual([]);
    expect(result.extraColumns).toEqual([]);
    expect(result.ignoredColumns).toEqual([]);
  });

  it.each(['context_label', 'sense_id', 'revision', 'replace_meaning'])(
    'B2#28: recognizes selector %s without classifying it as content, extra or unknown',
    (header) => {
      expect(classifyColumns([header])).toEqual(emptyClassification);
    },
  );

  it.each([
    { headers: ['headword'] },
    { headers: ['lemma'] },
    { headers: ['headword', 'lemma'] },
  ])(
    'B2#28: recognizes identity synonyms $headers without treating them as level columns',
    ({ headers }) => {
      expect(classifyColumns([...headers, 'pos'])).toEqual(emptyClassification);
    },
  );

  it.each([
    { headers: ['cefr'] },
    { headers: ['level'] },
    { headers: ['cefr', 'level'] },
  ])(
    'B2#28: recognizes level synonyms $headers and sets hasLevelColumn',
    ({ headers }) => {
      expect(classifyColumns(headers)).toEqual({
        ...emptyClassification,
        hasLevelColumn: true,
      });
    },
  );

  it('B2#28: leaves missing and duplicate header rejection to parseUploadFile', () => {
    expect(classifyColumns([])).toEqual(emptyClassification);
    expect(classifyColumns(['pos', 'pos'])).toEqual(emptyClassification);
    expect(classifyColumns(['lemma', 'lemma'])).toEqual(emptyClassification);
  });
});
