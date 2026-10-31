import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import { INFLECTION_KINDS, PRIVATE_POS_UNSET, type InflectionKind, type Level } from '../content.constants.js';
import { visibleEntryCondition, visibleSenseCondition } from '../learner/visible-senses.js';
import { displayedLevel, senseMeaning, type WordSense } from '../words/words.service.js';
import { meaningPool } from './meaning-pool.js';

type NativeLanguage = 'vi' | 'en';

/** Meanings of every visible sense, by lower-cased lemma (the distractor filter's second look, T6). */
export type LemmaMeanings = Map<string, Array<{ gloss_vi: string | null; definition_en: string | null }>>;

/**
 * What the distractor filter and a true/false pair need of a sense (Bước 4 design 7.3). `inflections` lets Bước 7 put a
 * candidate in the same form as the answer of a sentence MCQ (design §7.5).
 */
export type CandidateSense = {
  sense_id: string; entry_id: string; scope: 'catalog' | 'private'; lemma: string; meaning: WordSense['meaning'];
  gloss_vi: string | null; definition_en: string | null; form_of_entry_id: string | null; function_word: boolean;
  inflections: Array<{ form: string; kind: InflectionKind }>;
};
/**
 * A sense as one practice question needs it: `variants` are every spelling (to find the word in a sentence), `accepted` the
 * spellings and accepted forms grading takes besides the lemma. Bước 7 (design §4): `pos` (null when a private word has none),
 * the displayed CEFR `level`, the `live_revision_id` an AI question is made from, and the `extra_forms` staff accepted for the
 * lemma (design §10).
 */
export type PracticeSense = CandidateSense & {
  context_label: string | null; examples: string[]; variants: string[]; accepted: string[];
  pos: string | null; level: Level | null; live_revision_id: string; extra_forms: string[];
};

type CandidateRow = Omit<CandidateSense, 'meaning'>;
type SenseRow = CandidateRow & {
  context_label: string | null; examples: string[]; variants: Array<{ text: string; accepted: boolean }>; accepted_forms: string[];
  pos: string; level: Level | null; live_revision_id: string; extra_forms: string[];
};

const columns = Prisma.sql`s.id::text AS sense_id, e.id::text AS entry_id, e.scope, e.lemma, gloss.text AS gloss_vi,
  definition.text AS definition_en, r.form_of_entry_id::text AS form_of_entry_id,
  COALESCE(e.function_word_override, e.function_word_derived) AS function_word,
  COALESCE((SELECT jsonb_agg(jsonb_build_object('form', i.form, 'kind', i.kind)
    ORDER BY array_position(${INFLECTION_KINDS as unknown as string[]}::text[], i.kind), i.position, i.form COLLATE "C")
    FROM entry_inflections i WHERE i.entry_id = e.id), '[]'::jsonb) AS inflections`;
const from = Prisma.sql`senses s
  JOIN entries e ON e.id = s.entry_id
  JOIN sense_revisions r ON r.id = s.live_revision_id AND r.sense_id = s.id
  LEFT JOIN sense_revision_texts gloss ON gloss.revision_id = r.id AND gloss.language = 'vi' AND gloss.kind = 'gloss'
  LEFT JOIN sense_revision_texts definition ON definition.revision_id = r.id AND definition.language = 'en' AND definition.kind = 'definition'`;
const where = (viewerId: string, senseIds: string[]) =>
  Prisma.sql`s.id = ANY(${senseIds}::uuid[]) AND ${visibleSenseCondition(Prisma.sql`s.id`, viewerId)}`;

function candidate(row: CandidateRow, nativeLanguage: NativeLanguage): CandidateSense {
  return {
    sense_id: row.sense_id, entry_id: row.entry_id, scope: row.scope, lemma: row.lemma,
    meaning: senseMeaning(row.gloss_vi, row.definition_en, nativeLanguage), gloss_vi: row.gloss_vi,
    definition_en: row.definition_en, form_of_entry_id: row.form_of_entry_id, function_word: row.function_word,
    inflections: row.inflections,
  };
}

/** Candidates for distractors and true/false pairs: visible senses only, one statement, no per-sense lists. */
export async function practiceCandidates(prisma: Prisma.TransactionClient | PrismaClient, viewerId: string, senseIds: string[], nativeLanguage: NativeLanguage):
  Promise<Map<string, CandidateSense>> {
  if (senseIds.length === 0) return new Map();
  const rows = await prisma.$queryRaw<CandidateRow[]>`SELECT ${columns} FROM ${from} WHERE ${where(viewerId, senseIds)}`;
  return new Map(rows.map((row) => [row.sense_id, candidate(row, nativeLanguage)]));
}

/** The full select of a practice sense (columns, joins, displayed level); the caller adds WHERE and ORDER BY. */
const senseSelect = Prisma.sql`SELECT ${columns}, s.context_label, r.examples, r.accepted_forms, e.pos, displayed.level,
      s.live_revision_id::text AS live_revision_id,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('text', v.text, 'accepted', v.accepted_as_answer) ORDER BY v.text COLLATE "C")
        FROM entry_variants v WHERE v.entry_id = e.id), '[]'::jsonb) AS variants,
      COALESCE((SELECT array_agg(w.form ORDER BY w.form COLLATE "C")
        FROM word_form_additions w WHERE w.lemma_key = lower(e.lemma)), '{}'::text[]) AS extra_forms
    FROM ${from} LEFT JOIN LATERAL (${displayedLevel}) displayed ON true`;

