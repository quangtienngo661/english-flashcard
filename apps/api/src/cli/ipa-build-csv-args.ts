// `pnpm ipa:build-csv --in <raw-wiktextract.jsonl[.gz]> --out <file.csv> --source-id <uuid>` (round C, design §5.6). Kept apart from the
// entry file, which runs on import.

export const IPA_BUILD_USAGE = 'usage: pnpm ipa:build-csv --in <raw-wiktextract.jsonl.gz> --out <file.csv> --source-id <data source uuid>';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type IpaBuildArgs = { input: string; output: string; sourceId: string };

export function parseIpaBuildArgs(argv: string[]): { ok: true; args: IpaBuildArgs } | { ok: false; error: string } {
  const values = new Map<string, string>();
  for (let at = 0; at < argv.length; at += 2) {
    const name = argv[at];
    const value = argv[at + 1];
    if (!['--in', '--out', '--source-id'].includes(name)) return { ok: false, error: `unknown argument ${name}` };
    if (value === undefined || value.startsWith('--')) return { ok: false, error: `${name} needs a value` };
    if (values.has(name)) return { ok: false, error: `${name} is given twice` };
    values.set(name, value);
  }
  for (const name of ['--in', '--out', '--source-id']) {
    if (!values.has(name)) return { ok: false, error: `${name} is required` };
  }
  const sourceId = values.get('--source-id')!;
  if (!UUID.test(sourceId)) return { ok: false, error: '--source-id must be the uuid of a data source' };
  return { ok: true, args: { input: values.get('--in')!, output: values.get('--out')!, sourceId: sourceId.toLowerCase() } };
}
