import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ContentService, visibleSenseCondition, type RevisionContent } from '../../src/content/index.js';
import { Prisma } from '../../src/generated/prisma/client.js';
import { seedUser } from '../support/auth-helpers.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';

const transactionOptions = { timeout: 30_000, maxWait: 5_000 };
const complete: RevisionContent = {
  glossVi: 'nghĩa', definitionEn: null, examplesEn: ['An example.'], topicCodes: ['food'], acceptedForms: [],
};

describe('visible senses: one definition for Content and Learning (e2e, isolated database)', () => {
  let ctx: TestApp;
  let content: ContentService;

  beforeAll(async () => {
    ctx = await createTestApp({ databaseUrl: await createIsolatedDatabase() });
    content = ctx.app.get(ContentService);
  });
  afterAll(async () => { await ctx?.close(); });

  it('visibleSenseCondition selects exactly what visibleSenseIds returns: published catalog senses and the viewer\'s own private ones; another learner\'s private, unpublished, retired and replaced senses are left out', async () => {
    const actorId = (await seedUser(ctx.prisma, { verified: true, staffRole: 'editor' })).userId;
    const viewer = (await seedUser(ctx.prisma, { nativeLanguage: 'vi' })).userId;
    const other = (await seedUser(ctx.prisma, { nativeLanguage: 'vi' })).userId;
    const tx = <T>(action: (t: Prisma.TransactionClient) => Promise<T>) => ctx.prisma.$transaction(action, transactionOptions);
    const sense = async (lemma: string, publish = true, replacesSenseId?: string) => {
      const senseId = await tx(async (t) => {
        await content.lockEntryKey(t, lemma, 'noun');
        const { entry } = await content.ensureEntry(t, { lemma, pos: 'noun', variants: [] });
        await content.setEditorialLevel(t, entry.id, 'A2');
        return (await content.createSense(t, {
          entryId: entry.id, contextLabel: null, content: complete, source: 'ui', actorId, replacesSenseId,
        })).senseId;
      });
      if (publish) expect(await content.publishItem({ senseId, revision: 1 }, actorId)).toEqual({ outcome: 'published' });
      return senseId;
    };
    const privateSense = (ownerId: string, lemma: string) => tx(async (t) => (await content.createPrivateSense(t, {
      ownerId, lemma, pos: 'noun', meaning: { text: 'riêng', language: 'vi' }, level: null, topicCodes: [], formOf: null,
    })).senseId);

    const published = await sense('apple');
    const draft = await sense('bread', false);
    const unpublished = await sense('cheese');
    await content.unpublish([unpublished]);
    const retired = await sense('dates');
    await content.retire([retired]);
    const replaced = await sense('eggs');
    const replacement = await sense('eggs', true, replaced);
    const mine = await privateSense(viewer, 'yeet');
    const theirs = await privateSense(other, 'yote');
    const ids = [published, draft, unpublished, retired, replaced, replacement, mine, theirs, randomUUID()];

    const expected = [published, replacement, mine].sort();
    expect([...await content.visibleSenseIds(viewer, ids)].sort()).toEqual(expected);
    const rows = await ctx.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT t.id::text AS id FROM unnest(${ids}::uuid[]) AS t(id) WHERE ${visibleSenseCondition(Prisma.sql`t.id`, viewer)}`);
    expect(rows.map(({ id }) => id).sort()).toEqual(expected);
  });
});
