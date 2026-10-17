import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ContentService, type RevisionContent } from '../../src/content/index.js';
import type { Prisma } from '../../src/generated/prisma/client.js';
import { seedUser, startSession } from '../support/auth-helpers.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';
import { resetCatalog } from '../support/reset-catalog.js';
import { seedVisibleSenses } from '../support/seed-senses.js';
import { testConfig } from '../support/test-config.js';

const transactionOptions = { timeout: 30_000, maxWait: 5_000 };
const problem = (slug: string) => `https://api.example.com/problems/${slug}`;
const date = (value: string) => new Date(`${value}T00:00:00Z`);
const now = new Date('2026-11-08T03:00:00Z'); // 10:00 on 2026-11-08 in Asia/Ho_Chi_Minh
const complete: RevisionContent = {
  glossVi: 'triển khai', definitionEn: null, examplesEn: ['We deploy on Friday.'], topicCodes: ['technology'], acceptedForms: [],
};

describe('quick add and private word deletion (e2e, isolated database)', () => {
  let ctx: TestApp;
  let content: ContentService;
  let prefix = 0;

  const tx = <T>(action: (t: Prisma.TransactionClient) => Promise<T>) => ctx.prisma.$transaction(action, transactionOptions);
  const learner = async () => {
    const { userId } = await seedUser(ctx.prisma, { verified: true, nativeLanguage: 'vi' });
    const token = (await startSession(ctx, userId)).accessToken;
    const group = async (name = 'Inbox') => (await ctx.prisma.learningGroup.create({
      data: { userId, name, nameKey: name.toLowerCase(), createdAt: now, updatedAt: now },
    })).id;
    return { userId, token, group };
  };
  const quickAdd = (token: string, body: object, key: string = randomUUID()) => ctx.http().post('/v1/quick-add')
    .set('Authorization', `Bearer ${token}`).set('Idempotency-Key', key).send(body);
  const deleteWord = (token: string, entryId: string) => ctx.http().delete(`/v1/my-words/${entryId}`)
    .set('Authorization', `Bearer ${token}`).set('Idempotency-Key', randomUUID());
  const catalogSense = async () => (await seedVisibleSenses(ctx.prisma, 1, `q${(prefix += 1)}`))[0];
  const privateEntries = (userId: string) => ctx.prisma.entry.findMany({ where: { scope: 'private', ownerUserId: userId } });
  const stored = async (userId: string) => ({
    entries: await privateEntries(userId),
    items: await ctx.prisma.learningItem.findMany({ where: { userId } }),
    links: await ctx.prisma.groupItem.count({ where: { item: { userId } } }),
    sentences: await ctx.prisma.contextSentence.findMany({ where: { userId } }),
    log: await ctx.prisma.learningLogEntry.count({ where: { userId } }),
  });

  beforeAll(async () => {
    const config = testConfig();
    config.limits['user.write'].max = 10_000;
    ctx = await createTestApp({ databaseUrl: await createIsolatedDatabase(), config });
    content = ctx.app.get(ContentService);
  });
  beforeEach(async () => {
    await ctx.prisma.learningLogEntry.deleteMany();
    await ctx.prisma.learningItem.deleteMany();
    await ctx.prisma.learningGroup.deleteMany();
    await ctx.prisma.contextSentence.deleteMany();
    await resetCatalog(ctx.prisma);
    await ctx.prisma.rateLimitCounter.deleteMany();
    await ctx.prisma.idempotencyKey.deleteMany();
    await ctx.prisma.user.deleteMany();
    ctx.clock.set(now);
  });
  afterAll(async () => { await ctx?.close(); });

  it('B3#8: quick add of a catalog sense creates no private word and saves item and sentence', async () => {
    const me = await learner();
    const group = await me.group();
    const senseId = await catalogSense();
    const response = await quickAdd(me.token, { group_id: group, sense_id: senseId, sentence: '  I saw it at work.  ' });
    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      item_id: expect.any(String), sense_id: senseId, created_item: true, created_word: false, sentence_id: expect.any(String),
    });
    const after = await stored(me.userId);
    expect(after.entries).toEqual([]);
    expect(after.items).toEqual([expect.objectContaining({ id: response.body.item_id, senseId, level: 0, dueDate: date('2026-11-08') })]);
    expect(after.links).toBe(1);
    expect(after.sentences).toEqual([expect.objectContaining({ id: response.body.sentence_id, senseId, text: 'I saw it at work.' })]);
  });

  it('B3#9 / B3E11: quick add with new_word creates word, sentence, item and link together; a sixth sentence on an existing word makes the whole request fail with nothing stored; the same Idempotency-Key replays without a duplicate', async () => {
    const me = await learner();
    const group = await me.group();
    const key = randomUUID();
    const body = { group_id: group, new_word: { lemma: 'yeet', pos: 'verb', meaning: 'ném mạnh', level: 'B1' }, sentence: 'He yeeted it.' };
    const first = await quickAdd(me.token, body, key);
    expect(first.status).toBe(201);
    expect(first.body).toEqual({
      item_id: expect.any(String), sense_id: expect.any(String), created_item: true, created_word: true, sentence_id: expect.any(String),
    });
    const replay = await quickAdd(me.token, body, key);
    expect(replay.status).toBe(201);
    expect(replay.body).toEqual(first.body);
    const after = await stored(me.userId);
    expect(after.entries).toEqual([expect.objectContaining({ lemma: 'yeet', pos: 'verb' })]);
    expect(after.items).toEqual([expect.objectContaining({ senseId: first.body.sense_id })]);
    expect(after.links).toBe(1);
    expect(after.sentences).toHaveLength(1);

    // A catalog sense with five sentences already, not learnt yet: the sixth fails the whole request.
    const busy = await catalogSense();
    for (let i = 1; i <= 5; i += 1) {
      await tx((t) => content.addSentence(t, { userId: me.userId, senseId: busy, text: `Sentence ${i}.` }));
    }
    const before = await stored(me.userId);
    const refused = await quickAdd(me.token, { group_id: group, sense_id: busy, sentence: 'One too many.' });
    expect(refused.status).toBe(409);
    expect(refused.body.type).toBe(problem('sentence-limit-reached'));
    expect(await stored(me.userId)).toEqual(before);

    // A new word into a full group: the private word is not kept either.
    const full = await me.group('Full');
    const fillers = await ctx.prisma.learningItem.createManyAndReturn({ data: Array.from({ length: 2000 }, () => ({
      userId: me.userId, senseId: randomUUID(), level: 0, dueDate: date('2026-11-08'), createdAt: now,
    })) });
    await ctx.prisma.groupItem.createMany({ data: fillers.map((item) => ({ groupId: full, itemId: item.id, addedAt: now })) });
    const beforeFull = await privateEntries(me.userId);
    const fullRefused = await quickAdd(me.token, { group_id: full, new_word: { lemma: 'skrrt', meaning: 'phanh gấp' } });
    expect(fullRefused.status).toBe(409);
    expect(fullRefused.body.type).toBe(problem('group-full'));
    expect(await privateEntries(me.userId)).toEqual(beforeFull);
  });

  it('already learning → no new item, the sentence is saved', async () => {
    const me = await learner();
    const [a, b] = [await me.group('A'), await me.group('B')];
    const senseId = await catalogSense();
    const first = await quickAdd(me.token, { group_id: a, sense_id: senseId });
    expect(first.body).toMatchObject({ created_item: true, sentence_id: null });
    const again = await quickAdd(me.token, { group_id: b, sense_id: senseId, sentence: 'Seen again.' });
    expect(again.status).toBe(201);
    expect(again.body).toEqual({
      item_id: first.body.item_id, sense_id: senseId, created_item: false, created_word: false, sentence_id: expect.any(String),
    });
    const after = await stored(me.userId);
    expect(after.items).toHaveLength(1);
    expect(after.links).toBe(2);
    expect(after.sentences.map(({ text }) => text)).toEqual(['Seen again.']);
  });

  it('T-A3 (B3E12 over HTTP): at 1,000 private words a new word is 409 private-word-limit-reached with nothing stored, a catalog sense still adds; two requests at 999 leave exactly 1,000', async () => {
    const me = await learner();
    const group = await me.group();
    await ctx.prisma.$executeRaw`
      INSERT INTO entries (language, lemma, pos, scope, owner_user_id)
      SELECT 'en', 'seeded-' || n, 'noun', 'private', ${me.userId}::uuid FROM generate_series(1, 1000) AS n`;
    const before = await stored(me.userId);
    const refused = await quickAdd(me.token, { group_id: group, new_word: { lemma: 'one-more', meaning: 'thêm một' } });
    expect(refused.status).toBe(409);
    expect(refused.body.type).toBe(problem('private-word-limit-reached'));
    expect(await stored(me.userId)).toEqual(before);
    expect((await quickAdd(me.token, { group_id: group, sense_id: await catalogSense() })).status).toBe(201);

    const racer = await learner();
    const racerGroup = await racer.group();
    await ctx.prisma.$executeRaw`
      INSERT INTO entries (language, lemma, pos, scope, owner_user_id)
      SELECT 'en', 'seeded-' || n, 'noun', 'private', ${racer.userId}::uuid FROM generate_series(1, 999) AS n`;
    const results = await Promise.all(['first', 'second'].map((lemma) =>
      quickAdd(racer.token, { group_id: racerGroup, new_word: { lemma, meaning: `nghĩa ${lemma}` } })));
    expect(results.map(({ status }) => status).sort()).toEqual([201, 409]);
    expect(await ctx.prisma.entry.count({ where: { scope: 'private', ownerUserId: racer.userId } })).toBe(1_000);
  });

  it('T-A4: new_word with form_of naming another learner\'s private entry → 404 and nothing stored', async () => {
    const other = await learner();
    const theirs = await tx((t) => content.createPrivateSense(t, { ownerId: other.userId, lemma: 'yeet', pos: 'verb',
      meaning: { text: 'riêng', language: 'vi' }, level: null, topicCodes: [], formOf: null }));
    const me = await learner();
    const group = await me.group();
    const before = await stored(me.userId);
    const response = await quickAdd(me.token, { group_id: group, new_word: {
      lemma: 'yeeted', pos: 'verb', meaning: 'đã ném', form_of: { entry_id: theirs.entryId, kind: 'past' } } });
    expect(response.status).toBe(404);
    expect(response.body.type).toBe(problem('not-found'));
    expect(await stored(me.userId)).toEqual(before);
  });

  it('B3E14: new_word with form_of deploy/past stores the link', async () => {
    const actorId = (await seedUser(ctx.prisma, { verified: true, staffRole: 'editor' })).userId;
    const deploy = await tx(async (t) => {
      await content.lockEntryKey(t, 'deploy', 'verb');
      const { entry } = await content.ensureEntry(t, { lemma: 'deploy', pos: 'verb', variants: [] });
      await content.setEditorialLevel(t, entry.id, 'B1');
      const { senseId } = await content.createSense(t, { entryId: entry.id, contextLabel: null, content: complete, source: 'ui', actorId });
      return { entryId: entry.id, senseId };
    });
    expect(await content.publishItem({ senseId: deploy.senseId, revision: 1 }, actorId)).toEqual({ outcome: 'published' });
    const me = await learner();
    const response = await quickAdd(me.token, { group_id: await me.group(), new_word: {
      lemma: 'deployed', pos: 'verb', meaning: 'đã triển khai', form_of: { entry_id: deploy.entryId, kind: 'past' },
    } });
    expect(response.status).toBe(201);
    const sense = await ctx.prisma.sense.findUniqueOrThrow({ where: { id: response.body.sense_id }, include: { revisions: true } });
    expect(sense.revisions).toEqual([expect.objectContaining({ formOfEntryId: deploy.entryId, formKind: 'past' })]);
  });

  it('B3E17: DELETE /v1/my-words/:id removes entry, senses, sentences, items, links and their log rows in one transaction; another learner → 404', async () => {
    const me = await learner();
    const [a, b] = [await me.group('A'), await me.group('B')];
    const added = await quickAdd(me.token, { group_id: a, new_word: { lemma: 'yeet', meaning: 'ném' }, sentence: 'Yeet!' });
    await quickAdd(me.token, { group_id: b, sense_id: added.body.sense_id });
    const keep = await quickAdd(me.token, { group_id: a, sense_id: await catalogSense(), sentence: 'Kept.' });
    await ctx.http().post('/v1/reviews').set('Authorization', `Bearer ${me.token}`)
      .send({ item_id: added.body.item_id, group_id: a, answer: 'known', review_id: randomUUID() });
    const [entry] = await privateEntries(me.userId);

    const stranger = await learner();
    const refused = await deleteWord(stranger.token, entry.id);
    expect(refused.status).toBe(404);
    expect(refused.body.type).toBe(problem('not-found'));
    expect(await privateEntries(me.userId)).toHaveLength(1);

    const response = await deleteWord(me.token, entry.id);
    expect(response.status).toBe(204);
    const after = await stored(me.userId);
    expect(after.entries).toEqual([]);
    expect(await ctx.prisma.sense.count({ where: { id: added.body.sense_id } })).toBe(0);
    expect(after.items.map(({ id }) => id)).toEqual([keep.body.item_id]);
    expect(after.links).toBe(1);
    expect(after.sentences.map(({ text }) => text)).toEqual(['Kept.']);
    expect(await ctx.prisma.learningLogEntry.count({ where: { senseId: added.body.sense_id } })).toBe(0);
    expect(after.log).toBe(1); // the catalog word's item_added stays
    expect((await deleteWord(me.token, entry.id)).status).toBe(404);
  });

  it('B3#12 (quick add): a sense_id of another learner\'s private sense → 404, nothing stored', async () => {
    const owner = await learner();
    const theirs = await quickAdd(owner.token, { group_id: await owner.group(), new_word: { lemma: 'yote', meaning: 'của tôi' } });
    const me = await learner();
    const group = await me.group();
    for (const senseId of [theirs.body.sense_id, randomUUID()]) {
      const refused = await quickAdd(me.token, { group_id: group, sense_id: senseId, sentence: 'Peek.' });
      expect(refused.status).toBe(404);
      expect(refused.body.type).toBe(problem('not-found'));
    }
    const stranger = await learner();
    expect((await quickAdd(me.token, { group_id: await stranger.group(), sense_id: await catalogSense() })).status).toBe(404);
    expect(await stored(me.userId)).toEqual({ entries: [], items: [], links: 0, sentences: [], log: 0 });
  });

  it('D43: group_id is required and exactly one of sense_id / new_word is sent; otherwise 400 and nothing stored', async () => {
    const me = await learner();
    const group = await me.group();
    const senseId = await catalogSense();
    for (const body of [
      { sense_id: senseId }, { group_id: group }, { group_id: group, sense_id: senseId, new_word: { lemma: 'x', meaning: 'y' } },
      { group_id: group, new_word: { lemma: '', meaning: 'y' } }, { group_id: group, new_word: { lemma: 'x', meaning: 'm'.repeat(301) } },
      { group_id: group, sense_id: senseId, sentence: 's'.repeat(301) },
    ]) {
      const response = await quickAdd(me.token, body);
      expect(response.status).toBe(400);
      expect(response.body.type).toBe(problem('validation-failed'));
    }
    expect(await stored(me.userId)).toEqual({ entries: [], items: [], links: 0, sentences: [], log: 0 });
  });
});
