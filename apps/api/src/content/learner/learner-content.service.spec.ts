import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { LearnerContentService } from './learner-content.service.js';

describe('LearnerContentService.topicSenseIds', () => {
  const scope = { topic: 'exam-vstep', level: 'B2' } as const;
  const ids = ['00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000001'];

  it('runs an ID-only browse with the same catalog eligibility and ordering', async () => {
    const query = vi.fn().mockResolvedValue(ids.map((sense_id) => ({ sense_id })));
    const service = new LearnerContentService({ $queryRaw: query } as unknown as PrismaClient);
    await expect(service.topicSenseIds(scope, { senseIds: ids })).resolves.toEqual(ids);
    const [sql] = query.mock.calls[0]!;
    expect(sql.text).toContain("e.language = 'en' AND e.entry_type = 'word' AND e.scope = 'catalog'");
    expect(sql.text).toContain('COALESCE(e.function_word_override, e.function_word_derived) = false');
    expect(sql.text).toContain('ORDER BY e.lemma ASC, e.pos ASC, s.id ASC');
    expect(sql.text).not.toContain('sense_revision_texts');
    expect(sql.values).toEqual(expect.arrayContaining(['B2', 'exam-vstep', ids]));
  });

  it('treats an explicitly empty list as no candidates', async () => {
    const query = vi.fn();
    const service = new LearnerContentService({ $queryRaw: query } as unknown as PrismaClient);
    await expect(service.topicSenseIds(scope, { senseIds: [] })).resolves.toEqual([]);
    expect(query).not.toHaveBeenCalled();
  });
});
