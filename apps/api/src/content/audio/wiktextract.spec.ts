import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { normalizeRow } from '../../content-pipeline/upload/row-normalizer.js';
import { buildIpaRows, pickIpa, wiktionaryPos, type CatalogSense, type WiktextractEntry } from './wiktextract.js';

// The fixture is real Wiktextract data (kaikki.org, read 07/11/2026) for lead, record, read, live and luggage, cut down to the fields the
// reader uses, plus a German line that must be ignored.
const FIXTURE = readFileSync(new URL('../../../scripts/fixtures/wiktextract-sample.jsonl', import.meta.url), 'utf8');
const entries = FIXTURE.split('\n').filter(Boolean).map((line) => JSON.parse(line) as WiktextractEntry);
const entry = (word: string, pos: string, etymology?: number) =>
  entries.find((e) => e.lang_code === 'en' && e.word === word && e.pos === pos && (etymology === undefined || String(e.etymology_number) === String(etymology)))!;
const SOURCE = '00000000-0000-4000-8000-0000000000bb';

describe('pickIpa on real Wiktextract entries (round C, design §5.6)', () => {
  it('the fixture holds what the plan assumed: sounds[].ipa with tags, one entry per etymology and part of speech', () => {
    expect(entry('lead', 'noun', 1).sounds?.[0]).toEqual({ ipa: '/lɛd/' });
    expect(entry('luggage', 'noun').sounds?.[0].tags).toEqual(['General-American', 'Received-Pronunciation']);
    expect(entries.filter((e) => e.word === 'lead' && e.lang_code === 'en')).toHaveLength(6);
  });

  it('no tag → the same transcription for UK and US; narrow [ ] ones and regional ones are not taken', () => {
    expect(pickIpa(entry('lead', 'noun', 1))).toEqual({ uk: 'lɛd', us: 'lɛd' }); // /led/ is Australia / New Zealand only
    expect(pickIpa(entry('lead', 'verb', 2))).toEqual({ uk: 'ˈliːd', us: 'ˈliːd' }); // [ˈlɪi̯d] is narrow
    expect(pickIpa(entry('live', 'verb'))).toEqual({ uk: 'ˈlɪv', us: 'ˈlɪv' });
  });

  it('Received-Pronunciation is UK and General-American is US, the first one when there are several', () => {
    expect(pickIpa(entry('record', 'noun'))).toEqual({ uk: 'ˈɹɛk.ɔːd', us: 'ˈɹɛk.ɚd' });
  });

  it('one transcription tagged for both, and a bare "UK" tag next to regions', () => {
    expect(pickIpa(entry('luggage', 'noun'))).toEqual({ uk: 'ˈlʌɡɪd͡ʒ', us: 'ˈlʌɡɪd͡ʒ' });
    expect(pickIpa(entry('read', 'verb', 1))).toEqual({ uk: 'ɹiːd', us: 'ɹid' });
  });

  it('a pronunciation that is only fragments (/ɹə-/) is skipped, and a tag for both RP and General-American serves both', () => {
    expect(pickIpa(entry('record', 'verb'))).toEqual({ uk: 'ɹɪˈkɔːd', us: 'ɹɪˈkɔɹd' });
    expect(pickIpa(entry('read', 'verb', 2))).toEqual({ uk: 'ɹɛd', us: 'ɹɛd' });
  });

  it('regional-only tags give nothing, an entry without sounds gives nulls', () => {
    expect(pickIpa(entry('live', 'adj'))).toEqual({ uk: 'ˈlaɪ̯v', us: 'ˈlaɪ̯v' }); // the untagged one; /ˈlaːv/ is South African / Southern US
    expect(pickIpa(entry('lead', 'verb', 3))).toEqual({ uk: null, us: null });
    expect(pickIpa({ word: 'x', lang_code: 'en', sounds: [{ ipa: '/ˈlaːv/', tags: ['Southern-US'] }] })).toEqual({ uk: null, us: null });
  });

  it('ranking: General-American beats US beats untagged; a transcription Google-checkable character set is required', () => {
    const e: WiktextractEntry = { word: 'x', lang_code: 'en', sounds: [
      { ipa: '/a/' }, { ipa: '/b/', tags: ['US'] }, { ipa: '/c/', tags: ['General-American'] }, { ipa: '/d/', tags: ['UK'] }, { ipa: '/e/', tags: ['Received-Pronunciation'] },
    ] };
    expect(pickIpa(e)).toEqual({ uk: 'e', us: 'c' });
    expect(pickIpa({ ...e, sounds: e.sounds!.slice(0, 2) })).toEqual({ uk: 'a', us: 'b' });
    expect(pickIpa({ word: 'x', lang_code: 'en', sounds: [{ ipa: '/ab1/' }, { ipa: '/ab/' }] })).toEqual({ uk: 'ab', us: 'ab' });
  });
});

