import { describe, expect, it, vi } from 'vitest';
import type { Prisma } from '../../generated/prisma/client.js';
import { importContent } from './import-content.js';
import { SensesService } from './senses.service.js';

const ACTOR = '00000000-0000-4000-8000-0000000000a1';
const usable = {
  id: 'r1', revisionNo: 1, status: 'published', examples: ['A cat sat.'], topicCodes: [], acceptedForms: [],
  formOfEntryId: null, formKind: null, contentHash: 'h1', draftSource: 'ui',
  texts: [{ language: 'vi', kind: 'gloss', text: 'con mèo' }],
};
const rejected = {
  ...usable, id: 'r2', revisionNo: 2, status: 'rejected', contentHash: 'h2',
  examples: ['Bad example.'], texts: [{ language: 'vi', kind: 'gloss', text: 'văn bản bị từ chối' }],
};

function fakeTx() {
  const created: Array<{ data: Record<string, unknown> }> = [];
  const raw = {
    sense: {
      findFirst: vi.fn(async () => ({
        id: 's1', entryId: 'e1', state: 'unpublished', liveRevisionId: 'r1', replacesSenseId: null, revisions: [rejected] })),
      findUnique: vi.fn(async () => ({ id: 's1', state: 'unpublished', entry: { lemma: 'cat' }, revisions: [rejected] })),
    },
    senseRevision: {
      // The usable lookup excludes rejected; the open-draft lookup filters on draft/reviewed and finds nothing.
      findFirst: vi.fn(async (args: { where: { status?: unknown } }) => (
        JSON.stringify(args.where.status).includes('rejected') ? usable : null)),
      findUniqueOrThrow: vi.fn(async () => usable),
      updateMany: vi.fn(async () => ({ count: 0 })),
      create: vi.fn(async (args: { data: Record<string, unknown> }) => { created.push(args); return { id: 'r3', revisionNo: 3 }; }),
    },
  };
  return { tx: raw as unknown as Prisma.TransactionClient, created };
}

const rowFor = (content: object) => ({
  entryId: 'e1', lemma: 'cat', content, senseId: null, revision: null,
  contextLabel: null, replaceMeaning: false, actorId: ACTOR,
});

describe('importContent after a rejection (T1)', () => {
  it('CSV: a row on a sense whose latest revision is rejected merges onto the last usable revision', async () => {
    const { tx, created } = fakeTx();
    const result = await importContent(tx, rowFor({ definitionEn: 'a small pet' }), new SensesService(), async () => []);
    expect(result).toMatchObject({ kind: 'new_revision', senseId: 's1', revisionId: 'r3' });
    const data = created[0].data as { examples: string[]; texts: { create: Array<{ text: string }> } };
    expect(data.examples).toEqual(['A cat sat.']);
    const texts = data.texts.create.map(({ text }) => text);
    expect(texts).toEqual(expect.arrayContaining(['con mèo', 'a small pet']));
    expect(texts).not.toContain('văn bản bị từ chối');
  });

  it('CSV: a row repeating the usable content still writes a revision after a rejection', async () => {
    const { tx, created } = fakeTx();
    const result = await importContent(tx, rowFor({ glossVi: 'con mèo' }), new SensesService(), async () => []);
    expect(result.kind).toBe('new_revision');
    expect(created).toHaveLength(1);
  });
});
