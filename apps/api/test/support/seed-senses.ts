import type { PrismaClient } from '../../src/generated/prisma/client.js';

/**
 * Inserts `count` published, open catalog senses (one noun entry each, lemma `<prefix>-<n>`, gloss `<prefix> <n>`), for
 * suites that need hundreds or thousands of visible senses. Returns their ids in `n` order.
 */
export async function seedVisibleSenses(prisma: PrismaClient, count: number, prefix: string): Promise<string[]> {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string; revision_id: string; n: number }>>`
      WITH e AS (
        INSERT INTO entries (lemma, pos) SELECT ${prefix} || '-' || g, 'noun' FROM generate_series(1, ${count}::int) g
        RETURNING id, lemma
      ), s AS (
        INSERT INTO senses (entry_id, state) SELECT id, 'open' FROM e RETURNING id, entry_id
      ), r AS (
        INSERT INTO sense_revisions (sense_id, revision_no, status, draft_source, content_hash, created_by, published_at, examples)
        SELECT id, 1, 'published', 'ui', md5(id::text), gen_random_uuid(), now(), ARRAY['An example.'] FROM s
        RETURNING id, sense_id
      ), t AS (
        INSERT INTO sense_revision_texts (revision_id, language, kind, text)
        SELECT r.id, 'vi', 'gloss', replace(e.lemma, '-', ' ') FROM r JOIN s ON s.id = r.sense_id JOIN e ON e.id = s.entry_id
      )
      SELECT s.id::text AS id, r.id::text AS revision_id, split_part(e.lemma, '-', -1)::int AS n
      FROM s JOIN r ON r.sense_id = s.id JOIN e ON e.id = s.entry_id`;
    // A data-modifying CTE cannot see rows inserted beside it, so the live revision is set in a second statement.
    await tx.$executeRaw`
      UPDATE senses SET live_revision_id = v.revision_id
      FROM unnest(${rows.map((row) => row.id)}::uuid[], ${rows.map((row) => row.revision_id)}::uuid[]) AS v(id, revision_id)
      WHERE senses.id = v.id`;
    return rows.sort((a, b) => a.n - b.n).map(({ id }) => id);
  }, { timeout: 120_000, maxWait: 5_000 });
}
