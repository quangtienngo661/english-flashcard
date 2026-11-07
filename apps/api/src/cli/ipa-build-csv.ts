import { createReadStream, existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { createGunzip } from 'node:zlib';
import { PrismaPg } from '@prisma/adapter-pg';
import { csvRow } from '../content-pipeline/upload/csv-writer.js';
import { buildIpaRows, wantedKeys, type CatalogSense, type WiktextractEntry } from '../content/audio/wiktextract.js';
import { PrismaClient } from '../generated/prisma/client.js';
import { IPA_BUILD_USAGE, parseIpaBuildArgs } from './ipa-build-csv-args.js';

// `pnpm ipa:build-csv --in <raw.jsonl.gz> --out <file.csv> --source-id <uuid>` (round C, design §5.6): reads the raw Wiktextract dump
// (kaikki.org; one JSON per line, mostly other languages) and writes a CSV of UK and US transcriptions for the catalog senses on show, in the
// columns the content import takes. It reads the database and writes only the CSV; staff import it, then publish. Exit 2 on bad arguments.
const HEADERS = ['headword', 'pos', 'sense_id', 'revision', 'ipa_uk', 'ipa_us', 'ipa_source_id'];
const ENGLISH = /"lang_code":\s*"en"/u;

async function main(): Promise<void> {
  const parsed = parseIpaBuildArgs(process.argv.slice(2));
  if (!parsed.ok) {
    console.error(`${parsed.error}\n${IPA_BUILD_USAGE}`);
    process.exitCode = 2;
    return;
  }
  const { input, output, sourceId } = parsed.args;
  if (existsSync('.env')) process.loadEnvFile('.env');
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set');
    process.exitCode = 1;
    return;
  }
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 2 }) });
  try {
    // The latest revision number of each catalog sense on show: a CSV row must name it, or the import refuses the row as stale.
    const rows = await prisma.$queryRaw<Array<{ sense_id: string; revision: number; lemma: string; pos: string }>>`
      SELECT s.id::text AS sense_id, (SELECT max(r.revision_no) FROM sense_revisions r WHERE r.sense_id = s.id)::int AS revision, e.lemma, e.pos
      FROM senses s JOIN entries e ON e.id = s.entry_id
      WHERE s.state = 'open' AND s.live_revision_id IS NOT NULL AND e.scope = 'catalog' AND e.language = 'en'
      ORDER BY e.lemma, e.pos, s.id`;
    const senses: CatalogSense[] = rows.map((row) => ({ senseId: row.sense_id, lemma: row.lemma, pos: row.pos, revision: row.revision }));
    const wanted = wantedKeys(senses);
    console.log(`${senses.length} catalog senses on show; reading ${input} ...`);

    const entries: WiktextractEntry[] = [];
    const source = input.endsWith('.gz') ? createReadStream(input).pipe(createGunzip()) : createReadStream(input);
    let read = 0;
    for await (const line of createInterface({ input: source, crlfDelay: Infinity })) {
      read++;
      if (!ENGLISH.test(line)) continue;
      const entry = JSON.parse(line) as WiktextractEntry;
      // Keep only what a catalog word can use, so the dump (millions of lines) never sits in memory.
      if (entry.lang_code === 'en' && entry.pos && wanted.has(`${entry.word}\0${entry.pos}`)) {
        entries.push({ word: entry.word, lang_code: entry.lang_code, pos: entry.pos, sounds: entry.sounds });
      }
    }
    const { rows: csv, stats } = buildIpaRows(entries, senses);
    const body = [HEADERS, ...csv.map((row) => [
      row.headword, row.pos, row.senseId, String(row.revision), row.ipaUk ?? '', row.ipaUs ?? '', sourceId,
    ])].map(csvRow).join('');
    await writeFile(output, `﻿${body}`);
    console.log(`${read} lines read; ${entries.length} entries used.`);
    console.log(`senses: ${stats.senses}; with a transcription: ${stats.matched}; not in Wiktionary: ${stats.unmatched}; readings disagree: ${stats.ambiguous}.`);
    console.log(`wrote ${csv.length} rows to ${output}`);
  } catch (error) {
    console.error(`ipa:build-csv failed: ${error instanceof Error ? error.message : 'unknown error'}`);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

await main();