describe('wiktionaryPos', () => {
  it('maps the app part-of-speech names to Wiktionary names', () => {
    expect(wiktionaryPos('adjective')).toEqual(['adj']);
    expect(wiktionaryPos('noun')).toContain('noun');
    expect(wiktionaryPos('verb')).toEqual(['verb']);
    expect(wiktionaryPos('be-verb')).toEqual(['verb']);
    expect(wiktionaryPos('preposition')).toEqual(['prep']);
    expect(wiktionaryPos('interjection')).toEqual(['intj']);
    expect(wiktionaryPos('nonsense')).toEqual([]);
  });
});

describe('buildIpaRows', () => {
  const sense = (senseId: string, lemma: string, pos: string, revision = 1): CatalogSense => ({ senseId, lemma, pos, revision });

  it('matches by lemma and part of speech and fills one row per sense of that word', () => {
    const { rows, stats } = buildIpaRows(entries, [sense('s1', 'record', 'noun', 3), sense('s2', 'record', 'noun', 1), sense('s3', 'luggage', 'noun')]);
    expect(rows).toEqual([
      { headword: 'record', pos: 'noun', senseId: 's1', revision: 3, ipaUk: 'ˈɹɛk.ɔːd', ipaUs: 'ˈɹɛk.ɚd' },
      { headword: 'record', pos: 'noun', senseId: 's2', revision: 1, ipaUk: 'ˈɹɛk.ɔːd', ipaUs: 'ˈɹɛk.ɚd' },
      { headword: 'luggage', pos: 'noun', senseId: 's3', revision: 1, ipaUk: 'ˈlʌɡɪd͡ʒ', ipaUs: 'ˈlʌɡɪd͡ʒ' },
    ]);
    expect(stats).toMatchObject({ senses: 3, matched: 3, unmatched: 0, ambiguous: 0 });
  });

  it('a word and part of speech with different readings in Wiktionary is left out: staff choose (lead as a noun)', () => {
    const { rows, stats } = buildIpaRows(entries, [sense('s1', 'lead', 'noun')]);
    expect(rows).toEqual([]);
    expect(stats).toMatchObject({ matched: 0, ambiguous: 1 });
  });

  it('a word Wiktionary does not have, or has with another part of speech, counts as unmatched; the German line is ignored', () => {
    const { rows, stats } = buildIpaRows(entries, [sense('s1', 'zzyzx', 'noun'), sense('s2', 'luggage', 'verb')]);
    expect(rows).toEqual([]);
    expect(stats).toMatchObject({ senses: 2, unmatched: 2 });
  });

  it('the two readings are judged apart: UK agrees and US differs gives only the UK', () => {
    const two: WiktextractEntry[] = [
      { word: 'tomato', lang_code: 'en', pos: 'noun', etymology_number: 1, sounds: [{ ipa: '/təˈmɑːtəʊ/', tags: ['UK'] }, { ipa: '/təˈmeɪtoʊ/', tags: ['US'] }] },
      { word: 'tomato', lang_code: 'en', pos: 'noun', etymology_number: 2, sounds: [{ ipa: '/təˈmɑːtəʊ/', tags: ['UK'] }, { ipa: '/təˈmɑːtoʊ/', tags: ['US'] }] },
    ];
    expect(buildIpaRows(two, [sense('s1', 'tomato', 'noun')]).rows).toEqual([
      { headword: 'tomato', pos: 'noun', senseId: 's1', revision: 1, ipaUk: 'təˈmɑːtəʊ', ipaUs: null },
    ]);
  });

  it('entries of other languages are never read', () => {
    const foreign: WiktextractEntry[] = [{ word: 'lead', lang_code: 'de', pos: 'noun', sounds: [{ ipa: '/leːt/' }] }];
    expect(buildIpaRows(foreign, [sense('s1', 'lead', 'noun')]).stats.unmatched).toBe(1);
  });

  it('every row is something the CSV import accepts, and says exactly the transcription and its source', () => {
    const { rows } = buildIpaRows(entries, [sense('00000000-0000-4000-8000-0000000000e1', 'record', 'noun', 3)]);
    const csv = rows[0];
    const result = normalizeRow(2, {
      headword: csv.headword, pos: csv.pos, sense_id: csv.senseId, revision: String(csv.revision),
      ipa_uk: csv.ipaUk ?? '', ipa_us: csv.ipaUs ?? '', ipa_source_id: SOURCE,
    }, { hasLevelColumn: false });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.row.content).toEqual({ ipaUk: 'ˈɹɛk.ɔːd', ipaUs: 'ˈɹɛk.ɚd', ipaSourceId: SOURCE });
  });
});
