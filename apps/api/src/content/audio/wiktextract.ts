import { checkIpa, normalizeIpa } from '../senses/ipa.js';

/** The fields of a Wiktextract line (kaikki.org JSON) that the reader uses. */
export type WiktextractEntry = {
  word: string; lang_code: string; pos?: string; etymology_number?: number | string;
  sounds?: Array<{ ipa?: string; tags?: string[] }>;
};
export type PickedIpa = { uk: string | null; us: string | null };

// Wiktionary tags a transcription with the accent it belongs to. The rank is how well a tag fits the voice: 0 the standard accent, 1 the
// country, 2 no tag (it serves both). A transcription tagged only for another region (Australia, Wales, Southern-US, …) is not taken.
const UK_TAGS: Array<[string, number]> = [['Received-Pronunciation', 0], ['UK', 1]];
const US_TAGS: Array<[string, number]> = [['General-American', 0], ['US', 1]];

/** `/…/` only: a `[…]` transcription is narrow (phonetic) and has symbols the voices do not use. */
const SLASHED = /^\/[^/]+\/$/u;

function rankFor(tags: string[] | undefined, accent: Array<[string, number]>): number | null {
  if (!tags || tags.length === 0) return 2;
  const ranks = accent.filter(([tag]) => tags.includes(tag)).map(([, rank]) => rank);
  return ranks.length > 0 ? Math.min(...ranks) : null;
}

/**
 * The UK and US transcription of one Wiktextract entry (without slashes): per voice the best-ranked `/…/` transcription made only of
 * characters `checkIpa` takes, the first in file order among equals. A voice with none gets null.
 */
export function pickIpa(entry: WiktextractEntry): PickedIpa {
  const best = (accent: Array<[string, number]>): string | null => {
    let found: { ipa: string; rank: number } | null = null;
    for (const sound of entry.sounds ?? []) {
      if (!sound.ipa || !SLASHED.test(sound.ipa.trim())) continue;
      const ipa = normalizeIpa(sound.ipa);
      if (!ipa || !checkIpa(ipa).ok) continue;
      const rank = rankFor(sound.tags, accent);
      if (rank !== null && (found === null || rank < found.rank)) found = { ipa, rank };
    }
    return found?.ipa ?? null;
  };
  return { uk: best(UK_TAGS), us: best(US_TAGS) };
}

const WIKTIONARY_POS: Record<string, string[]> = {
  noun: ['noun', 'name'], verb: ['verb'], adjective: ['adj'], adverb: ['adv'], pronoun: ['pron'], preposition: ['prep'],
  determiner: ['det'], conjunction: ['conj'], number: ['num'], 'modal auxiliary': ['verb'], 'be-verb': ['verb'], 'do-verb': ['verb'],
  'have-verb': ['verb'], 'infinitive-to': ['particle'], interjection: ['intj'],
};

/** The Wiktionary part-of-speech names an app part of speech is looked up under. */
export function wiktionaryPos(pos: string): string[] {
  return WIKTIONARY_POS[pos] ?? [];
}

/** A visible catalog sense and the revision number a CSV row must name to edit it. */
export type CatalogSense = { senseId: string; lemma: string; pos: string; revision: number };
export type IpaCsvRow = { headword: string; pos: string; senseId: string; revision: number; ipaUk: string | null; ipaUs: string | null };
export type IpaBuildStats = { senses: number; matched: number; unmatched: number; ambiguous: number };

const keyOf = (lemma: string, pos: string) => `${lemma}\0${pos}`;

/** The words the file must be read for: the set of `lemma\0wiktionary-pos` of the catalog senses. */
export function wantedKeys(senses: CatalogSense[]): Set<string> {
  return new Set(senses.flatMap((sense) => wiktionaryPos(sense.pos).map((pos) => keyOf(sense.lemma, pos))));
}

/**
 * One CSV row per catalog sense whose word and part of speech Wiktionary knows. Wiktionary has an entry per etymology and part of speech,
 * and the catalog does not say which etymology a sense is, so the entries of one word and part of speech must agree: if two give different
 * transcriptions for a voice, that voice is left empty (counted `ambiguous`) for staff to fill, never guessed. Each voice is judged alone.
 */
export function buildIpaRows(entries: Iterable<WiktextractEntry>, senses: CatalogSense[]): { rows: IpaCsvRow[]; stats: IpaBuildStats } {
  const wanted = wantedKeys(senses);
  const picked = new Map<string, PickedIpa[]>();
  for (const entry of entries) {
    if (entry.lang_code !== 'en' || !entry.pos) continue;
    const key = keyOf(entry.word, entry.pos);
    if (!wanted.has(key)) continue;
    picked.set(key, [...(picked.get(key) ?? []), pickIpa(entry)]);
  }
  const rows: IpaCsvRow[] = [];
  const stats: IpaBuildStats = { senses: senses.length, matched: 0, unmatched: 0, ambiguous: 0 };
  for (const sense of senses) {
    const found = wiktionaryPos(sense.pos).flatMap((pos) => picked.get(keyOf(sense.lemma, pos)) ?? []);
    if (found.length === 0) { stats.unmatched++; continue; }
    const voice = (key: 'uk' | 'us') => {
      const values = new Set(found.map((item) => item[key]).filter((value): value is string => value !== null));
      return values.size === 1 ? { value: [...values][0], clash: false } : { value: null, clash: values.size > 1 };
    };
    const [uk, us] = [voice('uk'), voice('us')];
    if (uk.value === null && us.value === null) {
      if (uk.clash || us.clash) stats.ambiguous++; else stats.unmatched++;
      continue;
    }
    stats.matched++;
    rows.push({ headword: sense.lemma, pos: sense.pos, senseId: sense.senseId, revision: sense.revision, ipaUk: uk.value, ipaUs: us.value });
  }
  return { rows, stats };
}
