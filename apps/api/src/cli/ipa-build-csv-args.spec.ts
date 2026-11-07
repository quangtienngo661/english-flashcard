import { describe, expect, it } from 'vitest';
import { parseIpaBuildArgs } from './ipa-build-csv-args.js';

const SOURCE = '00000000-0000-4000-8000-0000000000BB';

describe('parseIpaBuildArgs', () => {
  it('reads the three options in any order and lower-cases the uuid', () => {
    expect(parseIpaBuildArgs(['--out', 'o.csv', '--in', 'raw.jsonl.gz', '--source-id', SOURCE])).toEqual({
      ok: true, args: { input: 'raw.jsonl.gz', output: 'o.csv', sourceId: SOURCE.toLowerCase() },
    });
  });

  it('refuses a missing option, an unknown one, a repeat, a missing value and a source that is not a uuid', () => {
    expect(parseIpaBuildArgs(['--in', 'a', '--out', 'b'])).toMatchObject({ ok: false, error: expect.stringContaining('--source-id') });
    expect(parseIpaBuildArgs(['--in', 'a', '--out', 'b', '--source-id', SOURCE, '--x', 'y'])).toMatchObject({ ok: false });
    expect(parseIpaBuildArgs(['--in', 'a', '--in', 'b', '--out', 'c', '--source-id', SOURCE])).toMatchObject({ ok: false });
    expect(parseIpaBuildArgs(['--in', '--out', 'b', '--source-id', SOURCE])).toMatchObject({ ok: false });
    expect(parseIpaBuildArgs(['--in', 'a', '--out', 'b', '--source-id', 'wiktionary'])).toMatchObject({ ok: false, error: expect.stringContaining('uuid') });
    expect(parseIpaBuildArgs([])).toMatchObject({ ok: false });
  });
});
