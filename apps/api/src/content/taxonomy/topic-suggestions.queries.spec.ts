import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { TopicSuggestionQueries } from './topic-suggestions.queries.js';

function captured() {
  const $queryRaw = vi.fn(async () => []);
  const queries = new TopicSuggestionQueries({ $queryRaw } as unknown as PrismaClient);
  const statement = () => ($queryRaw.mock.calls[0] as unknown[])[0] as { sql: string; values: unknown[] };
  const text = () => statement().sql.replace(/\s+/g, ' ');
  return { queries, statement, text };
}

describe('TopicSuggestionQueries', () => {
  it('counts only published catalog senses that are not function words, per topic and displayed level', async () => {
    const { queries, text } = captured();
    await queries.pairs('vi');
    const sql = text();
    expect(sql).toContain("s.state = 'open' AND s.live_revision_id IS NOT NULL");
    expect(sql).toContain("e.scope = 'catalog'");
    expect(sql).toContain('COALESCE(e.function_word_override, e.function_word_derived) = false');
    expect(sql).toContain('unnest(r.topic_codes)');
  });

  it('excludes archived topics from the candidate pairs', async () => {
    const { queries, text } = captured();
    await queries.pairs('vi');
    expect(text()).toContain('t.archived_at IS NULL');
  });

  it.each([
    ['en', "m.language = 'en' AND m.kind = 'definition'"],
    ['vi', "m.language = 'vi' AND m.kind = 'gloss'"],
  ] as const)('samples the visible set of one pair with %s meanings', async (language, meaningCondition) => {
    const { queries, text } = captured();
    await queries.samples('business', 'B1', language, 7);
    const sql = text();
    expect(sql).toContain("e.scope = 'catalog'");
    expect(sql).toContain('= ANY(r.topic_codes)');
    expect(sql).toContain(meaningCondition);
  });

  it('orders sample senses by a bound seed and sense ID and limits database results to four rows', async () => {
    const { queries, statement, text } = captured();
    await queries.samples('business', 'B1', 'en', 4294967295);
    expect(statement().values).toEqual(['business', 'B1', '4294967295']);
    expect(text()).toMatch(/ORDER BY md5\(\?::text \|\| ':' \|\| s\.id::text\), s\.id LIMIT 4\s*$/);
  });
});
