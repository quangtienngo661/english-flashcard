import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import { INFLECTION_KINDS, type InflectionKind } from '../content.constants.js';
import { visibleSenseCondition } from '../learner/visible-senses.js';
import { senseMeaning, type WordSense } from '../words/words.service.js';

type NativeLanguage = 'vi' | 'en';

/** Meanings of every visible sense, by lower-cased lemma (the distractor filter's second look, T6). */
export type LemmaMeanings = Map<string, Array<{ gloss_vi: string | null; definition_en: string | null }>>;

/** What the distractor filter and a true/false pair need of a sense (Bước 4 design 7.3). */
export type CandidateSense = {
  sense_id: string; entry_id: string; scope: 'catalog' | 'private'; lemma: string; meaning: WordSense['meaning'];
  gloss_vi: string | null; definition_en: string | null; form_of_entry_id: string | null; function_word: boolean;
};
/**
 * A sense as one practice question needs it: `variants` are every spelling (to find the word in a sentence), `accepted` the
 * spellings and accepted forms grading takes besides the lemma.
 */
export type PracticeSense = CandidateSense & {
  context_label: string | null; examples: string[]; variants: string[]; accepted: string[];
  inflections: Array<{ form: string; kind: InflectionKind }>;
};

type CandidateRow = Omit<CandidateSense, 'meaning'>;
type SenseRow = CandidateRow & {
  context_label: string | null; examples: string[]; variants: Array<{ text: string; accepted: boolean }>; accepted_forms: string[];
  inflections: Array<{ form: string; kind: InflectionKind }>;
};

const columns = Prisma.sql`s.id::text AS sense_id, e.id::text AS entry_id, e.scope, e.lemma, gloss.text AS gloss_vi,
  definition.text AS definition_en, r.form_of_entry_id::text AS form_of_entry_id,
  COALESCE(e.function_word_override, e.function_word_derived) AS function_word`;
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
  };
}

/** Candidates for distractors and true/false pairs: visible senses only, one statement, no per-sense lists. */
export async function practiceCandidates(prisma: Prisma.TransactionClient | PrismaClient, viewerId: string, senseIds: string[], nativeLanguage: NativeLanguage):
  Promise<Map<string, CandidateSense>> {
  if (senseIds.length === 0) return new Map();
  const rows = await prisma.$queryRaw<CandidateRow[]>`SELECT ${columns} FROM ${from} WHERE ${where(viewerId, senseIds)}`;
  return new Map(rows.map((row) => [row.sense_id, candidate(row, nativeLanguage)]));
}

/** Everything one question needs: visible senses only, one statement. */
export async function practiceSenses(prisma: Prisma.TransactionClient | PrismaClient, viewerId: string, senseIds: string[], nativeLanguage: NativeLanguage):
  Promise<Map<string, PracticeSense>> {
  if (senseIds.length === 0) return new Map();
  const rows = await prisma.$queryRaw<SenseRow[]>`
    SELECT ${columns}, s.context_label, r.examples, r.accepted_forms,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('text', v.text, 'accepted', v.accepted_as_answer) ORDER BY v.text COLLATE "C")
        FROM entry_variants v WHERE v.entry_id = e.id), '[]'::jsonb) AS variants,
      COALESCE((SELECT jsonb_agg(jsonb_build_object('form', i.form, 'kind', i.kind)
        ORDER BY array_position(${INFLECTION_KINDS as unknown as string[]}::text[], i.kind), i.position, i.form COLLATE "C")
        FROM entry_inflections i WHERE i.entry_id = e.id), '[]'::jsonb) AS inflections
    FROM ${from} WHERE ${where(viewerId, senseIds)}`;
  return new Map(rows.map((row) => [row.sense_id, {
    ...candidate(row, nativeLanguage),
    // Private labels (p2, p3, …) only keep the live-sense index unique; they are never shown (as cardContent).
    context_label: row.scope === 'private' ? null : row.context_label,
    examples: row.examples,
    variants: row.variants.map(({ text }) => text),
    accepted: [...new Set([...row.variants.filter(({ accepted }) => accepted).map(({ text }) => text), ...row.accepted_forms])]
      .filter((text) => text !== row.lemma),
    inflections: row.inflections,
  }]));
}

/** Every sense the viewer can see for these lemmas (case-insensitive), by lower-cased lemma: one statement bounded by `lemmas`. */
export async function practiceLemmaMeanings(prisma: Prisma.TransactionClient | PrismaClient, viewerId: string, lemmas: string[]):
  Promise<LemmaMeanings> {
  const keys = [...new Set(lemmas.map((lemma) => lemma.toLowerCase()))];
  if (keys.length === 0) return new Map();
  const rows = await prisma.$queryRaw<Array<{ lemma: string; gloss_vi: string | null; definition_en: string | null }>>`
    SELECT lower(e.lemma) AS lemma, gloss.text AS gloss_vi, definition.text AS definition_en FROM ${from}
    WHERE lower(e.lemma) = ANY(${keys}::text[]) AND ${visibleSenseCondition(Prisma.sql`s.id`, viewerId)}`;
  const result: LemmaMeanings = new Map();
  for (const { lemma, ...meaning } of rows) result.set(lemma, [...(result.get(lemma) ?? []), meaning]);
  return result;
}
