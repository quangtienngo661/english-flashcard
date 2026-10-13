import { Inject, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { decodeBoundToken, encodeBoundToken } from '../../common/pagination/page-token.util.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import { VALID_POS, type Level } from '../content.constants.js';

export type LearnerListQuery = {
  page_size: number; page_token?: string; q?: string; level?: Level; topic?: string; pos?: string;
  exclude_function_words?: boolean;
};
export type LearnerSenseView = {
  sense_id: string; entry_id: string; lemma: string; pos: string; level: Level | null; is_function_word: boolean;
  context_label: string | null; meaning: { text: string; language: 'vi' | 'en'; translation_missing: boolean };
  definition_en: string | null; examples: string[]; topics: Array<{ code: string; name: string }>;
};
type NativeLanguage = 'vi' | 'en';
type SenseRow = Omit<LearnerSenseView, 'meaning'> & { rank: number; gloss_vi: string | null };
const cursorSchema = z.strictObject({
  rank: z.number().int().min(0).max(2),
  lemma: z.string().refine((value) => !value.includes('\0') && [...value].length >= 1 && [...value].length <= 100),
  pos: z.enum(VALID_POS), id: z.uuid(),
});
type Cursor = z.infer<typeof cursorSchema>;

function queryBinding(route: 'search' | 'browse', query: LearnerListQuery): string {
  return createHash('sha256').update(JSON.stringify({
    route, q: query.q ?? null, level: query.level ?? null, topic: query.topic ?? null, pos: query.pos ?? null,
    exclude_function_words: query.exclude_function_words ?? false,
  })).digest('hex');
}

function readCursor(query: LearnerListQuery, binding: string): Cursor | undefined {
  if (query.page_token === undefined) return undefined;
  const cursor = cursorSchema.safeParse(decodeBoundToken(query.page_token, binding));
  if (!cursor.success || (query.q === undefined && cursor.data.rank !== 0)) {
    throw new ProblemDetailsException({ status: 400, title: 'Validation failed', type: 'validation-failed' });
  }
  return cursor.data;
}

function view(row: SenseRow, nativeLanguage: NativeLanguage): LearnerSenseView {
  const nativeGloss = nativeLanguage === 'vi' && row.gloss_vi !== null;
  const useEnglish = !nativeGloss && row.definition_en !== null;
  return {
    sense_id: row.sense_id, entry_id: row.entry_id, lemma: row.lemma, pos: row.pos, level: row.level,
    is_function_word: row.is_function_word, context_label: row.context_label,
    meaning: {
      text: (useEnglish ? row.definition_en : row.gloss_vi) ?? '', language: useEnglish ? 'en' : 'vi',
      translation_missing: !useEnglish && nativeLanguage !== 'vi',
    },
    definition_en: row.definition_en, examples: row.examples, topics: row.topics,
  };
}

@Injectable()
export class LearnerContentService {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  search(query: LearnerListQuery & { q: string }, nativeLanguage: NativeLanguage) {
    return this.list('search', query, nativeLanguage);
  }

  browse(query: LearnerListQuery, nativeLanguage: NativeLanguage) {
    return this.list('browse', query, nativeLanguage);
  }

  async getSense(id: string, nativeLanguage: NativeLanguage): Promise<LearnerSenseView> {
    const [row] = await this.readRows({ page_size: 1 }, nativeLanguage, undefined, id);
    if (!row) throw new ProblemDetailsException({ status: 404, title: 'Not found', type: 'not-found' });
    return view(row, nativeLanguage);
  }

  private async list(route: 'search' | 'browse', query: LearnerListQuery, nativeLanguage: NativeLanguage) {
    const binding = queryBinding(route, query);
    const cursor = readCursor(query, binding);
    const rows = await this.readRows(query, nativeLanguage, cursor);
    const selected = rows.slice(0, query.page_size);
    const last = selected.at(-1);
    return {
      items: selected.map((row) => view(row, nativeLanguage)),
      next_page_token: rows.length > query.page_size && last
        ? encodeBoundToken({ rank: last.rank, lemma: last.lemma, pos: last.pos, id: last.sense_id }, binding) : null,
    };
  }

  /** One statement keeps visibility, ranking, filtering and live content on the same DB snapshot. */
  private readRows(query: LearnerListQuery, nativeLanguage: NativeLanguage, cursor?: Cursor, senseId?: string) {
    const escaped = query.q?.replace(/[\\%_]/g, '\\$&');
    const rank = query.q === undefined ? Prisma.sql`SELECT 0 AS rank` : Prisma.sql`
      SELECT min(CASE
        WHEN lower(head.text) = ${query.q} THEN 0
        WHEN head.text ILIKE ${escaped + '%'} ESCAPE ${'\\'} THEN 1
        ELSE 2
      END) AS rank
      FROM (
        SELECT e.lemma AS text
        UNION ALL
        SELECT v.text FROM entry_variants v WHERE v.entry_id = e.id
      ) head
      WHERE head.text ILIKE ${'%' + escaped + '%'} ESCAPE ${'\\'}`;
    const filters = [
      Prisma.sql`s.state = 'open' AND s.live_revision_id IS NOT NULL`,
      Prisma.sql`e.language = 'en' AND e.entry_type = 'word'`,
      ...(senseId === undefined ? [] : [Prisma.sql`s.id = ${senseId}::uuid`]),
      ...(query.level === undefined ? [] : [Prisma.sql`displayed.level = ${query.level}`]),
      ...(query.topic === undefined ? [] : [Prisma.sql`${query.topic} = ANY(r.topic_codes)`]),
      ...(query.pos === undefined ? [] : [Prisma.sql`e.pos = ${query.pos}`]),
      ...(query.exclude_function_words ? [Prisma.sql`COALESCE(e.function_word_override, e.function_word_derived) = false`] : []),
    ];
    const after = cursor ? Prisma.sql`
      WHERE (rank, lemma, pos, sense_id) > (${cursor.rank}, ${cursor.lemma}, ${cursor.pos}, ${cursor.id}::uuid)` : Prisma.empty;
    // No search index: design §9 requires measuring the real ~9,800-entry scan before adding one.
    return this.prisma.$queryRaw<SenseRow[]>(Prisma.sql`
      WITH candidates AS (
        SELECT s.id AS sense_id, s.entry_id, e.lemma, e.pos, s.context_label,
          COALESCE(e.function_word_override, e.function_word_derived) AS is_function_word,
          displayed.level, matched.rank, r.id AS revision_id, r.examples, r.topic_codes
        FROM senses s
        JOIN entries e ON e.id = s.entry_id
        JOIN sense_revisions r ON r.id = s.live_revision_id AND r.sense_id = s.id
        JOIN LATERAL (${rank}) matched ON matched.rank IS NOT NULL
        LEFT JOIN LATERAL (
          SELECT el.level FROM entry_levels el JOIN data_sources ds ON ds.id = el.source_id
          WHERE el.entry_id = e.id
          ORDER BY (el.basis = 'editorial') DESC,
            CASE WHEN el.basis = 'editorial' THEN el.created_at END DESC,
            CASE WHEN el.basis = 'editorial' THEN el.id END ASC,
            ds.display_priority ASC, ds.id ASC,
            array_position(ARRAY['A1', 'A2', 'B1', 'B2', 'C1', 'C2']::text[], el.level) ASC
          LIMIT 1
        ) displayed ON true
        WHERE ${Prisma.join(filters, ' AND ')}
      ), page AS (
        SELECT * FROM candidates ${after}
        ORDER BY rank ASC, lemma ASC, pos ASC, sense_id ASC
        LIMIT ${senseId === undefined ? query.page_size + 1 : 1}
      )
      SELECT page.sense_id, page.entry_id, page.lemma, page.pos, page.context_label,
        page.is_function_word, page.level, page.rank, page.examples,
        gloss.text AS gloss_vi, definition.text AS definition_en, COALESCE(topics.items, '[]'::jsonb) AS topics
      FROM page
      LEFT JOIN sense_revision_texts gloss
        ON gloss.revision_id = page.revision_id AND gloss.language = 'vi' AND gloss.kind = 'gloss'
      LEFT JOIN sense_revision_texts definition
        ON definition.revision_id = page.revision_id AND definition.language = 'en' AND definition.kind = 'definition'
      LEFT JOIN LATERAL (
        SELECT jsonb_agg(jsonb_build_object('code', codes.code,
          'name', COALESCE(native.name, english.name, codes.code)) ORDER BY codes.ordinal) AS items
        FROM unnest(page.topic_codes) WITH ORDINALITY AS codes(code, ordinal)
        LEFT JOIN topic_names native ON native.topic_code = codes.code AND native.language = ${nativeLanguage}
        LEFT JOIN topic_names english ON english.topic_code = codes.code AND english.language = 'en'
      ) topics ON true
      ORDER BY page.rank ASC, page.lemma ASC, page.pos ASC, page.sense_id ASC
    `);
  }
}
