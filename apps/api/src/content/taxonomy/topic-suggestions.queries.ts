import { Inject, Injectable } from '@nestjs/common';
import { PRISMA_CLIENT } from '../../common/db/prisma.module.js';
import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';

export type SuggestionPair = { topic_code: string; topic_name: string; level: string; count: number };
export type SuggestionSample = { sense_id: string; lemma: string; pos: string; meaning: string | null };

// The learner-visible set of the lookup list (learner-content.service.ts readRows): live catalog senses, not function words,
// with the entry's displayed level.
const VISIBLE = Prisma.sql`
  s.state = 'open' AND s.live_revision_id IS NOT NULL
  AND e.language = 'en' AND e.entry_type = 'word' AND e.scope = 'catalog'
  AND COALESCE(e.function_word_override, e.function_word_derived) = false`;

const DISPLAYED_LEVEL = Prisma.sql`
  LEFT JOIN LATERAL (
    SELECT el.level FROM entry_levels el JOIN data_sources ds ON ds.id = el.source_id
    WHERE el.entry_id = e.id
    ORDER BY (el.basis = 'editorial') DESC,
      CASE WHEN el.basis = 'editorial' THEN el.created_at END DESC,
      CASE WHEN el.basis = 'editorial' THEN el.id END ASC,
      ds.display_priority ASC, ds.id ASC,
      array_position(ARRAY['A1', 'A2', 'B1', 'B2', 'C1', 'C2']::text[], el.level) ASC
    LIMIT 1
  ) displayed ON true`;

/** Reads for "Tạo nhóm nhanh theo chủ đề" (design §8.8, D17). */
@Injectable()
export class TopicSuggestionQueries {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  /** Every (topic, displayed level) pair of a topic that is not archived, with its number of visible senses. */
  async pairs(language: 'vi' | 'en'): Promise<SuggestionPair[]> {
    const rows = await this.prisma.$queryRaw<Array<{ topic_code: string; topic_name: string; level: string; count: bigint }>>(Prisma.sql`
      SELECT t.code AS topic_code, COALESCE(native.name, english.name, t.code) AS topic_name, displayed.level, count(*) AS count
      FROM senses s
      JOIN entries e ON e.id = s.entry_id
      JOIN sense_revisions r ON r.id = s.live_revision_id AND r.sense_id = s.id
      ${DISPLAYED_LEVEL}
      CROSS JOIN LATERAL unnest(r.topic_codes) AS codes(code)
      JOIN topics t ON t.code = codes.code AND t.archived_at IS NULL
      LEFT JOIN topic_names native ON native.topic_code = t.code AND native.language = ${language}
      LEFT JOIN topic_names english ON english.topic_code = t.code AND english.language = 'en'
      WHERE ${VISIBLE} AND displayed.level IS NOT NULL
      GROUP BY t.code, native.name, english.name, displayed.level
      ORDER BY t.code, displayed.level`);
    return rows.map((row) => ({ ...row, count: Number(row.count) }));
  }

  /** The visible senses of one pair, with the meaning in the learner's language (gloss for vi, definition for en). */
  samples(topic: string, level: string, language: 'vi' | 'en'): Promise<SuggestionSample[]> {
    const meaningKind = language === 'vi' ? Prisma.sql`'vi' AND m.kind = 'gloss'` : Prisma.sql`'en' AND m.kind = 'definition'`;
    return this.prisma.$queryRaw<SuggestionSample[]>(Prisma.sql`
      SELECT s.id::text AS sense_id, e.lemma, e.pos, m.text AS meaning
      FROM senses s
      JOIN entries e ON e.id = s.entry_id
      JOIN sense_revisions r ON r.id = s.live_revision_id AND r.sense_id = s.id
      ${DISPLAYED_LEVEL}
      LEFT JOIN sense_revision_texts m ON m.revision_id = r.id AND m.language = ${meaningKind}
      WHERE ${VISIBLE} AND ${topic} = ANY(r.topic_codes) AND displayed.level = ${level}
      ORDER BY s.id`);
  }
}
