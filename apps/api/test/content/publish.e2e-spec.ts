import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ContentService, type RevisionContent } from '../../src/content/index.js';
import type { Prisma } from '../../src/generated/prisma/client.js';
import { ROLE_PERMISSIONS } from '../../src/identity/identity.types.js';
import { seedUser, startSession } from '../support/auth-helpers.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';
import { resetCatalog } from '../support/reset-catalog.js';
import { testConfig } from '../support/test-config.js';

const transactionOptions = { timeout: 10_000, maxWait: 5_000 };
const problem = (slug: string) => `https://api.example.com/problems/${slug}`;
const complete: RevisionContent = {
  glossVi: 'ngân hàng', definitionEn: null, examplesEn: ['I visited the bank.'],
  topicCodes: ['business'], acceptedForms: [],
};

describe('publish lifecycle (e2e, isolated database)', () => {
  let ctx: TestApp;
  let content: ContentService;
  let actorId: string;
  let token: string;
  let databaseUrl: string;
  const catalog = () => Promise.all([
    ctx.prisma.entry.findMany({ orderBy: { id: 'asc' } }),
    ctx.prisma.sense.findMany({ orderBy: { id: 'asc' } }),
    ctx.prisma.senseRevision.findMany({ orderBy: { id: 'asc' } }),
    ctx.prisma.senseRevisionText.findMany({ orderBy: [{ revisionId: 'asc' }, { language: 'asc' }, { kind: 'asc' }] }),
    ctx.prisma.entryLevel.findMany({ orderBy: { id: 'asc' } }),
  ]);
  const readSense = (id: string) => ctx.prisma.sense.findUniqueOrThrow({ where: { id }, include: {
    revisions: { orderBy: { revisionNo: 'asc' }, include: { texts: { orderBy: [{ language: 'asc' }, { kind: 'asc' }] } } },
  } });
  const write = <T>(lemma: string, action: (tx: Prisma.TransactionClient) => Promise<T>) =>
    ctx.prisma.$transaction(async (tx) => {
      await content.lockEntryKey(tx, lemma, 'noun');
      return action(tx);
    }, transactionOptions);
  const ready = async (options: { content?: Partial<RevisionContent>; level?: boolean } = {}) => {
    const lemma = `bank-${randomUUID()}`;
    return write(lemma, async (tx) => {
      const { entry } = await content.ensureEntry(tx, { lemma, pos: 'noun', variants: [] });
      if (options.level !== false) await content.setEditorialLevel(tx, entry.id, 'A1');
      const sense = await content.createSense(tx, {
        entryId: entry.id, contextLabel: null, source: 'ui', actorId,
        content: { ...complete, ...options.content },
      });
      return { entry, ...sense };
    });
  };
  const publish = (items: object[]) => ctx.http().post('/v1/admin/content/senses/publish')
    .set('Authorization', `Bearer ${token}`).send({ items });
  const stateChange = (action: 'unpublish' | 'retire', sense_ids: string[]) =>
    ctx.http().post(`/v1/admin/content/senses/${action}`)
      .set('Authorization', `Bearer ${token}`).send({ sense_ids });
  const quick = (id: string, revision: number, patch: object) =>
    ctx.http().post(`/v1/admin/content/senses/${id}/quick-publish`)
      .set('Authorization', `Bearer ${token}`).send({ revision, content: patch });
  let learnerToken: string;
  const learnerGet = (path: string, query: object) =>
    ctx.http().get(path).set('Authorization', `Bearer ${learnerToken}`).query(query);
  const item = (senseId: string, revision = 1) => ({ sense_id: senseId, revision });
  const published = async () => {
    const first = await ready();
    const res = await publish([item(first.senseId)]);
    expect(res.status).toBe(200);
    expect(res.body.results).toEqual([{ sense_id: first.senseId, outcome: 'published' }]);
    return first;
  };

  beforeAll(async () => {
    const config = testConfig();
    config.limits['user.write'].max = 10_000;
    databaseUrl = await createIsolatedDatabase();
    ctx = await createTestApp({ databaseUrl, config });
    content = ctx.app.get(ContentService);
  });
  beforeEach(async () => {
    await resetCatalog(ctx.prisma);
    await ctx.prisma.rateLimitCounter.deleteMany();
    await ctx.prisma.user.deleteMany();
    ctx.rolePermissions.editor = [...ROLE_PERMISSIONS.editor];
    ctx.clock.set(new Date('2026-10-12T12:00:00Z'));
    actorId = (await seedUser(ctx.prisma, { verified: true, staffRole: 'editor' })).userId;
    token = (await startSession(ctx, actorId)).accessToken;
    learnerToken = (await startSession(ctx, (await seedUser(ctx.prisma, { nativeLanguage: 'vi' })).userId)).accessToken;
  });
  afterAll(async () => { await ctx?.close(); });

  it('B2#43: a level, Vietnamese gloss, English example and active topic make a sense live with a published timestamp', async () => {
    const first = await published();
    expect(await readSense(first.senseId)).toMatchObject({ state: 'open', liveRevisionId: first.revisionId,
      revisions: [expect.objectContaining({ id: first.revisionId, status: 'published', publishedAt: ctx.clock.now(),
        examples: ['I visited the bank.'], topicCodes: ['business'],
        texts: [{ revisionId: first.revisionId, language: 'vi', kind: 'gloss', text: 'ngân hàng' }] })] });
    expect(await ctx.prisma.entryLevel.count({ where: { entryId: first.entry.id } })).toBe(1);
    // Learner search/browse/detail visibility will be exercised by Task 8; this task establishes their live state.
  });

  it('B2#44: every non-empty combination of missing requirements returns exactly its violations and persists no changes', async () => {
    // All 7 combinations catch both individual missing checks and incomplete violation lists; no topic is required (D7).
    for (let missing = 1; missing < 8; missing++) {
      const violations = [
        ...(missing & 1 ? ['gloss-missing'] : []), ...(missing & 2 ? ['example-missing'] : []),
        ...(missing & 4 ? ['level-missing'] : []),
      ];
      const first = await ready({ level: !(missing & 4), content: {
        glossVi: missing & 1 ? ' \t ' : complete.glossVi,
        examplesEn: missing & 2 ? [' \n '] : complete.examplesEn,
        topicCodes: [],
      } });
      const before = await catalog();
      const res = await publish([item(first.senseId)]);
      expect(res.status).toBe(200);
      expect(res.body.results).toEqual([{ sense_id: first.senseId, outcome: 'refused', reason: 'publish-incomplete', violations }]);
      expect(await catalog()).toEqual(before);
      expect(await readSense(first.senseId)).toMatchObject({ liveRevisionId: null,
        revisions: [expect.objectContaining({ status: 'draft', publishedAt: null })] });
    }
  });

  it('B2#45: ten items with three incomplete publish seven independently and report the three reasons', async () => {
    const senses = [];
    for (let i = 0; i < 10; i++) senses.push(await ready({ content: i < 3 ? { examplesEn: [] } : {} }));
    const refusedBefore = await Promise.all(senses.slice(0, 3).map(({ senseId }) => readSense(senseId)));
    const res = await publish(senses.map(({ senseId }) => item(senseId)));
    expect(res.status).toBe(200);
    expect(res.body.results).toEqual(senses.map(({ senseId }, i) => i < 3
      ? { sense_id: senseId, outcome: 'refused', reason: 'publish-incomplete', violations: ['example-missing'] }
      : { sense_id: senseId, outcome: 'published' }));
    expect(await ctx.prisma.sense.count({ where: { state: 'open', liveRevisionId: { not: null } } })).toBe(7);
    expect(await ctx.prisma.senseRevision.count({ where: { status: 'published' } })).toBe(7);
    expect(await Promise.all(senses.slice(0, 3).map(({ senseId }) => readSense(senseId)))).toEqual(refusedBefore);
    for (const sense of senses.slice(3)) expect(await readSense(sense.senseId)).toMatchObject({ liveRevisionId: sense.revisionId,
      revisions: [expect.objectContaining({ status: 'published', publishedAt: ctx.clock.now() })] });
  });

  it('B2#45a: 501 publish, unpublish or retire items return 400 before any item changes; 500 are accepted', async () => {
    const first = await ready();
    const before = await catalog();
    const tooMany = [
      () => publish(Array.from({ length: 501 }, () => item(first.senseId))),
      () => stateChange('unpublish', Array(501).fill(first.senseId)),
      () => stateChange('retire', Array(501).fill(first.senseId)),
    ];
    for (const request of tooMany) {
      const res = await request();
      expect(res.status).toBe(400);
      expect(res.body.type).toBe(problem('validation-failed'));
      expect(await catalog()).toEqual(before);
    }
    const accepted = await publish(Array.from({ length: 500 }, () => item(first.senseId)));
    expect(accepted.status).toBe(200);
    expect(accepted.body.results).toHaveLength(500);
    expect(accepted.body.results[0]).toEqual({ sense_id: first.senseId, outcome: 'published' });
    expect(accepted.body.results.slice(1)).toEqual(Array.from({ length: 499 }, () => ({ sense_id: first.senseId, outcome: 'already_published' })));
    expect((await readSense(first.senseId)).liveRevisionId).toBe(first.revisionId);
  });

  it('B2#45a (config): all three batch limits follow content.publishMaxItems', async () => {
    const first = await ready();
    const config = testConfig();
    config.content.publishMaxItems = 1;
    config.limits['user.write'].max = 10_000;
    const limited = await createTestApp({ databaseUrl, config });
    try {
      const limitedToken = (await startSession(limited, actorId)).accessToken;
      const before = await catalog();
      for (const [action, body] of [
        ['publish', { items: [item(first.senseId), item(first.senseId)] }],
        ['unpublish', { sense_ids: [first.senseId, first.senseId] }],
        ['retire', { sense_ids: [first.senseId, first.senseId] }],
      ] as const) {
        const res = await limited.http().post(`/v1/admin/content/senses/${action}`)
          .set('Authorization', `Bearer ${limitedToken}`).send(body);
        expect(res.status).toBe(400);
        expect(res.body.type).toBe(problem('validation-failed'));
        expect(await catalog()).toEqual(before);
      }
    } finally { await limited.close(); }
  });

  it('B2#46: stale revisions alone are refused while other items proceed, and the latest is republished with no open revision', async () => {
    const first = await ready();
    const next = await write(first.entry.lemma, (tx) => content.saveDraft(tx, {
      senseId: first.senseId, baseRevision: 1, content: { definitionEn: 'New definition.' }, source: 'ui', actorId,
    }));
    const staleBefore = await readSense(first.senseId);
    const other = await ready();
    const res = await publish([item(first.senseId), item(other.senseId)]);
    expect(res.status).toBe(200);
    expect(res.body.results).toEqual([
      { sense_id: first.senseId, outcome: 'refused', reason: 'stale-revision' },
      { sense_id: other.senseId, outcome: 'published' },
    ]);
    expect(await readSense(first.senseId)).toEqual(staleBefore);
    expect((await readSense(other.senseId)).liveRevisionId).toBe(other.revisionId);
    expect((await publish([item(first.senseId, next.revisionNo)])).body.results).toEqual([{ sense_id: first.senseId, outcome: 'published' }]);
    expect((await stateChange('unpublish', [first.senseId])).body.results).toEqual([{ sense_id: first.senseId, ok: true }]);
    expect(await ctx.prisma.senseRevision.count({ where: { senseId: first.senseId, status: { in: ['draft', 'reviewed'] } } })).toBe(0);
    const republished = await publish([item(first.senseId, next.revisionNo)]);
    expect(republished.status).toBe(200);
    expect(republished.body.results).toEqual([{ sense_id: first.senseId, outcome: 'published' }]);
    expect(await readSense(first.senseId)).toMatchObject({ state: 'open', liveRevisionId: next.revisionId });
  });

  it('B2#47: a draft publishes directly without being marked reviewed', async () => {
    const first = await ready();
    expect((await readSense(first.senseId)).revisions[0].status).toBe('draft');
    expect(await content.publishItem({ senseId: first.senseId, revision: 1 }, actorId)).toEqual({ outcome: 'published' });
    expect((await readSense(first.senseId)).revisions[0]).toMatchObject({ status: 'published', publishedAt: ctx.clock.now() });
  });

  it('B2#45 (idempotent): publishing the same revision twice returns published then already_published without changing persisted state', async () => {
    const first = await published();
    const before = await catalog();
    ctx.clock.advance(1_000);
    const res = await publish([item(first.senseId)]);
    expect(res.status).toBe(200);
    expect(res.body.results).toEqual([{ sense_id: first.senseId, outcome: 'already_published' }]);
    expect(await catalog()).toEqual(before);
  });

  it('B2#48 (quick): edit and publish are atomic, supersede the previous live revision and require both permissions', async () => {
    const first = await published();
    const liveBefore = (await readSense(first.senseId)).revisions[0];
    for (const missing of ['content.publish', 'content.edit'] as const) {
      ctx.rolePermissions.editor = ROLE_PERMISSIONS.editor.filter((permission) => permission !== missing);
      const before = await catalog();
      const refused = await quick(first.senseId, 1, { gloss_vi: 'nghĩa mới' });
      expect(refused.status).toBe(403);
      expect(refused.body.type).toBe(problem('forbidden'));
      expect(await catalog()).toEqual(before);
    }
    ctx.rolePermissions.editor = [...ROLE_PERMISSIONS.editor];
    ctx.clock.advance(1_000);
    const res = await quick(first.senseId, 1, { gloss_vi: 'nghĩa mới', examples_en: ['A new bank example.'] });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ sense_id: first.senseId, revision: 2, outcome: 'published', dropped_topics: [] });
    const sense = await readSense(first.senseId);
    expect(sense.revisions).toHaveLength(2);
    expect(sense.state).toBe('open');
    expect(sense.liveRevisionId).toBe(sense.revisions[1].id);
    expect(sense.revisions[0]).toEqual({ ...liveBefore, status: 'superseded' });
    expect(sense.revisions[1]).toMatchObject({ status: 'published', revisionNo: 2, publishedAt: ctx.clock.now(),
      draftSource: 'ui', createdBy: actorId, examples: ['A new bank example.'], topicCodes: ['business'],
      texts: [{ revisionId: sense.revisions[1].id, language: 'vi', kind: 'gloss', text: 'nghĩa mới' }] });
    expect(await ctx.prisma.sense.count()).toBe(1);
    expect(await ctx.prisma.senseRevision.count({ where: { status: { in: ['draft', 'reviewed'] } } })).toBe(0);
  });

  it('B2#48 (quick rollback): an incomplete edit returns 422 and saves no draft, supersession or live change', async () => {
    const first = await published();
    const before = await catalog();
    const res = await quick(first.senseId, 1, { gloss_vi: 'must not persist', examples_en: [], topics: [] });
    expect(res.status).toBe(422);
    expect(res.headers['content-type']).toContain('application/problem+json');
    expect(res.body.type).toBe(problem('publish-incomplete'));
    expect(res.body.violations).toEqual(['example-missing']);
    expect(await catalog()).toEqual(before);
    const empty = await ready({ content: { glossVi: null, examplesEn: [], topicCodes: [] }, level: false });
    const emptyBefore = await catalog();
    const incomplete = await quick(empty.senseId, 1, { definition_en: 'Still incomplete.' });
    expect(incomplete.status).toBe(422);
    expect(incomplete.body.type).toBe(problem('publish-incomplete'));
    expect(incomplete.body.violations).toEqual(['gloss-missing', 'example-missing', 'level-missing']);
    expect(await catalog()).toEqual(emptyBefore);
  });

  it('B2#48 (quick unchanged): quick publish reuses saveDraft revision numbers and topic-drop warnings', async () => {
    const first = await ready();
    const res = await quick(first.senseId, 1, {});
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ sense_id: first.senseId, revision: 1, outcome: 'published', dropped_topics: [] });
    expect((await readSense(first.senseId)).revisions).toHaveLength(1);
    const before = await catalog();
    const repeated = await quick(first.senseId, 1, {});
    expect(repeated.status).toBe(200);
    expect(repeated.body).toEqual({ sense_id: first.senseId, revision: 1, outcome: 'already_published', dropped_topics: [] });
    expect(await catalog()).toEqual(before);
    const code = `archived-${randomUUID()}`;
    await ctx.prisma.topic.create({ data: { code } });
    const withTopics = await ready({ content: { topicCodes: ['business', code] } });
    await ctx.prisma.topic.update({ where: { code }, data: { archivedAt: ctx.clock.now() } });
    const dropped = await quick(withTopics.senseId, 1, { definition_en: 'Edited after archive.' });
    expect(dropped.status).toBe(200);
    expect(dropped.body).toEqual({ sense_id: withTopics.senseId, revision: 2, outcome: 'published', dropped_topics: [code] });
    const sense = await readSense(withTopics.senseId);
    expect(sense.liveRevisionId).toBe(sense.revisions[1].id);
    expect(sense.revisions[1]).toMatchObject({ status: 'published', topicCodes: ['business'] });
  });

  it('B2#49: unpublish hides while preserving content, latest publish restores it, and retire is final', async () => {
    const first = await published();
    const before = await readSense(first.senseId);
    const hidden = await stateChange('unpublish', [first.senseId]);
    expect(hidden.status).toBe(200);
    expect(hidden.body.results).toEqual([{ sense_id: first.senseId, ok: true }]);
    expect(await readSense(first.senseId)).toEqual({ ...before, state: 'unpublished' });
    expect((await publish([item(first.senseId)])).body.results).toEqual([{ sense_id: first.senseId, outcome: 'published' }]);
    expect(await readSense(first.senseId)).toEqual(before);
    const retired = await stateChange('retire', [first.senseId]);
    expect(retired.status).toBe(200);
    expect(retired.body.results).toEqual([{ sense_id: first.senseId, ok: true }]);
    expect(await readSense(first.senseId)).toEqual({ ...before, state: 'retired' });
    const retiredBefore = await catalog();
    expect((await publish([item(first.senseId)])).body.results).toEqual([{ sense_id: first.senseId, outcome: 'refused', reason: 'sense-retired' }]);
    expect(await catalog()).toEqual(retiredBefore);
    expect((await stateChange('unpublish', [first.senseId])).body.results).toEqual([{ sense_id: first.senseId, ok: false, reason: 'sense-retired' }]);
    expect(await catalog()).toEqual(retiredBefore);
    const refusedQuick = await quick(first.senseId, 1, { gloss_vi: 'cannot resurrect' });
    expect(refusedQuick.status).toBe(400);
    expect(refusedQuick.body.type).toBe(problem('sense-retired'));
    expect(await catalog()).toEqual(retiredBefore);
    expect((await stateChange('retire', [first.senseId])).body.results).toEqual([{ sense_id: first.senseId, ok: true }]);
    expect(await catalog()).toEqual(retiredBefore);
  });

  it('B2#21 (publish): a replacement retires the old sense atomically before taking its live label, and retains its replacement link', async () => {
    const first = await published();
    const old = await readSense(first.senseId);
    const replacement = await write(first.entry.lemma, (tx) => content.createSense(tx, {
      entryId: first.entry.id, contextLabel: null, replacesSenseId: first.senseId, source: 'ui', actorId,
      content: { ...complete, glossVi: 'bờ sông', examplesEn: [] },
    }));
    const before = await catalog();
    const refused = await publish([item(replacement.senseId)]);
    expect(refused.status).toBe(200);
    expect(refused.body.results).toEqual([{ sense_id: replacement.senseId, outcome: 'refused', reason: 'publish-incomplete', violations: ['example-missing'] }]);
    expect(await catalog()).toEqual(before);
    await write(first.entry.lemma, (tx) => content.saveDraft(tx, {
      senseId: replacement.senseId, baseRevision: 1, content: { examplesEn: ['We sat by the bank.'] }, source: 'ui', actorId,
    }));
    const res = await publish([item(replacement.senseId, 2)]);
    expect(res.status).toBe(200);
    expect(res.body.results).toEqual([{ sense_id: replacement.senseId, outcome: 'published' }]);
    expect(await readSense(first.senseId)).toEqual({ ...old, state: 'retired' });
    const sense = await readSense(replacement.senseId);
    expect(sense).toMatchObject({ state: 'open', replacesSenseId: first.senseId, liveRevisionId: sense.revisions[1].id });
    expect(sense.revisions[1]).toMatchObject({ status: 'published', publishedAt: ctx.clock.now() });
    expect(await ctx.prisma.sense.count({ where: { entryId: first.entry.id, state: 'open', liveRevisionId: { not: null } } })).toBe(1);
    const after = await catalog();
    const duplicate = await ctx.http().post('/v1/admin/content/senses').set('Authorization', `Bearer ${token}`)
      .send({ entry_id: first.entry.id });
    expect(duplicate.status).toBe(400);
    expect(duplicate.body.type).toBe(problem('sense-exists'));
    expect(await catalog()).toEqual(after);
  });

  it('B2E19: retiring the last published sense keeps its entry, levels and revisions', async () => {
    const first = await published();
    const entry = await ctx.prisma.entry.findUniqueOrThrow({ where: { id: first.entry.id }, include: { levels: true } });
    const revisions = (await readSense(first.senseId)).revisions;
    const res = await stateChange('retire', [first.senseId]);
    expect(res.status).toBe(200);
    expect(res.body.results).toEqual([{ sense_id: first.senseId, ok: true }]);
    expect(await ctx.prisma.entry.findUniqueOrThrow({ where: { id: first.entry.id }, include: { levels: true } })).toEqual(entry);
    expect((await readSense(first.senseId)).revisions).toEqual(revisions);
    expect(await ctx.prisma.sense.count({ where: { entryId: entry.id, state: 'open', liveRevisionId: { not: null } } })).toBe(0);
  });

  it('B3#14: a sense with gloss, example and level but no topic publishes and appears in search', async () => {
    const first = await ready({ content: { topicCodes: [] } });
    const res = await publish([item(first.senseId)]);
    expect(res.status).toBe(200);
    expect(res.body.results).toEqual([{ sense_id: first.senseId, outcome: 'published' }]);
    expect(await readSense(first.senseId)).toMatchObject({ state: 'open', liveRevisionId: first.revisionId,
      revisions: [expect.objectContaining({ status: 'published', publishedAt: ctx.clock.now(), topicCodes: [] })] });
    const search = await learnerGet('/v1/senses/search', { q: first.entry.lemma });
    expect(search.status).toBe(200);
    expect(search.body.items.map((row: { sense_id: string }) => row.sense_id)).toEqual([first.senseId]);
    expect(search.body.items[0].topics).toEqual([]);
  });

  it('B3E33: a sense published without a topic is absent from GET /v1/senses?topic=…', async () => {
    const without = await ready({ content: { topicCodes: [] } });
    const withTopic = await ready();
    expect((await publish([item(without.senseId), item(withTopic.senseId)])).body.results).toEqual([
      { sense_id: without.senseId, outcome: 'published' }, { sense_id: withTopic.senseId, outcome: 'published' }]);
    const res = await learnerGet('/v1/senses', { topic: 'business' });
    expect(res.status).toBe(200);
    expect(res.body.items.map((row: { sense_id: string }) => row.sense_id)).toEqual([withTopic.senseId]);
  });

  it('B2#44 (archived topic, D7): a topic archived after drafting no longer blocks publishing', async () => {
    const code = `publish-archived-${randomUUID()}`;
    await ctx.prisma.topic.create({ data: { code } });
    const first = await ready({ content: { topicCodes: [code] } });
    await ctx.prisma.topic.update({ where: { code }, data: { archivedAt: ctx.clock.now() } });
    const res = await publish([item(first.senseId)]);
    expect(res.status).toBe(200);
    expect(res.body.results).toEqual([{ sense_id: first.senseId, outcome: 'published' }]);
    expect((await readSense(first.senseId)).liveRevisionId).toBe(first.revisionId);
  });

  it('B2#45 (missing sense): missing ids are refused independently for all batch operations', async () => {
    const first = await ready();
    const missing = randomUUID();
    const res = await publish([item(missing), item(first.senseId)]);
    expect(res.status).toBe(200);
    expect(res.body.results).toEqual([
      { sense_id: missing, outcome: 'refused', reason: 'sense-not-found' }, { sense_id: first.senseId, outcome: 'published' },
    ]);
    expect((await readSense(first.senseId)).liveRevisionId).toBe(first.revisionId);
    for (const action of ['unpublish', 'retire'] as const) {
      const changed = await stateChange(action, [missing, first.senseId]);
      expect(changed.status).toBe(200);
      expect(changed.body.results).toEqual([{ sense_id: missing, ok: false, reason: 'sense-not-found' }, { sense_id: first.senseId, ok: true }]);
      expect((await readSense(first.senseId)).state).toBe(action === 'unpublish' ? 'unpublished' : 'retired');
      expect(await ctx.prisma.sense.findUnique({ where: { id: missing } })).toBeNull();
    }
  });

  it('B2#46 (quick stale): a stale or missing quick-publish target returns its rule error and persists nothing', async () => {
    const first = await published();
    await write(first.entry.lemma, (tx) => content.saveDraft(tx, {
      senseId: first.senseId, baseRevision: 1, content: { definitionEn: 'Current draft.' }, source: 'ui', actorId,
    }));
    const before = await catalog();
    for (const [id, status, slug] of [[first.senseId, 409, 'stale-revision'], [randomUUID(), 404, 'not-found']] as const) {
      const res = await quick(id, 1, { gloss_vi: 'must not persist' });
      expect(res.status).toBe(status);
      expect(res.body.type).toBe(problem(slug));
      expect(await catalog()).toEqual(before);
    }
  });

  it('B2#45 (concurrency): two simultaneous service publishes serialize to published and already_published', async () => {
    const first = await ready();
    const results = await Promise.all([1, 2].map(() => content.publishItem({ senseId: first.senseId, revision: 1 }, actorId)));
    expect(results).toEqual(expect.arrayContaining([{ outcome: 'published' }, { outcome: 'already_published' }]));
    expect(results).toHaveLength(2);
    expect(await readSense(first.senseId)).toMatchObject({ liveRevisionId: first.revisionId,
      revisions: [expect.objectContaining({ status: 'published', publishedAt: ctx.clock.now() })] });
  });

  it('B2#45 (validation): malformed batches and quick content return validation-failed without writes', async () => {
    const first = await ready();
    const before = await catalog();
    const requests = [
      () => publish([{ sense_id: first.senseId, revision: 0 }]),
      () => publish([{ sense_id: 'bad-id', revision: 1 }]),
      () => stateChange('unpublish', ['bad-id']),
      () => stateChange('retire', ['bad-id']),
      () => quick(first.senseId, 1, { extra: 'unknown' }),
      () => quick(first.senseId, 1, { examples_en: ['one', 'two', 'three', 'four'] }),
      () => quick(first.senseId, 1, { gloss_vi: 'bad\0text' }),
    ];
    for (const request of requests) {
      const res = await request();
      expect(res.status).toBe(400);
      expect(res.body.type).toBe(problem('validation-failed'));
      expect(await catalog()).toEqual(before);
    }
  });
});
