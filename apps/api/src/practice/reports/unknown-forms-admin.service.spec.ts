import { describe, expect, it, vi } from 'vitest';
import type { ContentService } from '../../content/index.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import { UnknownFormsAdminService } from './unknown-forms-admin.service.js';

const SEEN = new Date('2026-10-22T08:00:00Z');
const row = (id: string, lemmaKey: string, form: string, rejectedCount: number) => ({
  id, lemmaKey, formKey: form.toLowerCase(), form, rejectedCount, firstSeenAt: SEEN, lastSeenAt: SEEN,
});

const make = (rows: ReturnType<typeof row>[], known: string[] = []) => {
  const prisma = { practiceUnknownForm: { findMany: vi.fn(async () => rows), deleteMany: vi.fn(async () => ({ count: 1 })) } };
  const content = { knownWordForms: vi.fn(async () => new Set(known)) };
  return { prisma, content, service: new UnknownFormsAdminService(prisma as unknown as PrismaClient, content as unknown as ContentService) };
};

describe('UnknownFormsAdminService (design §10, D15)', () => {
  it('B7E96: most rejected first; each row has the lemma key, the form and the counts', async () => {
    const { service, prisma } = make([row('f-1', 'go', 'goed', 5), row('f-2', 'run', 'runned', 2)]);
    expect(await service.list({ pageSize: 20 })).toEqual({
      items: [
        { id: 'f-1', lemma_key: 'go', form: 'goed', rejected_count: 5, first_seen_at: SEEN.toISOString(), last_seen_at: SEEN.toISOString() },
        { id: 'f-2', lemma_key: 'run', form: 'runned', rejected_count: 2, first_seen_at: SEEN.toISOString(), last_seen_at: SEEN.toISOString() },
      ],
      next_page_token: null,
    });
    expect(prisma.practiceUnknownForm.findMany).toHaveBeenCalledWith(expect.objectContaining({
      orderBy: [{ rejectedCount: 'desc' }, { id: 'asc' }], take: 21,
    }));
  });

  it('B7E97: a pair staff already accepted as a word form is hidden', async () => {
    const { service, content } = make([row('f-1', 'go', 'went', 5), row('f-2', 'run', 'runned', 2)], ['go went']);
    expect((await service.list({ pageSize: 20 })).items.map(({ id }) => id)).toEqual(['f-2']);
    expect(content.knownWordForms).toHaveBeenCalledWith([{ lemmaKey: 'go', formKey: 'went' }, { lemmaKey: 'run', formKey: 'runned' }]);
  });

  it('a next page continues after the last row read, hidden or not, and its token is bound to this list', async () => {
    const { service, prisma } = make([row('f-1', 'go', 'went', 5), row('f-2', 'run', 'runned', 2), row('f-3', 'eat', 'eated', 1)],
      ['go went']);
    const first = await service.list({ pageSize: 2 });
    expect(first.items.map(({ id }) => id)).toEqual(['f-2']);
    expect(first.next_page_token).not.toBeNull();
    prisma.practiceUnknownForm.findMany.mockResolvedValueOnce([row('f-3', 'eat', 'eated', 1)]);
    await service.list({ pageSize: 2, pageToken: first.next_page_token! });
    expect(prisma.practiceUnknownForm.findMany).toHaveBeenLastCalledWith(expect.objectContaining({
      where: { OR: [{ rejectedCount: { lt: 2 } }, { rejectedCount: 2, id: { gt: 'f-2' } }] },
    }));
    await expect(service.list({ pageSize: 2, pageToken: 'not-a-token' })).rejects.toMatchObject({ problemType: 'validation-failed' });
  });

  it('dismiss deletes the row; an unknown id → 404 not-found', async () => {
    const { service, prisma } = make([]);
    await service.dismiss('f-1');
    expect(prisma.practiceUnknownForm.deleteMany).toHaveBeenCalledWith({ where: { id: 'f-1' } });
    prisma.practiceUnknownForm.deleteMany.mockResolvedValueOnce({ count: 0 });
    await expect(service.dismiss('f-9')).rejects.toMatchObject({ problemType: 'not-found', status: 404 });
  });
});
