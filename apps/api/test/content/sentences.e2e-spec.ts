import { randomUUID } from 'node:crypto';
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

describe('context sentences (e2e, isolated database)', () => {
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

  it('adds a sentence (201) and lists it for its owner only; M1: the response carries no text, so idempotency_keys never stores it', async () => {
    const bank = await catalogSense('bank');
    const res = await add(bank, '  I saw the bank   by the river.  ');
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: expect.any(String), created_at: ctx.clock.now().toISOString() });
    const copies = await ctx.prisma.$queryRaw<Array<{ n: number }>>`
      SELECT count(*)::int AS n FROM idempotency_keys WHERE response_body::text LIKE ${'%by the river%'}`;
    expect(copies[0].n).toBe(0);
    expect((await content.listSentences(aId, [bank])).get(bank)).toEqual([
      { id: res.body.id, text: 'I saw the bank by the river.', createdAt: ctx.clock.now() }]);
    expect((await content.listSentences(bId, [bank])).get(bank) ?? []).toEqual([]);
  });

  it('CR14: the 6th sentence for one (learner, sense) → 409 sentence-limit-reached; another sense or learner is independent', async () => {
    const bank = await catalogSense('bank');
    const river = await catalogSense('river');
    for (let n = 1; n <= 5; n++) expect((await add(bank, `Sentence ${n}.`)).status).toBe(201);
    const before = await stored();
    const sixth = await add(bank, 'Sentence 6.');
    expect(sixth.status).toBe(409);
    expect(sixth.body.type).toBe(problem('sentence-limit-reached'));
    expect(await stored()).toEqual(before);
    expect((await add(river, 'Another sense.')).status).toBe(201);
    expect((await add(bank, 'Another learner.', bToken)).status).toBe(201);
    // Five concurrent adds at four existing leave exactly five.
    const fresh = await catalogSense('fresh');
    for (let n = 1; n <= 4; n++) await add(fresh, `Fresh ${n}.`);
    const raced = await Promise.all(Array.from({ length: 5 }, (_, n) => add(fresh, `Race ${n}.`)));
    expect(raced.filter((r) => r.status === 201)).toHaveLength(1);
    expect(raced.filter((r) => r.status === 409)).toHaveLength(4);
    expect(await ctx.prisma.contextSentence.count({ where: { userId: aId, senseId: fresh } })).toBe(5);
  });

  it('B3#12 (sentences): learner B cannot add to A\'s private sense, delete A\'s sentence or read it (404)', async () => {
    const mine = await privateSense(aId, 'yeet');
    const added = await add(mine, 'A private sentence.');
    expect(added.status).toBe(201);
    const before = await stored();
    const foreignAdd = await add(mine, 'Intruder.', bToken);
    expect(foreignAdd.status).toBe(404);
    expect(foreignAdd.body.type).toBe(problem('not-found'));
    const foreignDelete = await remove(added.body.id, bToken);
    expect(foreignDelete.status).toBe(404);
    expect(await stored()).toEqual(before);
    expect((await content.listSentences(bId, [mine])).get(mine) ?? []).toEqual([]);
    // An unpublished catalog sense or an unknown id is not visible either.
    const draft = await catalogSense('draft', false);
    expect((await add(draft, 'Not yet.')).status).toBe(404);
    expect((await add(randomUUID(), 'Nobody.')).status).toBe(404);
    // The owner deletes: 204, then 404.
    expect((await remove(added.body.id)).status).toBe(204);
    expect((await remove(added.body.id)).status).toBe(404);
    expect(await ctx.prisma.contextSentence.count()).toBe(0);
  });

  it('SR10: a sentinel sentence never appears in any log entry of add, list or delete', async () => {
    const bank = await catalogSense('bank');
    const sentinel = `SENTINEL-${randomUUID()}`;
    ctx.logs.length = 0;
    const added = await add(bank, `The ${sentinel} sentence.`);
    expect(added.status).toBe(201);
    await content.listSentences(aId, [bank]);
    expect((await remove(added.body.id)).status).toBe(204);
    // Control: add and delete were logged, so an absent sentinel means the text was never written.
    expect(ctx.logs.map(({ event }) => event)).toEqual(expect.arrayContaining(['context_sentence_added', 'context_sentence_deleted']));
    expect(JSON.stringify(ctx.logs)).not.toContain(sentinel);
  });

  it('Review Focus 3: 300 code points accepted, 301 refused, whitespace-only refused, NFD stored NFC', async () => {
    const bank = await catalogSense('bank');
    const exactly300 = `${'a'.repeat(299)}😀`;
    expect((await add(bank, exactly300)).status).toBe(201);
    const tooLong = await add(bank, `${exactly300}b`);
    expect(tooLong.status).toBe(400);
    expect(tooLong.body.type).toBe(problem('validation-failed'));
    expect((await add(bank, ' \n ')).status).toBe(400);
    const nfd = await add(bank, 'café');
    expect((await ctx.prisma.contextSentence.findUniqueOrThrow({ where: { id: nfd.body.id } })).text).toBe('café');
    const noKey = await ctx.http().post(`/v1/senses/${bank}/sentences`).set('Authorization', `Bearer ${aToken}`).send({ text: 'x' });
    expect(noKey.status).toBe(400);
  });

  it('L5: the owner cannot add a sentence to their own retired private sense (the shared visibility rule)', async () => {
    const mine = await privateSense(aId, 'skrrt');
    await ctx.prisma.sense.update({ where: { id: mine }, data: { state: 'retired' } });
    expect((await content.visibleSenseIds(aId, [mine])).has(mine)).toBe(false);
    const res = await add(mine, 'Stray.');
    expect(res.status).toBe(404);
    expect(await ctx.prisma.contextSentence.count()).toBe(0);
  });

  it('T-A6 (SR10): a sentinel sentence in refused adds (limit reached, not visible, too long) never reaches a log entry', async () => {
    const bank = await catalogSense('bank');
    for (let n = 1; n <= 5; n++) await add(bank, `Filler ${n}.`);
    const sentinel = `SENTINEL-${randomUUID()}`;
    ctx.logs.length = 0;
    expect((await add(bank, `Over the limit ${sentinel}.`)).status).toBe(409);
    expect((await add(randomUUID(), `Not visible ${sentinel}.`)).status).toBe(404);
    expect((await add(bank, `${sentinel}${'x'.repeat(300)}`)).status).toBe(400);
    // Control: a successful add on another sense in the same window is logged, so logging was on.
    expect((await add(await catalogSense('river'), 'A plain sentence.')).status).toBe(201);
    expect(ctx.logs.map(({ event }) => event)).toContain('context_sentence_added');
    expect(JSON.stringify(ctx.logs)).not.toContain(sentinel);
  });

  it('deletePrivateEntryContent removes that entry\'s sentences', async () => {
    const mine = await privateSense(aId, 'yeet');
    const bank = await catalogSense('bank');
    await add(mine, 'Private one.');
    await add(bank, 'Catalog one.');
    const entryId = (await ctx.prisma.sense.findUniqueOrThrow({ where: { id: mine } })).entryId;
    await tx((t) => content.deletePrivateEntryContent(t, aId, entryId));
    expect((await stored()).map(({ text }) => text)).toEqual(['Catalog one.']);
  });
});
