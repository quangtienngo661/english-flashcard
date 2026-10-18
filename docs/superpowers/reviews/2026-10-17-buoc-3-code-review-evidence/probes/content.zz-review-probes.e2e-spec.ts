import { randomUUID } from 'node:crypto';
import { appendFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ContentService, type RevisionContent } from '../../src/content/index.js';
import type { Prisma } from '../../src/generated/prisma/client.js';
import { seedUser, startSession } from '../support/auth-helpers.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';
import { resetCatalog } from '../support/reset-catalog.js';
import { testConfig } from '../support/test-config.js';

const transactionOptions = { timeout: 10_000, maxWait: 5_000 };
const problem = (slug: string) => `https://api.example.com/problems/${slug}`;
const complete: RevisionContent = {
  glossVi: 'ngân hàng', definitionEn: null, examplesEn: ['I visited the bank.'], topicCodes: [], acceptedForms: [],
};

describe('review probes (content)', () => {
  let ctx: TestApp;
  let content: ContentService;
  let actorId: string;
  let aId: string;
  let aToken: string;
  let bId: string;
  let bToken: string;

  const tx = <T>(action: (tx: Prisma.TransactionClient) => Promise<T>) => ctx.prisma.$transaction(action, transactionOptions);
  const catalogSense = async (lemma: string, publish = true) => {
    const ids = await tx(async (t) => {
      await content.lockEntryKey(t, lemma, 'noun');
      const { entry } = await content.ensureEntry(t, { lemma, pos: 'noun', variants: [] });
      await content.setEditorialLevel(t, entry.id, 'A1');
      return content.createSense(t, { entryId: entry.id, contextLabel: null, content: complete, source: 'ui', actorId });
    });
    if (publish) await content.publishItem({ senseId: ids.senseId, revision: 1 }, actorId);
    return ids.senseId;
  };
  const privateSense = async (ownerId: string, lemma: string) => (await tx((t) => content.createPrivateSense(t, {
    ownerId, lemma, pos: 'noun', meaning: { text: 'nghĩa riêng', language: 'vi' }, level: null, topicCodes: [], formOf: null,
  }))).senseId;
  const add = (senseId: string, text: string, token = aToken) => ctx.http().post(`/v1/senses/${senseId}/sentences`)
    .set('Authorization', `Bearer ${token}`).set('Idempotency-Key', randomUUID()).send({ text });
  const remove = (id: string, token = aToken) => ctx.http().delete(`/v1/sentences/${id}`)
    .set('Authorization', `Bearer ${token}`).set('Idempotency-Key', randomUUID());
  const stored = () => ctx.prisma.contextSentence.findMany({ orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });

  beforeAll(async () => {
    const config = testConfig();
    config.limits['user.write'].max = 10_000;
    ctx = await createTestApp({ databaseUrl: await createIsolatedDatabase(), config });
    content = ctx.app.get(ContentService);
  });
  beforeEach(async () => {
    await resetCatalog(ctx.prisma);
    await ctx.prisma.rateLimitCounter.deleteMany();
    await ctx.prisma.idempotencyKey.deleteMany();
    await ctx.prisma.user.deleteMany();
    ctx.clock.set(new Date('2026-10-17T12:00:00Z'));
    actorId = (await seedUser(ctx.prisma, { verified: true, staffRole: 'editor' })).userId;
    aId = (await seedUser(ctx.prisma, { nativeLanguage: 'vi' })).userId;
    aToken = (await startSession(ctx, aId)).accessToken;
    bId = (await seedUser(ctx.prisma, { nativeLanguage: 'vi' })).userId;
    bToken = (await startSession(ctx, bId)).accessToken;
  });
  afterAll(async () => { await ctx?.close(); });
  const out = (...a: unknown[]) => appendFileSync(process.env.PROBE_OUT ?? 'probe.out', a.join(' ') + '\n');

  it('C1 (M1): a deleted sentence leaves its text in idempotency_keys', async () => {
    const bank = await catalogSense('bank');
    const sentinel = `SENTINEL-${randomUUID()}`;
    const added = await add(bank, `The ${sentinel} sentence.`);
    const removed = await remove(added.body.id);
    const copies = await ctx.prisma.$queryRaw<Array<{ n: number }>>`
      SELECT count(*)::int AS n FROM idempotency_keys WHERE response_body::text LIKE ${'%' + sentinel + '%'}`;
    out('C1 add', added.status, 'remove', removed.status, 'sentences left', await ctx.prisma.contextSentence.count({ where: { text: { contains: sentinel } } }),
      'copies in idempotency_keys', copies[0].n);
  });

  it('C2 (L2): the owner adds a sentence to their own retired private sense', async () => {
    const mine = await privateSense(aId, 'skrrt');
    await ctx.prisma.sense.update({ where: { id: mine }, data: { state: 'retired' } });
    const visible = await content.visibleSenseIds(aId, [mine]);
    const res = await add(mine, 'Stray.');
    out('C2 visibleSenseIds has it', visible.has(mine), 'add status', res.status);
  });

  it('C3 (B3E14): lookup "deployed" when catalog deploy/verb has library forms but no published sense', async () => {
    await tx(async (t) => {
      await content.lockEntryKey(t, 'deploy', 'verb');
      const { entry } = await content.ensureEntry(t, { lemma: 'deploy', pos: 'verb', variants: [] });
      await content.replaceInflections(t, entry.id, 'library', [{ form: 'deployed', kind: 'past' }, { form: 'deployed', kind: 'past_participle' }]);
    });
    const res = await ctx.http().get('/v1/lookup').query({ q: 'deployed' }).set('Authorization', `Bearer ${aToken}`);
    out('C3 lookup', res.status, JSON.stringify(res.body));
  });
});
