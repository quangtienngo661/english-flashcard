import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseUploadFile, UploadFileError } from './csv-file.js';

const limits = { maxRows: 20_000, maxBytes: 10_485_760 };
const evidenceDirectory = new URL(
  '../../../../../docs/preparation/evidence/wordlists_2026-10-02/',
  import.meta.url,
);

function uploadError(bytes: Buffer, fileLimits = limits): UploadFileError {
  try {
    parseUploadFile(bytes, fileLimits);
  } catch (error) {
    expect(error).toBeInstanceOf(UploadFileError);
    return error as UploadFileError;
  }
  throw new Error('Expected the upload to be rejected');
}

describe('UploadFileError', () => {
  it('B2#3: is a plain Error with the supplied type and actionable detail', () => {
    const error = new UploadFileError('file-invalid', 'Missing pos column.');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('UploadFileError');
    expect(error.type).toBe('file-invalid');
    expect(error.detail).toBe('Missing pos column.');
    expect(error.message).toBe(error.detail);
  });
});

describe('parseUploadFile', () => {
  it('B2#3: preserves raw headers and cells while trimming and lower-casing each header', () => {
    const parsed = parseUploadFile(
      Buffer.from(
        ' HeadWord , POS , CeFr ,CoreInventory  1\n café ,noun, a1 , raw  value \n',
      ),
      limits,
    );
    expect(parsed).toEqual({
      delimiter: ',',
      rawHeaders: [' HeadWord ', ' POS ', ' CeFr ', 'CoreInventory  1'],
      headers: ['headword', 'pos', 'cefr', 'coreinventory  1'],
      rows: [
        { rowNumber: 2, cells: [' café ', 'noun', ' a1 ', ' raw  value '] },
      ],
    });
  });

  it.each(['headword', 'lemma'])(
    'B2#3: accepts %s as the identity column',
    (header) => {
      expect(
        parseUploadFile(Buffer.from(`${header},pos\ncat,noun\n`), limits).rows,
      ).toEqual([{ rowNumber: 2, cells: ['cat', 'noun'] }]);
    },
  );

  it('B2#3: accepts headword and lemma together and leaves invalid row values for Task 14', () => {
    expect(
      parseUploadFile(
        Buffer.from('headword,lemma,pos,cefr\n,,nuon,Z9\n'),
        limits,
      ).rows,
    ).toEqual([{ rowNumber: 2, cells: ['', '', 'nuon', 'Z9'] }]);
  });

  it('B2#3: accepts the exact byte and data-row limits without counting the header', () => {
    const bytes = Buffer.from('headword,pos\ncat,noun\ndog,noun\n');
    const parsed = parseUploadFile(bytes, {
      maxRows: 2,
      maxBytes: bytes.length,
    });
    expect(parsed.rows.map((row) => row.rowNumber)).toEqual([2, 3]);
  });

  it('B2#3: rejects excess bytes before invalid UTF-8 and reports both counts', () => {
    const error = uploadError(Buffer.from([0xff, 0xfe]), {
      maxRows: 0,
      maxBytes: 1,
    });
    expect(error.type).toBe('file-too-large');
    expect(error.detail).toMatch(/2 bytes/u);
    expect(error.detail).toMatch(/1 bytes/u);
  });

  it('B2#3: counts data rows only and reports the row count and limit', () => {
    const error = uploadError(
      Buffer.from('headword,pos\ncat,noun\ndog,noun\n'),
      {
        ...limits,
        maxRows: 1,
      },
    );
    expect(error.type).toBe('file-too-large');
    expect(error.detail).toMatch(/2 data rows/u);
    expect(error.detail).toMatch(/1 data rows/u);
  });

  it.each([
    Buffer.from([0xff]),
    Buffer.from([0xc3, 0x28]),
    Buffer.concat([
      Buffer.from('headword,pos;cefr\n'),
      Buffer.from([0xe2, 0x82]),
    ]),
  ])(
    'B2E33: rejects invalid UTF-8 before delimiter checks with conversion instructions',
    (bytes) => {
      const error = uploadError(bytes);
      expect(error.type).toBe('file-invalid');
      expect(error.detail).toMatch(/UTF-8/u);
      expect(error.detail).toContain('CSV UTF-8');
      expect(error.detail).toContain('Excel');
      expect(error.detail).toContain('Google Sheets');
    },
  );

  it.each(['', '\n\r\n', '\uFEFF'])(
    'B2#3: rejects a file with no header: %j',
    (csv) => {
      const error = uploadError(Buffer.from(csv));
      expect(error.type).toBe('file-invalid');
      expect(error.detail).toMatch(/header/iu);
    },
  );

  it.each([
    { csv: 'headword,cefr\ncat,A1\n', missing: 'pos' },
    { csv: 'pos,cefr\nnoun,A1\n', missing: 'headword' },
    { csv: 'headword,headword\ncat,cat\n', missing: 'pos' },
    { csv: 'pos,pos\nnoun,noun\n', missing: 'headword' },
  ])(
    'B2#3: rejects missing $missing before checking duplicates',
    ({ csv, missing }) => {
      const error = uploadError(Buffer.from(csv));
      expect(error.type).toBe('file-invalid');
      expect(error.detail).toContain(missing);
      if (missing === 'headword') expect(error.detail).toContain('lemma');
      expect(error.detail).toMatch(/missing/iu);
    },
  );

  it.each(['headword,pos, POS \ncat,noun,noun\n', 'headword,pos, HeadWord \n'])(
    'B2#3: rejects normalized duplicate headers before empty-data and row-limit checks: %j',
    (csv) => {
      const error = uploadError(Buffer.from(csv), { ...limits, maxRows: 0 });
      expect(error.type).toBe('file-invalid');
      expect(error.detail).toMatch(/duplicate/iu);
      expect(error.detail).toContain(
        csv.includes('HeadWord') ? 'headword' : 'pos',
      );
    },
  );

  it('B2#3: rejects a header-only file before applying the data-row limit', () => {
    const error = uploadError(Buffer.from('headword,pos\r\n\r\n'), {
      ...limits,
      maxRows: 0,
    });
    expect(error.type).toBe('file-invalid');
    expect(error.detail).toMatch(/no data rows|0 data rows|zero data rows/iu);
  });

  it.each([',', ';', '\t'] as const)(
    'B2#6: detects %j from the header only',
    (delimiter) => {
      const parsed = parseUploadFile(
        Buffer.from(
          [
            ['headword', 'pos', 'notes'].join(delimiter),
            ['cat', 'noun', '"other separators: , ;\t"'].join(delimiter),
          ].join('\r\n'),
        ),
        limits,
      );
      expect(parsed.delimiter).toBe(delimiter);
      expect(parsed.rows[0].cells).toEqual([
        'cat',
        'noun',
        'other separators: , ;\t',
      ]);
    },
  );

  it.each([',', ';', '\t'] as const)(
    'B2#6: excludes delimiters inside quoted header cells when detecting %j',
    (delimiter) => {
      const parsed = parseUploadFile(
        Buffer.from(
          [
            ['headword', 'pos', '"notes,;\twith ""quotes"""'].join(delimiter),
            ['cat', 'noun', 'note'].join(delimiter),
          ].join('\n'),
        ),
        limits,
      );
      expect(parsed.delimiter).toBe(delimiter);
      expect(parsed.rawHeaders).toEqual([
        'headword',
        'pos',
        'notes,;\twith "quotes"',
      ]);
    },
  );

  it.each([
    { header: 'headword,pos;cefr', names: ['comma', 'semicolon'] },
    { header: 'headword,pos,cefr;notes', names: ['comma', 'semicolon'] },
    { header: 'headword\tpos;cefr', names: ['tab', 'semicolon'] },
    {
      header: 'headword,pos;cefr\tnotes',
      names: ['comma', 'semicolon', 'tab'],
    },
  ])(
    'B2#6: rejects every mixed unquoted delimiter header before parsing: $header',
    ({ header, names }) => {
      const error = uploadError(Buffer.from(`${header}\n"unclosed`));
      expect(error.type).toBe('file-invalid');
      expect(error.detail).toMatch(/ambiguous/iu);
      for (const name of names) expect(error.detail).toContain(name);
    },
  );

  it('B2#6: uses comma when no separator is found, then reports the missing required column', () => {
    const error = uploadError(Buffer.from('headword\ncat\n'));
    expect(error.type).toBe('file-invalid');
    expect(error.detail).toMatch(/missing.*pos/iu);
  });

  it('B2E2: preserves commas, escaped quotes, line breaks and quoted slash headwords', () => {
    const parsed = parseUploadFile(
      Buffer.from(
        'headword,pos,definition_en\n"a.m./A.M./am/AM",adverb,"comma, quote ""yes""\nand a new line"\ncat,noun,plain\n',
      ),
      limits,
    );
    expect(parsed.rows).toEqual([
      {
        rowNumber: 2,
        cells: [
          'a.m./A.M./am/AM',
          'adverb',
          'comma, quote "yes"\nand a new line',
        ],
      },
      { rowNumber: 3, cells: ['cat', 'noun', 'plain'] },
    ]);
  });

  it('B2#3 (Review Focus 1): parses BOM + semicolon + CRLF + a multiline cell + leading apostrophe together', () => {
    const parsed = parseUploadFile(
      Buffer.from(
        '\uFEFFHeadWord;POS;CEFR;definition_en\r\n\'m;be-verb;A1;"first line\r\nsecond, line"\r\ncat;noun;A1;plain\r\n',
      ),
      limits,
    );
    expect(parsed).toEqual({
      delimiter: ';',
      rawHeaders: ['HeadWord', 'POS', 'CEFR', 'definition_en'],
      headers: ['headword', 'pos', 'cefr', 'definition_en'],
      rows: [
        {
          rowNumber: 2,
          cells: ["'m", 'be-verb', 'A1', 'first line\r\nsecond, line'],
        },
        { rowNumber: 3, cells: ['cat', 'noun', 'A1', 'plain'] },
      ],
    });
  });

  it('B2#3: skips empty lines and assigns record numbers rather than physical line numbers', () => {
    expect(
      parseUploadFile(
        Buffer.from('headword,pos\n\ncat,noun\n\ndog,noun\n'),
        limits,
      ).rows,
    ).toEqual([
      { rowNumber: 2, cells: ['cat', 'noun'] },
      { rowNumber: 3, cells: ['dog', 'noun'] },
    ]);
  });

  it.each([',', ';'] as const)(
    'B2#3: translates too few and too many cells with %j into file-invalid',
    (delimiter) => {
      for (const cells of [['cat'], ['cat', 'noun', 'A1']]) {
        const error = uploadError(
          Buffer.from(`headword${delimiter}pos\n${cells.join(delimiter)}\n`),
        );
        expect(error.type).toBe('file-invalid');
        expect(error.detail).toContain('CSV_RECORD_INCONSISTENT_COLUMNS');
        expect(error.detail).toContain(
          `Invalid Record Length: columns length is 2, got ${cells.length} on line 2`,
        );
      }
    },
  );

  it('B2#3: parses the whole file before rejecting missing or duplicate headers and excess rows', () => {
    const error = uploadError(Buffer.from('cefr,cefr\nA1\n'), {
      ...limits,
      maxRows: 0,
    });
    expect(error.type).toBe('file-invalid');
    expect(error.detail).toContain('CSV_RECORD_INCONSISTENT_COLUMNS');
  });

  it.each([',', ';'] as const)(
    'B2#3: translates an unclosed quote with %j into file-invalid',
    (delimiter) => {
      const error = uploadError(
        Buffer.from(`headword${delimiter}pos\n"cat${delimiter}noun\n`),
      );
      expect(error.type).toBe('file-invalid');
      expect(error.detail).toContain('CSV_QUOTE_NOT_CLOSED');
      expect(error.detail).toContain('Quote Not Closed');
    },
  );

  it('B2#3: translates other parser errors and preserves the library message', () => {
    const error = uploadError(Buffer.from('headword,pos\n"cat"x,noun\n'));
    expect(error.type).toBe('file-invalid');
    expect(error.detail).toContain('CSV_INVALID_CLOSING_QUOTE');
    expect(error.detail).toContain('Invalid Closing Quote');
  });

  it('B2#70: reads the real CEFR-J 1.5 file with its exact headers and 7,799 data rows', () => {
    const parsed = parseUploadFile(
      readFileSync(
        new URL('cefrj-vocabulary-profile-1.5.csv', evidenceDirectory),
      ),
      limits,
    );
    expect(parsed.delimiter).toBe(',');
    expect(parsed.rawHeaders).toEqual([
      'headword',
      'pos',
      'CEFR',
      'CoreInventory 1',
      'CoreInventory 2',
      'Threshold',
    ]);
    expect(parsed.headers).toEqual([
      'headword',
      'pos',
      'cefr',
      'coreinventory 1',
      'coreinventory 2',
      'threshold',
    ]);
    expect(parsed.rows).toHaveLength(7799);
    expect(parsed.rows.map((row) => row.rowNumber)).toEqual(
      Array.from({ length: 7799 }, (_, i) => i + 2),
    );
    expect(parsed.rows[0].cells).toEqual(['a', 'determiner', 'A1', '', '', '']);
    expect(parsed.rows[1].cells).toEqual([
      'a.m./A.M./am/AM',
      'adverb',
      'A1',
      '',
      '',
      '',
    ]);
  });

  it('B2#70/B2#11: reads the real Octanove 1.0 file with 2,136 rows and the exact batter record 606', () => {
    const parsed = parseUploadFile(
      readFileSync(
        new URL('octanove-vocabulary-profile-c1c2-1.0.csv', evidenceDirectory),
      ),
      limits,
    );
    expect(parsed.delimiter).toBe(',');
    expect(parsed.rawHeaders).toEqual(['headword', 'pos', 'CEFR', 'notes']);
    expect(parsed.headers).toEqual(['headword', 'pos', 'cefr', 'notes']);
    expect(parsed.rows).toHaveLength(2136);
    expect(parsed.rows.map((row) => row.rowNumber)).toEqual(
      Array.from({ length: 2136 }, (_, i) => i + 2),
    );
    expect(parsed.rows[0].cells).toEqual(['exterior', 'noun', 'C1', '']);
    expect(parsed.rows.find((row) => row.rowNumber === 606)).toEqual({
      rowNumber: 606,
      cells: ['batter', '', 'C1', 'one who bats'],
    });
    expect(parsed.rows.find((row) => row.rowNumber === 2129)).toEqual({
      rowNumber: 2129,
      cells: ['remonstrate', 'vern', 'C2', ''],
    });
  });
});
