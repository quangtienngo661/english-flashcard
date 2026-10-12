import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ContentService, contentHash, type RevisionContent } from '../../src/content/index.js';
import type { Prisma } from '../../src/generated/prisma/client.js';
import { seedUser, startSession } from '../support/auth-helpers.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';
import { resetCatalog } from '../support/reset-catalog.js';
import { testConfig } from '../support/test-config.js';

const transactionOptions = { timeout: 10_000, maxWait: 5_000 };
const problem = (slug: string) => `https://api.example.com/problems/${slug}`;
const empty: RevisionContent = { glossVi: null, definitionEn: null, examplesEn: [], topicCodes: [], acceptedForms: [] };

describe('sense authoring (e2e, isolated database)', () => {
  let ctx: TestApp;
  let content: ContentService;
  let actorId: string;
  let token: string;
  const catalog = () => Promise.all([
    ctx.prisma.entry.findMany({ orderBy: { id: 'asc' } }),
    ctx.prisma.sense.findMany({ orderBy: { id: 'asc' } }),
    ctx.prisma.senseRevision.findMany({ orderBy: { id: 'asc' } }),
    ctx.prisma.senseRevisionText.findMany({ orderBy: [{ revisionId: 'asc' }, { language: 'asc' }, { kind: 'asc' }] }),
    ctx.prisma.entryLevel.findMany({ orderBy: { id: 'asc' } }),
  ]);
  const write = <T>(lemma: string, action: (tx: Prisma.TransactionClient) => Promise<T>) =>
    ctx.prisma.$transaction(async (tx) => {
      await content.lockEntryKey(tx, lemma, 'noun');
      return action(tx);
    }, transactionOptions);
  const ensure = async (lemma = 'bank') => (await write(lemma, (tx) => content.ensureEntry(tx, {
    lemma, pos: 'noun', variants: [],
  }))).entry;
  const create = (body: object) => ctx.http().post('/v1/admin/content/senses')
    .set('Authorization', `Bearer ${token}`).send(body);
  const save = (id: string, revision: number, patch: object) => ctx.http().put(`/v1/admin/content/senses/${id}/draft`)
    .set('Authorization', `Bearer ${token}`).send({ revision, content: patch });
  const review = (items: object[]) => ctx.http().post('/v1/admin/content/senses/review')
    .set('Authorization', `Bearer ${token}`).send({ items });
  const readSense = (id: string) => ctx.prisma.sense.findUniqueOrThrow({ where: { id }, include: {
    revisions: { orderBy: { revisionNo: 'asc' }, include: { texts: { orderBy: [{ language: 'asc' }, { kind: 'asc' }] } } },
  } });
  const published = async () => {
    const entry = await ensure();
    const first = await write(entry.lemma, (tx) => content.createSense(tx, {
      entryId: entry.id, contextLabel: null, source: 'ui', actorId,
      content: { glossVi: 'ngân hàng', definitionEn: 'A financial institution.',
        examplesEn: ['I visited the bank.'], topicCodes: ['business'], acceptedForms: ['banks'] },
    }));
    // Task 6 owns publishing. This fixture establishes the persisted published state under the entry lock.
    await write(entry.lemma, async (tx) => {
      await content.setEditorialLevel(tx, entry.id, 'A1');
      await tx.senseRevision.update({ where: { id: first.revisionId }, data: { status: 'published', publishedAt: ctx.clock.now() } });
      await tx.sense.update({ where: { id: first.senseId }, data: { liveRevisionId: first.revisionId } });
    });
    return { entry, ...first };
  };

  beforeAll(async () => {
    const config = testConfig();
    config.limits['user.write'].max = 10_000;
    ctx = await createTestApp({ databaseUrl: await createIsolatedDatabase(), config });
    content = ctx.app.get(ContentService);
  });
  beforeEach(async () => {
    await resetCatalog(ctx.prisma);
    await ctx.prisma.rateLimitCounter.deleteMany();
    await ctx.prisma.user.deleteMany();
    ctx.clock.set(new Date('2026-10-12T12:00:00Z'));
    actorId = (await seedUser(ctx.prisma, { verified: true, staffRole: 'editor' })).userId;
    token = (await startSession(ctx, actorId)).accessToken;
  });
  afterAll(async () => { await ctx?.close(); });

  it('B2#17 (service): a first sense holds the given fields in revision 1 draft even when incomplete for publishing', async () => {
    const entry = await ensure();
    const first = await write(entry.lemma, (tx) => content.createSense(tx, {
      entryId: entry.id, contextLabel: null, content: { glossVi: ' ngân hàng ', acceptedForms: ['BANK', 'Banks', 'banks'] },
      source: 'ui', actorId,
    }));
    const sense = await readSense(first.senseId);
    expect(sense).toMatchObject({ entryId: entry.id, state: 'open', liveRevisionId: null, replacesSenseId: null });
    expect(sense.revisions).toEqual([expect.objectContaining({ id: first.revisionId, revisionNo: 1,
      status: 'draft', draftSource: 'ui', createdBy: actorId, publishedAt: null,
      examples: [], topicCodes: [], acceptedForms: ['Banks'],
      contentHash: contentHash({ ...empty, glossVi: 'ngân hàng', acceptedForms: ['Banks'] }),
      texts: [{ revisionId: first.revisionId, language: 'vi', kind: 'gloss', text: 'ngân hàng' }],
    })]);
    expect(await ctx.prisma.entryLevel.count()).toBe(0);
    expect(await ctx.prisma.sense.count()).toBe(1);
  });

  it('B2#18 (ui): editing a published sense creates the next draft on the same sense and leaves live content unchanged', async () => {
    const first = await published();
    const live = (await readSense(first.senseId)).revisions[0];
    const res = await save(first.senseId, 1, { definition_en: 'An updated definition.', examples_en: ['A new example.'] });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ sense_id: first.senseId, revision: 2, dropped_topics: [] });
    const sense = await readSense(first.senseId);
    expect(sense.liveRevisionId).toBe(first.revisionId);
    expect(sense.revisions[0]).toEqual(live);
    expect(sense.revisions[1]).toMatchObject({ revisionNo: 2, status: 'draft', draftSource: 'ui', createdBy: actorId,
      examples: ['A new example.'], topicCodes: ['business'], acceptedForms: ['banks'], publishedAt: null });
    expect(sense.revisions[1].texts).toEqual(expect.arrayContaining([
      { revisionId: sense.revisions[1].id, language: 'vi', kind: 'gloss', text: 'ngân hàng' },
      { revisionId: sense.revisions[1].id, language: 'en', kind: 'definition', text: 'An updated definition.' },
    ]));
    expect(await ctx.prisma.sense.count()).toBe(1);
  });

  it('B2#20: a different context label coexists with the untouched published sense; duplicate labels are refused without writes', async () => {
    const first = await published();
    const old = await readSense(first.senseId);
    const res = await create({ entry_id: first.entry.id, context_label: ' river ', content: { gloss_vi: 'bờ sông' } });
    expect(res.status).toBe(201);
    expect(await readSense(res.body.sense_id)).toMatchObject({ contextLabel: 'river', entryId: first.entry.id });
    expect(await readSense(first.senseId)).toEqual(old);
    expect(await ctx.prisma.sense.count()).toBe(2);
    const before = await catalog();
    for (const context_label of ['river', null]) {
      const refused = await create({ entry_id: first.entry.id, context_label });
      expect(refused.status).toBe(400);
      expect(refused.body.type).toBe(problem('sense-exists'));
      expect(await catalog()).toEqual(before);
    }
  });

  it('B2E30: whitespace-only context labels normalize to null and share the main-sense uniqueness rule', async () => {
    const entry = await ensure();
    const res = await create({ entry_id: entry.id, context_label: ' \t\n ' });
    expect(res.status).toBe(201);
    expect((await readSense(res.body.sense_id)).contextLabel).toBeNull();
    const before = await catalog();
    const duplicate = await create({ entry_id: entry.id, context_label: '' });
    expect(duplicate.status).toBe(400);
    expect(duplicate.body.type).toBe(problem('sense-exists'));
    expect(await catalog()).toEqual(before);
  });

  it('B2#21: a waiting replacement links the live sense, later drafts edit it and a second waiting replacement is refused', async () => {
    const first = await published();
    const old = await readSense(first.senseId);
    const res = await create({ entry_id: first.entry.id, replaces_sense_id: first.senseId, content: { gloss_vi: 'bờ sông' } });
    expect(res.status).toBe(201);
    const id = res.body.sense_id as string;
    expect(await readSense(id)).toMatchObject({ replacesSenseId: first.senseId, liveRevisionId: null, state: 'open' });
    expect((await save(id, 1, { examples_en: ['We sat by the bank.'] })).body).toEqual({ sense_id: id, revision: 2, dropped_topics: [] });
    expect((await readSense(id)).revisions).toHaveLength(2);
    expect(await ctx.prisma.sense.count()).toBe(2);
    expect(await readSense(first.senseId)).toEqual(old);
    const before = await catalog();
    const refused = await create({ entry_id: first.entry.id, replaces_sense_id: first.senseId });
    expect(refused.status).toBe(400);
    expect(refused.body.type).toBe(problem('replacement-exists'));
    expect(await catalog()).toEqual(before);
    // Establish Task 6's resulting state to check that a published replacement no longer bypasses label uniqueness.
    const replacement = await readSense(id);
    await write(first.entry.lemma, async (tx) => {
      await tx.sense.update({ where: { id: first.senseId }, data: { state: 'retired' } });
      await tx.senseRevision.update({ where: { id: replacement.revisions[1].id }, data: { status: 'published', publishedAt: ctx.clock.now() } });
      await tx.sense.update({ where: { id }, data: { liveRevisionId: replacement.revisions[1].id } });
    });
    const afterReplacement = await catalog();
    const duplicate = await create({ entry_id: first.entry.id });
    expect(duplicate.status).toBe(400);
    expect(duplicate.body.type).toBe(problem('sense-exists'));
    expect(await catalog()).toEqual(afterReplacement);
  });

  it('B2#48: saving over draft and reviewed revisions supersedes the old open revision and creates a draft', async () => {
    const first = await published();
    const live = (await readSense(first.senseId)).revisions[0];
    expect((await save(first.senseId, 1, { gloss_vi: 'nghĩa sửa tay' })).status).toBe(200);
    expect((await save(first.senseId, 2, { examples_en: ['Second draft.'] })).status).toBe(200);
    const marked = await review([{ sense_id: first.senseId, revision: 3, action: 'reviewed' }]);
    expect(marked.status).toBe(200);
    expect(marked.body.items).toEqual([{ sense_id: first.senseId, ok: true }]);
    expect((await readSense(first.senseId)).revisions[2].status).toBe('reviewed');
    expect((await save(first.senseId, 3, { definition_en: 'Latest definition.' })).status).toBe(200);
    const sense = await readSense(first.senseId);
    expect(sense.revisions.map(({ revisionNo, status }) => [revisionNo, status])).toEqual([
      [1, 'published'], [2, 'superseded'], [3, 'superseded'], [4, 'draft'],
    ]);
    expect(sense.revisions[0]).toEqual(live);
    expect(sense.liveRevisionId).toBe(first.revisionId);
    expect(await ctx.prisma.sense.count()).toBe(1);
  });

  it('B2E32: rejecting the only waiting replacement revision retires it, keeps the old sense live and permits a new replacement', async () => {
    const first = await published();
    const old = await readSense(first.senseId);
    const res = await create({ entry_id: first.entry.id, replaces_sense_id: first.senseId });
    const id = res.body.sense_id as string;
    const marked = await review([{ sense_id: id, revision: 1, action: 'rejected' }]);
    expect(marked.status).toBe(200);
    expect(marked.body.items).toEqual([{ sense_id: id, ok: true }]);
    expect(await readSense(id)).toMatchObject({ state: 'retired', liveRevisionId: null, replacesSenseId: first.senseId,
      revisions: [expect.objectContaining({ revisionNo: 1, status: 'rejected', publishedAt: null })] });
    expect(await readSense(first.senseId)).toEqual(old);
    const next = await create({ entry_id: first.entry.id, replaces_sense_id: first.senseId });
    expect(next.status).toBe(201);
    expect(next.body.sense_id).not.toBe(id);
    expect((await readSense(next.body.sense_id)).state).toBe('open');
  });

  it('B2#22 (ui): unknown and archived topic codes return their rule errors and create or save nothing', async () => {
    const first = await published();
    await ctx.prisma.topic.create({ data: { code: 'authoring-archived', archivedAt: ctx.clock.now() } });
    const before = await catalog();
    for (const [topic, code] of [['does-not-exist', 'unknown-topic'], ['authoring-archived', 'topic-archived']]) {
      const requests = [
        () => create({ entry_id: first.entry.id, context_label: topic, content: { topics: [topic] } }),
        () => save(first.senseId, 1, { gloss_vi: 'must not persist', topics: [topic] }),
      ];
      for (const request of requests) {
        const res = await request();
        expect(res.status).toBe(400);
        expect(res.body.type).toBe(problem(code));
        expect(await catalog()).toEqual(before);
      }
    }
  });

  it('B2E20 (ui): an inherited topic archived after publishing is dropped from the new draft and reported, so the edit is not blocked', async () => {
    const first = await published();
    await ctx.prisma.topic.create({ data: { code: 'archived-later' } });
    const withTwo = await save(first.senseId, 1, { topics: ['business', 'archived-later'] });
    expect(withTwo.status).toBe(200);
    await ctx.prisma.topic.update({ where: { code: 'archived-later' }, data: { archivedAt: ctx.clock.now() } });

    const res = await save(first.senseId, 2, { examples_en: ['The bank opens at nine.'] });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ sense_id: first.senseId, revision: 3, dropped_topics: ['archived-later'] });
    const sense = await readSense(first.senseId);
    expect(sense.revisions.map(({ revisionNo, status }) => [revisionNo, status])).toEqual([[1, 'published'], [2, 'superseded'], [3, 'draft']]);
    expect(sense.revisions[2].topicCodes).toEqual(['business']);
    expect(sense.revisions[2].examples).toEqual(['The bank opens at nine.']);
    expect(sense.liveRevisionId).toBe(first.revisionId);
    expect(sense.revisions[0].topicCodes).toEqual(['business']);
  });

  it('B2#52: five pasted lines create empty ui drafts, existing senses are linked without duplication and case-only lemmas warn', async () => {
    const lines = ['bank,noun', 'apple,noun', 'work,verb', 'in,preposition', 'bright,adjective'];
    const paste = (values: string[]) => ctx.http().post('/v1/admin/content/entries/batch')
      .set('Authorization', `Bearer ${token}`).send({ lines: values });
    const res = await paste(lines);
    expect(res.status).toBe(201);
    expect(res.body.items).toHaveLength(5);
    for (const [i, item] of res.body.items.entries()) {
      expect(item).toMatchObject({ line: i + 1, status: 'created', warnings: [], entry_id: expect.any(String), sense_id: expect.any(String) });
      const [lemma, pos] = lines[i].split(',');
      expect(await ctx.prisma.entry.findUniqueOrThrow({ where: { id: item.entry_id } })).toMatchObject({ lemma, pos });
      expect(await readSense(item.sense_id)).toMatchObject({ entryId: item.entry_id, liveRevisionId: null,
        revisions: [expect.objectContaining({ revisionNo: 1, status: 'draft', draftSource: 'ui', createdBy: actorId,
          examples: [], topicCodes: [], acceptedForms: [], texts: [], contentHash: contentHash(empty) })] });
    }
    expect(await ctx.prisma.entry.count()).toBe(5);
    expect(await ctx.prisma.sense.count()).toBe(5);
    const before = await catalog();
    const again = await paste(lines);
    expect(again.body.items).toEqual(res.body.items.map((item: object) => ({ ...item, status: 'exists' })));
    expect(await catalog()).toEqual(before);
    const caseRes = await paste(['Bank,noun']);
    expect(caseRes.body.items[0]).toMatchObject({ line: 1, status: 'created', warnings: [expect.stringContaining('bank')] });
    expect(caseRes.body.items[0].entry_id).not.toBe(res.body.items[0].entry_id);
    expect(await ctx.prisma.entry.count()).toBe(6);
    expect(await ctx.prisma.sense.count()).toBe(6);
    const bare = await ensure('bare');
    const fill = await paste(['bare,noun']);
    expect(fill.body.items[0]).toMatchObject({ status: 'created', entry_id: bare.id, sense_id: expect.any(String) });
  });

  it('B2#48 (stale): stale base revisions return 409 stale-revision and write nothing', async () => {
    const first = await published();
    expect((await save(first.senseId, 1, { definition_en: 'New draft.' })).status).toBe(200);
    const before = await catalog();
    const res = await save(first.senseId, 1, { gloss_vi: 'must not persist' });
    expect(res.status).toBe(409);
    expect(res.body.type).toBe(problem('stale-revision'));
    expect(await catalog()).toEqual(before);
    await expect(write(first.entry.lemma, (tx) => content.saveDraft(tx, { senseId: first.senseId,
      baseRevision: 1, content: {}, source: 'ui', actorId }))).rejects.toMatchObject({ code: 'stale-revision' });
    expect(await catalog()).toEqual(before);
  });

  it('B2#26 (ui): blank fields keep values, lists replace and identical normalized content creates no revision', async () => {
    const first = await published();
    const before = await catalog();
    const unchanged = await write(first.entry.lemma, (tx) => content.saveDraft(tx, { senseId: first.senseId,
      baseRevision: 1, content: { glossVi: ' ngân hàng ', acceptedForms: ['BANK', 'banks', 'Banks'] }, source: 'ui', actorId }));
    expect(unchanged).toEqual({ revisionId: first.revisionId, revisionNo: 1, changed: false, droppedTopics: [] });
    expect(await catalog()).toEqual(before);
    expect((await save(first.senseId, 1, { gloss_vi: '  ', definition_en: '', examples_en: ['Only example.'],
      topics: ['FOOD', 'food'], accepted_forms: ['Bank', ' riverbank ', 'RIVERBANK'] })).status).toBe(200);
    const latest = (await readSense(first.senseId)).revisions[1];
    expect(latest).toMatchObject({ examples: ['Only example.'], topicCodes: ['food'], acceptedForms: ['riverbank'] });
    expect(latest.texts).toEqual(expect.arrayContaining([
      expect.objectContaining({ language: 'vi', text: 'ngân hàng' }),
      expect.objectContaining({ language: 'en', text: 'A financial institution.' }),
    ]));
  });

  it('B2#27 (ui validation): sense routes reject oversized cells, invalid input and missing ids while preserving stored state', async () => {
    const first = await published();
    const before = await catalog();
    const requests = [
      () => create({ entry_id: 'bad' }), () => create({ entry_id: first.entry.id, unexpected: true }),
      () => create({ entry_id: first.entry.id, content: { glossVi: 'wrong case' } }),
      () => create({ entry_id: first.entry.id, content: { gloss_vi: 'nul\0text' } }),
      () => save(first.senseId, 1, { examples_en: ['1', '2', '3', '4'] }),
      () => save(first.senseId, 1, { gloss_vi: 'a'.repeat(2_001) }),
      () => save('bad', 1, {}), () => review([{ sense_id: first.senseId, revision: 1, action: 'published' }]),
      () => ctx.http().post('/v1/admin/content/entries/batch').set('Authorization', `Bearer ${token}`)
        .send({ lines: Array(501).fill('word,noun') }),
    ];
    for (const request of requests) {
      const res = await request();
      expect(res.status).toBe(400);
      expect(res.body.type).toBe(problem('validation-failed'));
      expect(await catalog()).toEqual(before);
    }
    for (const request of [() => create({ entry_id: randomUUID() }), () => save(randomUUID(), 1, {})]) {
      const res = await request();
      expect(res.status).toBe(404);
      expect(res.body.type).toBe(problem('not-found'));
      expect(await catalog()).toEqual(before);
    }
  });

  it('review reports stale and missing items independently, and rejection of an ordinary draft keeps its sense open', async () => {
    const entry = await ensure();
    const first = await create({ entry_id: entry.id });
    const id = first.body.sense_id as string;
    const before = await catalog();
    const refused = await review([{ sense_id: id, revision: 2, action: 'reviewed' },
      { sense_id: randomUUID(), revision: 1, action: 'rejected' }]);
    expect(refused.status).toBe(200);
    expect(refused.body.items).toEqual([
      { sense_id: id, ok: false, reason: 'stale-revision' },
      { sense_id: expect.any(String), ok: false, reason: 'not-found' },
    ]);
    expect(await catalog()).toEqual(before);
    const res = await review([{ sense_id: id, revision: 1, action: 'rejected' }]);
    expect(res.body.items).toEqual([{ sense_id: id, ok: true }]);
    expect(await readSense(id)).toMatchObject({ state: 'open', liveRevisionId: null,
      revisions: [expect.objectContaining({ status: 'rejected' })] });
  });

  it('B2#52 (invalid lines): invalid pasted lines write nothing, valid lines normalize, and pattern characters produce no false case warning', async () => {
    const paste = (lines: string[]) => ctx.http().post('/v1/admin/content/entries/batch')
      .set('Authorization', `Bearer ${token}`).send({ lines });
    await ensure('aXb');
    const before = await catalog();
    const invalid = await paste(['missing-comma', ',noun', 'word,unknown', 'word,noun,extra', `${'a'.repeat(101)},noun`, 'nul\0word,noun']);
    expect(invalid.status).toBe(201);
    expect(invalid.body.items).toHaveLength(6);
    invalid.body.items.forEach((item: object, index: number) => {
      expect(item).toEqual({ line: index + 1, status: 'invalid', warnings: [expect.any(String)] });
    });
    expect(await catalog()).toEqual(before);
    const valid = await paste([' a_b , NOUN ', 'a%b,noun', ' Cafe\u0301\t word , noun']);
    expect(valid.status).toBe(201);
    expect(valid.body.items).toHaveLength(3);
    for (const [index, item] of valid.body.items.entries()) {
      expect(item).toMatchObject({ line: index + 1, status: 'created', warnings: [] });
      expect(await ctx.prisma.entry.findUniqueOrThrow({ where: { id: item.entry_id } })).toMatchObject({
        lemma: ['a_b', 'a%b', 'Café word'][index], pos: 'noun',
      });
    }
  });

  it('B2#48 (concurrency): two saves from the same base serialize, create one draft and refuse the stale save without losing live content', async () => {
    const first = await published();
    const live = (await readSense(first.senseId)).revisions[0];
    const results = await Promise.allSettled(['First change.', 'Second change.'].map((definitionEn) =>
      write(first.entry.lemma, (tx) => content.saveDraft(tx, {
        senseId: first.senseId, baseRevision: 1, content: { definitionEn }, source: 'ui', actorId,
      }))));
    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(({ status }) => status === 'rejected')).toEqual([
      expect.objectContaining({ reason: expect.objectContaining({ code: 'stale-revision' }) }),
    ]);
    const sense = await readSense(first.senseId);
    expect(sense.liveRevisionId).toBe(first.revisionId);
    expect(sense.revisions[0]).toEqual(live);
    expect(sense.revisions).toHaveLength(2);
    expect(sense.revisions[1]).toMatchObject({ revisionNo: 2, status: 'draft' });
    expect(await ctx.prisma.senseRevision.count({ where: { senseId: first.senseId, status: { in: ['draft', 'reviewed'] } } })).toBe(1);
  });
});