function practiceSense(row: SenseRow, nativeLanguage: NativeLanguage): PracticeSense {
  return {
    ...candidate(row, nativeLanguage),
    // Private labels (p2, p3, …) only keep the live-sense index unique; they are never shown (as cardContent).
    context_label: row.scope === 'private' ? null : row.context_label,
    examples: row.examples,
    variants: row.variants.map(({ text }) => text),
    accepted: [...new Set([...row.variants.filter(({ accepted }) => accepted).map(({ text }) => text), ...row.accepted_forms])]
      .filter((text) => text !== row.lemma),
    pos: row.pos === PRIVATE_POS_UNSET ? null : row.pos,
    level: row.level,
    live_revision_id: row.live_revision_id,
    extra_forms: row.extra_forms,
  };
}

/** Everything one question needs: visible senses only, one statement. */
export async function practiceSenses(prisma: Prisma.TransactionClient | PrismaClient, viewerId: string, senseIds: string[], nativeLanguage: NativeLanguage):
  Promise<Map<string, PracticeSense>> {
  if (senseIds.length === 0) return new Map();
  const rows = await prisma.$queryRaw<SenseRow[]>`${senseSelect} WHERE ${where(viewerId, senseIds)}`;
  return new Map(rows.map((row) => [row.sense_id, practiceSense(row, nativeLanguage)]));
}

/**
 * The open catalog senses of a lemma, for eval rules (nhóm B design §5.2): no viewer, so no private entry. The lemma is trimmed and
 * compared in lower case (`entries_catalog_lower_lemma_idx`); `pos` null takes every part of speech.
 */
export async function catalogPracticeSensesByLemma(prisma: Prisma.TransactionClient | PrismaClient, lemma: string, pos: string | null,
  nativeLanguage: NativeLanguage): Promise<PracticeSense[]> {
  const key = lemma.trim();
  if (!key) return [];
  const rows = await prisma.$queryRaw<SenseRow[]>`${senseSelect}
    WHERE e.scope = 'catalog' AND lower(e.lemma) = lower(${key}) ${pos === null ? Prisma.empty : Prisma.sql`AND e.pos = ${pos}`}
      AND s.state = 'open' AND s.live_revision_id IS NOT NULL
    ORDER BY e.pos, s.created_at, s.id`;
  return rows.map((row) => practiceSense(row, nativeLanguage));
}

/** The other senses of the same entry the viewer can see (wrong meanings of design §7.4, D17 step 1): one statement. */
export async function practiceOtherSenses(prisma: Prisma.TransactionClient | PrismaClient, viewerId: string, senseId: string,
  nativeLanguage: NativeLanguage): Promise<CandidateSense[]> {
  const rows = await prisma.$queryRaw<CandidateRow[]>`
    SELECT ${columns} FROM ${from}
    WHERE s.entry_id = (SELECT o.entry_id FROM senses o WHERE o.id = ${senseId}::uuid) AND s.id <> ${senseId}::uuid
      AND ${visibleSenseCondition(Prisma.sql`s.id`, viewerId)}
    ORDER BY s.created_at, s.id`;
  return rows.map((row) => candidate(row, nativeLanguage));
}

/**
 * Up to `count` random published catalog senses with a Vietnamese gloss whose lemma is not in `excludeLemmas`, one per lemma
 * (wrong meanings of design §7.4, D17 step 3). Reads `count × 4` random rows, then filters them (`meaningPool`).
 */
export async function practiceRandomMeanings(prisma: Prisma.TransactionClient | PrismaClient, viewerId: string,
  excludeLemmas: string[], count: number, nativeLanguage: NativeLanguage): Promise<CandidateSense[]> {
  if (count <= 0) return [];
  const rows = await prisma.$queryRaw<CandidateRow[]>`
    SELECT ${columns} FROM ${from}
    WHERE e.scope = 'catalog' AND s.state = 'open' AND s.live_revision_id IS NOT NULL AND gloss.text IS NOT NULL
      AND ${visibleEntryCondition(Prisma.sql`e`, viewerId)}
    ORDER BY random() LIMIT ${count * 4}`;
  return meaningPool(rows.map((row) => candidate(row, nativeLanguage)), excludeLemmas, count);
}

/**
 * Every sense the viewer can see for these lemmas (case-insensitive), by lower-cased lemma: one statement bounded by `lemmas`.
 * Visibility is written on the rows (as in words.service) so the lemma predicate can reach the partial lemma indexes.
 */
export async function practiceLemmaMeanings(prisma: Prisma.TransactionClient | PrismaClient, viewerId: string, lemmas: string[]):
  Promise<LemmaMeanings> {
  const keys = [...new Set(lemmas.map((lemma) => lemma.toLowerCase()))];
  if (keys.length === 0) return new Map();
  const rows = await prisma.$queryRaw<Array<{ lemma: string; gloss_vi: string | null; definition_en: string | null }>>`
    SELECT lower(e.lemma) AS lemma, gloss.text AS gloss_vi, definition.text AS definition_en FROM ${from}
    WHERE lower(e.lemma) = ANY(${keys}::text[]) AND s.state = 'open' AND s.live_revision_id IS NOT NULL
      AND ${visibleEntryCondition(Prisma.sql`e`, viewerId)}`;
  const result: LemmaMeanings = new Map();
  for (const { lemma, ...meaning } of rows) result.set(lemma, [...(result.get(lemma) ?? []), meaning]);
  return result;
}
