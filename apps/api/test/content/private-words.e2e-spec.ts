import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  ContentService, PRIVATE_WORDS_MAX, type InflectionKind, type Level, type Meaning, type RevisionContent,
} from '../../src/content/index.js';
import type { Prisma } from '../../src/generated/prisma/client.js';
import { seedUser, startSession } from '../support/auth-helpers.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';
import { resetCatalog } from '../support/reset-catalog.js';
import { testConfig } from '../support/test-config.js';

const transactionOptions = { timeout: 30_000, maxWait: 5_000 };
const problem = (slug: string) => `https://api.example.com/problems/${slug}`;
const complete: RevisionContent = {
  glossVi: 'triển khai', definitionEn: null, examplesEn: ['We deploy on Friday.'], topicCodes: ['business'], acceptedForms: [],
};
type CreateInput = {
  lemma: string; pos?: string | null; meaning?: Meaning; level?: Level | null; topicCodes?: string[];
  formOf?: { entryId: string; kind: InflectionKind } | null;
};

describe('private words (e2e, isolated database)', () => {
  let ctx: TestApp;
  let content: ContentService;
  let actorId: string;
  let viId: string;
  let viToken: string;
  let otherId: string;
  let otherToken: string;
  let enId: string;

  const tx = <T>(action: (tx: Prisma.TransactionClient) => Promise<T>) => ctx.prisma.$transaction(action, transactionOptions);
  const create = (ownerId: string, input: CreateInput) => tx((t) => content.createPrivateSense(t, {
    ownerId, lemma: input.lemma, pos: input.pos === undefined ? 'verb' : input.pos,
    meaning: input.meaning ?? { text: 'nghĩa riêng', language: 'vi' }, level: input.level ?? null,
    topicCodes: input.topicCodes ?? [], formOf: input.formOf ?? null,
  }));
  const catalog = async (lemma: string, pos: string, level: Level | null = 'A1', publish = true) => {
    const ids = await tx(async (t) => {
      await content.lockEntryKey(t, lemma, pos);
      const { entry } = await content.ensureEntry(t, { lemma, pos, variants: [] });
      if (level) await content.setEditorialLevel(t, entry.id, level);
      const sense = await content.createSense(t, { entryId: entry.id, contextLabel: null, content: complete, source: 'ui', actorId });
      return { entryId: entry.id, senseId: sense.senseId };
    });
    if (publish) expect(await content.publishItem({ senseId: ids.senseId, revision: 1 }, actorId)).toEqual({ outcome: 'published' });
    return ids;
  };
  const readEntry = (id: string) => ctx.prisma.entry.findUniqueOrThrow({ where: { id }, include: {
    levels: true, senses: { orderBy: { createdAt: 'asc' }, include: {
      revisions: { orderBy: { revisionNo: 'asc' }, include: { texts: true } } } } } });
  const patch = (id: string, body: object, token = viToken) => ctx.http().patch(`/v1/my-words/${id}`)
    .set('Authorization', `Bearer ${token}`).set('Idempotency-Key', randomUUID()).send(body);

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
    viId = (await seedUser(ctx.prisma, { nativeLanguage: 'vi' })).userId;
    viToken = (await startSession(ctx, viId)).accessToken;
    otherId = (await seedUser(ctx.prisma, { nativeLanguage: 'vi' })).userId;
    otherToken = (await startSession(ctx, otherId)).accessToken;
    enId = (await seedUser(ctx.prisma, { nativeLanguage: 'en' })).userId;
  });
  afterAll(async () => { await ctx?.close(); });

  it('creates a private entry with a live user revision, a user level and no catalog trace', async () => {
    const result = await create(viId, { lemma: 'yeet', level: 'B1', topicCodes: ['business'] });
    expect(result).toMatchObject({ createdEntry: true, catalogMatch: null });
    const entry = await readEntry(result.entryId);
    expect(entry).toMatchObject({ scope: 'private', ownerUserId: viId, lemma: 'yeet', pos: 'verb',
      levels: [expect.objectContaining({ level: 'B1', basis: 'user' })] });
    expect(entry.senses).toEqual([expect.objectContaining({ id: result.senseId, state: 'open', contextLabel: null,
      liveRevisionId: entry.senses[0].revisions[0].id })]);
    expect(entry.senses[0].revisions).toEqual([expect.objectContaining({ revisionNo: 1, status: 'published', draftSource: 'user',
      createdBy: viId, publishedAt: ctx.clock.now(), topicCodes: ['business'],
      texts: [expect.objectContaining({ language: 'vi', kind: 'gloss', text: 'nghĩa riêng' })] })]);
    expect((await ctx.http().get('/v1/admin/content/entries').set('Authorization', `Bearer ${(await startSession(ctx, actorId)).accessToken}`)).body.items).toEqual([]);
  });

  it('B3E12: with 1,000 private entries seeded, the next create is 409 private-word-limit-reached and adding a catalog sense still works', async () => {
    expect(PRIVATE_WORDS_MAX).toBe(1_000);
    await ctx.prisma.$executeRaw`
      INSERT INTO entries (language, lemma, pos, scope, owner_user_id)
      SELECT 'en', 'seeded-' || n, 'noun', 'private', ${viId}::uuid FROM generate_series(1, 1000) AS n`;
    const before = await ctx.prisma.entry.count();
    await expect(create(viId, { lemma: 'one-more' })).rejects.toMatchObject({ code: 'private-word-limit-reached' });
    expect(await ctx.prisma.entry.count()).toBe(before);
    // A new meaning for an existing private word is a sense, not an entry: still allowed at the limit.
    await expect(create(viId, { lemma: 'seeded-1', pos: 'noun', meaning: { text: 'thêm nghĩa', language: 'vi' } }))
      .resolves.toMatchObject({ createdEntry: false });
    // Catalog senses are untouched by the private limit, and another learner is independent.
    await catalog('deploy', 'verb');
    await expect(create(otherId, { lemma: 'one-more' })).resolves.toMatchObject({ createdEntry: true });
  });

  it('CR13: creating deploy/verb privately next to the catalog deploy/verb is allowed and returns catalogMatch', async () => {
    const catalogDeploy = await catalog('deploy', 'verb');
    const result = await create(viId, { lemma: 'deploy', pos: 'verb' });
    expect(result).toMatchObject({ createdEntry: true, catalogMatch: { entryId: catalogDeploy.entryId } });
    expect(result.entryId).not.toBe(catalogDeploy.entryId);
    expect(await create(viId, { lemma: 'nothing-like-it' })).toMatchObject({ catalogMatch: null });
  });

  it('meaning language: a vi learner\'s meaning is stored as gloss vi, an en learner\'s as definition en', async () => {
    const vi = await create(viId, { lemma: 'yeet', meaning: { text: 'ném mạnh', language: 'vi' } });
    const en = await create(enId, { lemma: 'yeet', meaning: { text: 'To throw hard.', language: 'en' } });
    expect((await readEntry(vi.entryId)).senses[0].revisions[0].texts).toEqual([
      expect.objectContaining({ language: 'vi', kind: 'gloss', text: 'ném mạnh' })]);
    expect((await readEntry(en.entryId)).senses[0].revisions[0].texts).toEqual([
      expect.objectContaining({ language: 'en', kind: 'definition', text: 'To throw hard.' })]);
  });

  it('a second meaning for one private lemma/pos becomes a second sense of the same entry; no pos is stored as unspecified', async () => {
    const first = await create(viId, { lemma: 'yeet' });
    const second = await create(viId, { lemma: 'yeet', meaning: { text: 'nghĩa thứ hai', language: 'vi' } });
    const third = await create(viId, { lemma: 'yeet', meaning: { text: 'nghĩa thứ ba', language: 'vi' } });
    expect(second).toMatchObject({ entryId: first.entryId, createdEntry: false });
    expect((await readEntry(first.entryId)).senses.map(({ id, contextLabel }) => ({ id, contextLabel }))).toEqual([
      { id: first.senseId, contextLabel: null }, { id: second.senseId, contextLabel: 'p2' }, { id: third.senseId, contextLabel: 'p3' }]);
    const noPos = await create(viId, { lemma: 'yeet', pos: null });
    expect(noPos.entryId).not.toBe(first.entryId);
    expect(await readEntry(noPos.entryId)).toMatchObject({ pos: 'unspecified' });
    await expect(ctx.prisma.$executeRaw`
      INSERT INTO entries (language, lemma, pos) VALUES ('en', 'catalog-unspecified', 'unspecified')`).rejects.toThrow(/entries_pos_check/);
  });

  it('PATCH changes the meaning through a new live revision; PATCH by another learner → 404', async () => {
    const word = await create(viId, { lemma: 'yeet', level: 'A2', topicCodes: ['business'] });
    const res = await patch(word.entryId, { senses: [{ sense_id: word.senseId, meaning: 'nghĩa mới' }], level: 'B2', topics: ['food'] });
    expect(res.status).toBe(204);
    const entry = await readEntry(word.entryId);
    expect(entry.levels).toEqual([expect.objectContaining({ level: 'B2', basis: 'user' })]);
    const [old, current] = entry.senses[0].revisions;
    expect(old.status).toBe('superseded');
    expect(current).toMatchObject({ revisionNo: 2, status: 'published', draftSource: 'user', topicCodes: ['food'],
      texts: [expect.objectContaining({ language: 'vi', kind: 'gloss', text: 'nghĩa mới' })] });
    expect(entry.senses[0].liveRevisionId).toBe(current.id);
    const before = await readEntry(word.entryId);
    const foreign = await patch(word.entryId, { lemma: 'stolen' }, otherToken);
    expect(foreign.status).toBe(404);
    expect(foreign.body.type).toBe(problem('not-found'));
    expect(await readEntry(word.entryId)).toEqual(before);
    const catalogDeploy = await catalog('deploy', 'verb');
    expect((await patch(catalogDeploy.entryId, { lemma: 'hijack' })).status).toBe(404);
    expect((await patch(word.entryId, { senses: [{ sense_id: catalogDeploy.senseId, meaning: 'x' }] })).status).toBe(404);
  });

  it('PATCH renames a word, and a lemma/pos clash with another of the owner\'s words is 409 private-word-exists', async () => {
    const yeet = await create(viId, { lemma: 'yeet' });
    const yote = await create(viId, { lemma: 'yote' });
    const clash = await patch(yote.entryId, { lemma: 'yeet' });
    expect(clash.status).toBe(409);
    expect(clash.body.type).toBe(problem('private-word-exists'));
    expect(await readEntry(yote.entryId)).toMatchObject({ lemma: 'yote' });
    expect((await patch(yote.entryId, { lemma: 'yoted', pos: 'noun' })).status).toBe(204);
    expect(await readEntry(yote.entryId)).toMatchObject({ lemma: 'yoted', pos: 'noun' });
    expect((await patch(yeet.entryId, { pos: null })).status).toBe(204);
    expect(await readEntry(yeet.entryId)).toMatchObject({ pos: 'unspecified' });
  });

  it('PATCH requires Idempotency-Key, a profile and valid input', async () => {
    const word = await create(viId, { lemma: 'yeet' });
    const noKey = await ctx.http().patch(`/v1/my-words/${word.entryId}`).set('Authorization', `Bearer ${viToken}`).send({ lemma: 'x' });
    expect(noKey.status).toBe(400);
    for (const body of [{}, { lemma: '' }, { lemma: 'a'.repeat(101) }, { level: 'Z9' }, { topics: ['no-such-topic'] }, { extra: 1 }]) {
      const res = await patch(word.entryId, body);
      expect(res.status).toBe(400);
    }
    const incomplete = (await seedUser(ctx.prisma, { verified: true })).userId;
    const res = await patch(word.entryId, { lemma: 'x' }, (await startSession(ctx, incomplete)).accessToken);
    expect(res.status).toBe(403);
    expect(res.body.type).toBe(problem('profile-incomplete'));
  });

  it('Review Focus 3: 300 code points (emoji counted once) accepted, 301 → 400, whitespace-only → 400, NFD input stored NFC', async () => {
    const word = await create(viId, { lemma: 'yeet' });
    const exactly300 = `${'a'.repeat(299)}😀`;
    expect([...exactly300]).toHaveLength(300);
    expect((await patch(word.entryId, { senses: [{ sense_id: word.senseId, meaning: `  ${exactly300}  ` }] })).status).toBe(204);
    expect((await patch(word.entryId, { senses: [{ sense_id: word.senseId, meaning: `${exactly300}b` }] })).status).toBe(400);
    expect((await patch(word.entryId, { senses: [{ sense_id: word.senseId, meaning: ' \t ' }] })).status).toBe(400);
    const nfd = 'nghĩa'; // ĩ as i + combining tilde
    expect((await patch(word.entryId, { senses: [{ sense_id: word.senseId, meaning: nfd }], lemma: 'café' })).status).toBe(204);
    const entry = await readEntry(word.entryId);
    expect(entry.lemma).toBe('café');
    expect(entry.senses[0].revisions.at(-1)!.texts[0].text).toBe('nghĩa');
    await expect(create(viId, { lemma: 'x', meaning: { text: `${exactly300}b`, language: 'vi' } })).rejects.toMatchObject({ code: 'validation-failed' });
    await expect(create(viId, { lemma: ' ', meaning: { text: 'ok', language: 'vi' } })).rejects.toMatchObject({ code: 'validation-failed' });
    await expect(create(viId, { lemma: 'x', meaning: { text: '  ', language: 'vi' } })).rejects.toMatchObject({ code: 'validation-failed' });
  });

  it('T-A7: a 100-code-point lemma with an emoji is accepted (101 refused); a meaning over 300 code points in NFD but 300 after NFC is accepted', async () => {
    const word = await create(viId, { lemma: 'yeet' });
    const lemma100 = `${'a'.repeat(99)}😀`;
    expect([...lemma100]).toHaveLength(100);
    expect((await patch(word.entryId, { lemma: lemma100 })).status).toBe(204);
    expect((await readEntry(word.entryId)).lemma).toBe(lemma100);
    expect((await patch(word.entryId, { lemma: `${lemma100}b` })).status).toBe(400);
    const nfd = 'é'.repeat(150); // 300 code points in NFD, 150 é after NFC
    expect([...nfd]).toHaveLength(300);
    const longNfd = `${nfd}${'a'.repeat(150)}`; // 450 code points in NFD, 300 after NFC
    expect((await patch(word.entryId, { senses: [{ sense_id: word.senseId, meaning: longNfd }] })).status).toBe(204);
    const text = (await readEntry(word.entryId)).senses[0].revisions.at(-1)!.texts[0].text;
    expect([...text]).toHaveLength(300);
    expect(text).toBe(longNfd.normalize('NFC'));
  });

  it('L7: deleting the base entry clears both form_of_entry_id and form_kind of the revisions that pointed to it', async () => {
    const base = await create(viId, { lemma: 'yeet' });
    const form = await create(viId, { lemma: 'yote', formOf: { entryId: base.entryId, kind: 'past' } });
    await tx((t) => content.deletePrivateEntryContent(t, viId, base.entryId));
    expect(await ctx.prisma.senseRevision.findMany({ where: { senseId: form.senseId }, select: { formOfEntryId: true, formKind: true } }))
      .toEqual([{ formOfEntryId: null, formKind: null }]);
  });

  it('T-A5: PATCH naming another learner\'s sense_id is 404 and changes nothing on either side', async () => {
    const mineWord = await create(viId, { lemma: 'yeet' });
    const theirs = await create(otherId, { lemma: 'yote' });
    const before = await Promise.all([readEntry(mineWord.entryId), readEntry(theirs.entryId)]);
    const res = await patch(mineWord.entryId, { senses: [{ sense_id: theirs.senseId, meaning: 'cướp' }] });
    expect(res.status).toBe(404);
    expect(res.body.type).toBe(problem('not-found'));
    expect(await Promise.all([readEntry(mineWord.entryId), readEntry(theirs.entryId)])).toEqual(before);
  });

  it('a private word with form_of and no level gets a derived level equal to the base entry\'s', async () => {
    const go = await catalog('go', 'verb', 'A1');
    const went = await create(viId, { lemma: 'wented', formOf: { entryId: go.entryId, kind: 'past' } });
    const entry = await readEntry(went.entryId);
    expect(entry.levels).toEqual([expect.objectContaining({ level: 'A1', basis: 'derived' })]);
    expect(entry.senses[0].revisions[0]).toMatchObject({ formOfEntryId: go.entryId, formKind: 'past' });
    // An explicit level wins over the derived one.
    const leveled = await create(viId, { lemma: 'goed', level: 'C1', formOf: { entryId: go.entryId, kind: 'past' } });
    expect((await readEntry(leveled.entryId)).levels).toEqual([expect.objectContaining({ level: 'C1', basis: 'user' })]);
    // A base the learner cannot see is not found.
    const foreign = await create(otherId, { lemma: 'secret' });
    await expect(create(viId, { lemma: 'secreted', formOf: { entryId: foreign.entryId, kind: 'past' } })).rejects.toMatchObject({ code: 'not-found' });
  });

  it('a new private verb gets library forms that only its owner finds through entriesByForm', async () => {
    const yeet = await create(viId, { lemma: 'yeet' });
    expect(await ctx.prisma.entryInflection.findMany({ where: { entryId: yeet.entryId }, orderBy: { position: 'asc' },
      select: { form: true, kind: true, source: true } })).toEqual([
      { form: 'yeets', kind: 'third_person', source: 'library' }, { form: 'yeeting', kind: 'present_participle', source: 'library' },
      { form: 'yeeted', kind: 'past', source: 'library' }, { form: 'yeeted', kind: 'past_participle', source: 'library' }]);
    expect(await content.entriesByForm('yeeted', viId)).toEqual([
      { entryId: yeet.entryId, lemma: 'yeet', pos: 'verb', kind: 'past' }, { entryId: yeet.entryId, lemma: 'yeet', pos: 'verb', kind: 'past_participle' }]);
    expect(await content.entriesByForm('yeeted', otherId)).toEqual([]);
    // A second meaning reuses the entry and its forms; a private adjective or a word without a pos gets none (D46).
    await create(viId, { lemma: 'yeet', meaning: { text: 'thứ hai', language: 'vi' } });
    expect(await ctx.prisma.entryInflection.count({ where: { entryId: yeet.entryId } })).toBe(4);
    const adjective = await create(viId, { lemma: 'yeety', pos: 'adjective' });
    const noPos = await create(viId, { lemma: 'yote', pos: null });
    expect(await ctx.prisma.entryInflection.count({ where: { entryId: { in: [adjective.entryId, noPos.entryId] } } })).toBe(0);
  });

  it('PATCH with a new lemma or pos regenerates the library forms', async () => {
    const word = await create(viId, { lemma: 'yeet' });
    expect((await patch(word.entryId, { lemma: 'blorp', pos: 'noun' })).status).toBe(204);
    expect(await ctx.prisma.entryInflection.findMany({ where: { entryId: word.entryId }, select: { form: true, kind: true } }))
      .toEqual([{ form: 'blorps', kind: 'plural' }]);
  });

  it('deletePrivateEntryContent removes the entry with its senses, revisions, texts, levels and inflections, and refuses another owner', async () => {
    const word = await create(viId, { lemma: 'yeet', level: 'B1' });
    const second = await create(viId, { lemma: 'yeet', meaning: { text: 'thứ hai', language: 'vi' } });
    await tx((t) => content.replaceInflections(t, word.entryId, 'library', [{ form: 'yeeted', kind: 'past' }]));
    await expect(tx((t) => content.deletePrivateEntryContent(t, otherId, word.entryId))).rejects.toMatchObject({ code: 'not-found' });
    const result = await tx((t) => content.deletePrivateEntryContent(t, viId, word.entryId));
    expect(result.senseIds.sort()).toEqual([word.senseId, second.senseId].sort());
    expect(await ctx.prisma.entry.count({ where: { id: word.entryId } })).toBe(0);
    for (const count of [ctx.prisma.sense.count(), ctx.prisma.senseRevision.count(), ctx.prisma.senseRevisionText.count(),
      ctx.prisma.entryLevel.count(), ctx.prisma.entryInflection.count()]) expect(await count).toBe(0);
    const catalogGo = await catalog('go', 'verb');
    await expect(tx((t) => content.deletePrivateEntryContent(t, viId, catalogGo.entryId))).rejects.toMatchObject({ code: 'not-found' });
  });

  it('visibleSenseIds returns catalog published senses and the viewer\'s own private ones, never another learner\'s', async () => {
    const published = await catalog('deploy', 'verb');
    const draft = await catalog('draft', 'noun', 'A1', false);
    const mine = await create(viId, { lemma: 'yeet' });
    const theirs = await create(otherId, { lemma: 'yote' });
    const unpublished = await catalog('hidden', 'noun');
    await content.unpublish([unpublished.senseId]);
    const visible = await content.visibleSenseIds(viId, [published.senseId, draft.senseId, mine.senseId, theirs.senseId, unpublished.senseId, randomUUID()]);
    expect([...visible].sort()).toEqual([published.senseId, mine.senseId].sort());
  });

  it('bulkCandidates excludes function words, unpublished senses and private entries and reports skippedFunctionWords', async () => {
    const deploy = await catalog('deploy', 'verb', 'A1');
    const bank = await catalog('bank', 'noun', 'A1');
    await catalog('hard', 'adjective', 'B2');
    await catalog('the', 'determiner', 'A1');
    await catalog('of', 'preposition', 'A1');
    await catalog('unready', 'noun', 'A1', false);
    await create(viId, { lemma: 'yeet', level: 'A1', topicCodes: ['business'] });
    expect(await content.bulkCandidates({ level: 'A1' }, 100)).toEqual({ senseIds: [bank.senseId, deploy.senseId], skippedFunctionWords: 2 });
    expect(await content.bulkCandidates({ level: 'A1', pos: 'verb' }, 100)).toEqual({ senseIds: [deploy.senseId], skippedFunctionWords: 0 });
    expect(await content.bulkCandidates({ topic: 'business' }, 1)).toMatchObject({ senseIds: [bank.senseId] });
    expect((await content.bulkCandidates({ topic: 'food' }, 100)).senseIds).toEqual([]);
  });
});
