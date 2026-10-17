import { Inject, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { decodeBoundToken, encodeBoundToken } from '../../common/pagination/page-token.util.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import { INFLECTION_KINDS, LEVELS, PRIVATE_POS_UNSET, VALID_POS, type InflectionKind, type Level } from '../content.constants.js';
import { InflectionsService } from '../inflections/inflections.service.js';

type NativeLanguage = 'vi' | 'en';
export type WordSense = {
  sense_id: string; entry_id: string; scope: 'catalog' | 'private'; lemma: string; pos: string; level: Level | null;
  context_label: string | null; meaning: { text: string; language: NativeLanguage; translation_missing: boolean };
  definition_en: string | null; examples: string[]; topics: Array<{ code: string; name: string }>;
  form_of: { entry_id: string; lemma: string; pos: string; kind: InflectionKind } | null;
};
export type WordListQuery = {
  page_size: number; page_token?: string; q?: string; level?: Level; topic?: string; pos?: string; mine?: boolean;
};
export type WordRow = { lemma: string; pos_list: string[]; level: Level | null; meaning_preview: string; has_private: boolean };
type SenseRow = Omit<WordSense, 'meaning' | 'form_of'> & {
  gloss_vi: string | null; form_of_entry_id: string | null; form_kind: InflectionKind | null;
  form_lemma: string | null; form_pos: string | null;
};
const posOrder = [...VALID_POS, PRIVATE_POS_UNSET];
const posRank = (pos: string) => posOrder.indexOf(pos as (typeof posOrder)[number]);
const cursorSchema = z.strictObject({
  rank: z.number().int().min(0).max(2),
  lemma: z.string().refine((value) => !value.includes('\0') && [...value].length >= 1 && [...value].length <= 100),
});
const invalid = () => new ProblemDetailsException({ status: 400, title: 'Validation failed', type: 'validation-failed' });

/** The displayed level of entry e: newest editorial/user choice, then source priority (derived rows have no rival). */
const displayedLevel = Prisma.sql`
  SELECT el.level FROM entry_levels el JOIN data_sources ds ON ds.id = el.source_id
  WHERE el.entry_id = e.id
  ORDER BY (el.basis IN ('editorial', 'user')) DESC,
    CASE WHEN el.basis IN ('editorial', 'user') THEN el.created_at END DESC,
    CASE WHEN el.basis IN ('editorial', 'user') THEN el.id END ASC,
    ds.display_priority ASC, ds.id ASC,
    array_position(ARRAY['A1', 'A2', 'B1', 'B2', 'C1', 'C2']::text[], el.level) ASC
  LIMIT 1`;

/** Catalog senses that are published and open, plus the viewer's own private senses (S6, B3#12). */
function visible(viewerId: string): Prisma.Sql {
  return Prisma.sql`e.language = 'en' AND e.entry_type = 'word' AND (
    (e.scope = 'catalog' AND s.state = 'open')
    OR (e.scope = 'private' AND e.owner_user_id = ${viewerId}::uuid AND s.state <> 'retired'))`;
}

function view(row: SenseRow, nativeLanguage: NativeLanguage): WordSense {
  // Bước 2 meaning rule: the native gloss, else the English definition, else the gloss marked untranslated.
  const nativeGloss = nativeLanguage === 'vi' && row.gloss_vi !== null;
  const useEnglish = !nativeGloss && row.definition_en !== null;
  return {
    sense_id: row.sense_id, entry_id: row.entry_id, scope: row.scope, lemma: row.lemma, pos: row.pos, level: row.level,
    // Private labels (p2, p3, …) only keep the live-sense index unique; they are never shown.
    context_label: row.scope === 'private' ? null : row.context_label,
    meaning: { text: (useEnglish ? row.definition_en : row.gloss_vi) ?? '', language: useEnglish ? 'en' : 'vi',
      translation_missing: !useEnglish && nativeLanguage !== 'vi' },
    definition_en: row.definition_en, examples: row.examples, topics: row.topics,
    form_of: row.form_of_entry_id && row.form_kind && row.form_lemma && row.form_pos
      ? { entry_id: row.form_of_entry_id, lemma: row.form_lemma, pos: row.form_pos, kind: row.form_kind } : null,
  };
}

/** Word pages, headword search, lookup and learner cards (design 7.1, D42). */
@Injectable()
export class WordsService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(InflectionsService) private readonly inflections: InflectionsService,
  ) {}

  /** One statement per read: visibility, displayed level and live content on one snapshot. */
  private async senses(viewerId: string, nativeLanguage: NativeLanguage, where: Prisma.Sql): Promise<WordSense[]> {
    const rows = await this.prisma.$queryRaw<SenseRow[]>`
      SELECT s.id::text AS sense_id, e.id::text AS entry_id, e.scope, e.lemma, e.pos, s.context_label,
        displayed.level, r.examples, gloss.text AS gloss_vi, definition.text AS definition_en,
        COALESCE(topics.items, '[]'::jsonb) AS topics,
        r.form_of_entry_id::text AS form_of_entry_id, r.form_kind, base.lemma AS form_lemma, base.pos AS form_pos
      FROM senses s
      JOIN entries e ON e.id = s.entry_id
      JOIN sense_revisions r ON r.id = s.live_revision_id AND r.sense_id = s.id
      LEFT JOIN LATERAL (${displayedLevel}) displayed ON true
      LEFT JOIN sense_revision_texts gloss ON gloss.revision_id = r.id AND gloss.language = 'vi' AND gloss.kind = 'gloss'
      LEFT JOIN sense_revision_texts definition ON definition.revision_id = r.id AND definition.language = 'en' AND definition.kind = 'definition'
      LEFT JOIN entries base ON base.id = r.form_of_entry_id
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(jsonb_build_object('code', codes.code,
          'name', COALESCE(native.name, english.name, codes.code)) ORDER BY codes.ordinal) AS items
        FROM unnest(r.topic_codes) WITH ORDINALITY AS codes(code, ordinal)
        LEFT JOIN topic_names native ON native.topic_code = codes.code AND native.language = ${nativeLanguage}
        LEFT JOIN topic_names english ON english.topic_code = codes.code AND english.language = 'en'
      ) topics ON true
      WHERE ${visible(viewerId)} AND ${where}
      ORDER BY e.lemma COLLATE "C", array_position(${posOrder}::text[], e.pos), (e.scope = 'private'),
        s.context_label NULLS FIRST, s.created_at, s.id`;
    return rows.map((row) => view(row, nativeLanguage));
  }

  cardContent(viewerId: string, senseIds: string[], nativeLanguage: NativeLanguage): Promise<Map<string, WordSense>> {
    if (senseIds.length === 0) return Promise.resolve(new Map());
    return this.senses(viewerId, nativeLanguage, Prisma.sql`s.id = ANY(${senseIds}::uuid[])`)
      .then((senses) => new Map(senses.map((sense) => [sense.sense_id, sense])));
  }

  async wordPage(viewerId: string, lemma: string, nativeLanguage: NativeLanguage) {
    const senses = await this.senses(viewerId, nativeLanguage, Prisma.sql`e.lemma = ${lemma}`);
    if (senses.length === 0) throw new ProblemDetailsException({ status: 404, title: 'Not found', type: 'not-found' });
    const entryIds = [...new Set(senses.map(({ entry_id }) => entry_id))];
    const forms = await this.prisma.$queryRaw<Array<{ kind: InflectionKind; form: string; has_page: boolean }>>`
      SELECT DISTINCT i.kind, i.form, EXISTS (
        SELECT 1 FROM senses s JOIN entries e ON e.id = s.entry_id
        WHERE e.lemma = i.form AND s.live_revision_id IS NOT NULL AND ${visible(viewerId)}
      ) AS has_page
      FROM entry_inflections i WHERE i.entry_id = ANY(${entryIds}::uuid[])`;
    forms.sort((a, b) => INFLECTION_KINDS.indexOf(a.kind) - INFLECTION_KINDS.indexOf(b.kind)
      || (a.form < b.form ? -1 : a.form > b.form ? 1 : 0));
    // senses() already orders by part of speech, so each section's senses arrive together.
    const sections: Array<{ pos: string; senses: WordSense[] }> = [];
    for (const sense of senses) {
      if (sections.at(-1)?.pos !== sense.pos) sections.push({ pos: sense.pos, senses: [] });
      sections.at(-1)!.senses.push(sense);
    }
    return { lemma, inflections: forms.map(({ kind, form, has_page }) => ({ kind, form, has_page })), sections };
  }

  /** Case-insensitive: the senses spelled q (lemma or variant), then every base listing q as an inflected form. */
  async lookup(viewerId: string, q: string, nativeLanguage: NativeLanguage) {
    const senses = await this.senses(viewerId, nativeLanguage, Prisma.sql`(lower(e.lemma) = ${q}
      OR EXISTS (SELECT 1 FROM entry_variants v WHERE v.entry_id = e.id AND lower(v.text) = ${q}))`);
    const bases = await this.inflections.entriesByForm(q, viewerId);
    const baseSenses = bases.length === 0 ? [] : await this.senses(viewerId, nativeLanguage,
      Prisma.sql`e.id = ANY(${[...new Set(bases.map(({ entryId }) => entryId))]}::uuid[])`);
    const viaInflection = bases.map((base) => ({
      kind: base.kind, base: { entry_id: base.entryId, lemma: base.lemma, pos: base.pos },
      senses: baseSenses.filter(({ entry_id }) => entry_id === base.entryId),
    })).filter(({ senses: found }) => found.length > 0);
    return { senses, via_inflection: viaInflection };
  }

  /** One row per exact lemma (D42), ranked exact → prefix → contains on lemma and variants (B2#58). */
  async search(viewerId: string, query: WordListQuery, nativeLanguage: NativeLanguage) {
    const binding = createHash('sha256').update(JSON.stringify({ route: 'words', viewerId, q: query.q ?? null,
      level: query.level ?? null, topic: query.topic ?? null, pos: query.pos ?? null, mine: query.mine ?? false })).digest('hex');
    let cursor: z.infer<typeof cursorSchema> | undefined;
    if (query.page_token !== undefined) {
      const parsed = cursorSchema.safeParse(decodeBoundToken(query.page_token, binding));
      if (!parsed.success) throw invalid();
      cursor = parsed.data;
    }
    const escaped = query.q?.replace(/[\\%_]/g, '\\$&');
    const rank = query.q === undefined ? Prisma.sql`0` : Prisma.sql`(
      SELECT MIN(CASE WHEN lower(head.text) = ${query.q} THEN 0 WHEN head.text ILIKE ${escaped + '%'} ESCAPE ${'\\'} THEN 1 ELSE 2 END)
      FROM (SELECT e.lemma AS text UNION ALL SELECT v.text FROM entry_variants v WHERE v.entry_id = e.id) head
      WHERE head.text ILIKE ${'%' + escaped + '%'} ESCAPE ${'\\'})`;
    const filters = [
      visible(viewerId), Prisma.sql`s.live_revision_id IS NOT NULL`,
      ...(query.level === undefined ? [] : [Prisma.sql`displayed.level = ${query.level}`]),
      ...(query.topic === undefined ? [] : [Prisma.sql`${query.topic} = ANY(r.topic_codes)`]),
      ...(query.pos === undefined ? [] : [Prisma.sql`e.pos = ${query.pos}`]),
      ...(query.mine ? [Prisma.sql`e.scope = 'private'`] : []),
    ];
    const after = cursor ? Prisma.sql`WHERE (rank, lemma COLLATE "C") > (${cursor.rank}, ${cursor.lemma} COLLATE "C")` : Prisma.empty;
    const rows = await this.prisma.$queryRaw<Array<WordRow & { rank: number }>>`
      WITH matched AS (
        SELECT e.lemma, e.pos, e.scope, displayed.level, ${rank} AS rank,
          CASE WHEN ${nativeLanguage} = 'vi' AND gloss.text IS NOT NULL THEN gloss.text ELSE COALESCE(definition.text, gloss.text, '') END AS meaning,
          array_position(${posOrder}::text[], e.pos) AS pos_rank, s.context_label, s.created_at, s.id
        FROM senses s
        JOIN entries e ON e.id = s.entry_id
        JOIN sense_revisions r ON r.id = s.live_revision_id AND r.sense_id = s.id
        LEFT JOIN LATERAL (${displayedLevel}) displayed ON true
        LEFT JOIN sense_revision_texts gloss ON gloss.revision_id = r.id AND gloss.language = 'vi' AND gloss.kind = 'gloss'
        LEFT JOIN sense_revision_texts definition ON definition.revision_id = r.id AND definition.language = 'en' AND definition.kind = 'definition'
        WHERE ${Prisma.join(filters, ' AND ')}
      ), words AS (
        SELECT lemma, MIN(rank)::int AS rank, array_agg(DISTINCT pos) AS pos_list, bool_or(scope = 'private') AS has_private,
          (array_agg(level ORDER BY array_position(${LEVELS as unknown as string[]}::text[], level)) FILTER (WHERE level IS NOT NULL))[1] AS level,
          (array_agg(meaning ORDER BY (scope = 'private'), pos_rank, context_label NULLS FIRST, created_at, id))[1] AS meaning_preview
        FROM matched WHERE rank IS NOT NULL GROUP BY lemma
      )
      SELECT * FROM words ${after}
      ORDER BY rank, lemma COLLATE "C"
      LIMIT ${query.page_size + 1}`;
    const page = rows.slice(0, query.page_size);
    const last = page.at(-1);
    return {
      items: page.map(({ lemma, pos_list, level, meaning_preview, has_private }) => ({
        lemma, pos_list: [...pos_list].sort((a, b) => posRank(a) - posRank(b)), level: level ?? null, meaning_preview, has_private,
      })),
      next_page_token: rows.length > query.page_size && last ? encodeBoundToken({ rank: last.rank, lemma: last.lemma }, binding) : null,
    };
  }
}
