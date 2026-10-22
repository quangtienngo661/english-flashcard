import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { TopicSuggestionQueries } from './topic-suggestions.queries.js';

function captured() {
  const $queryRaw = vi.fn(async () => []);
  const queries = new TopicSuggestionQueries({ $queryRaw } as unknown as PrismaClient);
  const text = () => (($queryRaw.mock.calls[0] as unknown[])[0] as { sql: string }).sql.replace(/\s+/g, ' ');
  return { queries, text };
}

describe('TopicSuggestionQueries (design §8.8)', () => {
  it('counts only published catalog senses that are not function words, per topic and displayed level', async () => {
    const { queries, text } = captured();
    await queries.pairs('vi');
    const sql = text();
    expect(sql).toContain("s.state = 'open' AND s.live_revision_id IS NOT NULL");
    expect(sql).toContain("e.scope = 'catalog'");
    expect(sql).toContain('COALESCE(e.function_word_override, e.function_word_derived) = false');
    expect(sql).toContain('unnest(r.topic_codes)');
  });

  it('GH4: an archived topic is never a candidate', async () => {
    const { queries, text } = captured();
    await queries.pairs('vi');
    expect(text()).toContain('t.archived_at IS NULL');
  });

  it('samples read the same visible set for one topic and level', async () => {
    const { queries, text } = captured();
    await queries.samples('business', 'B1', 'en');
    const sql = text();
    expect(sql).toContain("e.scope = 'catalog'");
    expect(sql).toContain('= ANY(r.topic_codes)');
  });
});
