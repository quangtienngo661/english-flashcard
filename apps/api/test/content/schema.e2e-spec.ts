import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { OWNER_SOURCE_ID } from '../../src/content/index.js';
import { Prisma } from '../../src/generated/prisma/client.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';
import { resetCatalog } from '../support/reset-catalog.js';

describe('content schema (e2e, isolated database)', () => {
  let ctx: TestApp;
  const entry = (lemma = 'bank', pos = 'noun') => ctx.prisma.entry.create({
    data: { language: 'en', lemma, pos, entryType: 'word', functionWordDerived: false },
  });
  const revision = (senseId: string, revisionNo: number, status = 'draft') => ctx.prisma.senseRevision.create({
    data: {
      senseId, revisionNo, status, draftSource: 'ui', contentHash: `hash-${revisionNo}`,
      createdBy: randomUUID(), examples: [], topicCodes: [], acceptedForms: [],
    },
  });
  const senses = (entryId: string) => ctx.prisma.sense.findMany({ where: { entryId }, orderBy: { id: 'asc' } });
  const revisions = (senseId: string) => ctx.prisma.senseRevision.findMany({ where: { senseId }, orderBy: { revisionNo: 'asc' } });
  const seeds = async () => ({
    sources: await ctx.prisma.dataSource.findMany({ where: { kind: 'owner' }, orderBy: { id: 'asc' } }),
    topics: await ctx.prisma.topic.findMany({ orderBy: { code: 'asc' } }),
    names: await ctx.prisma.topicName.findMany({ orderBy: [{ topicCode: 'asc' }, { language: 'asc' }] }),
  });
  beforeAll(async () => {
    ctx = await createTestApp({ databaseUrl: await createIsolatedDatabase() });
  });
  beforeEach(async () => { await resetCatalog(ctx.prisma); });
  afterAll(async () => { await ctx?.close(); });

  it('B2#8 (schema): entries are unique on (language, lemma, pos) and case-sensitive — March and march coexist, a second March noun is refused', async () => {
    const upper = await entry('March');
    const lower = await entry('march');
    expect(upper.id).not.toBe(lower.id);
    const entries = await ctx.prisma.entry.findMany({ select: { lemma: true, pos: true } });
    expect(entries).toHaveLength(2);
    expect(entries).toEqual(expect.arrayContaining([
      { lemma: 'March', pos: 'noun' }, { lemma: 'march', pos: 'noun' },
    ]));
    const before = await ctx.prisma.entry.findMany({ orderBy: { id: 'asc' } });
    await expect(entry('March')).rejects.toMatchObject({ code: 'P2002' });
    expect(await ctx.prisma.entry.findMany({ orderBy: { id: 'asc' } })).toEqual(before);
    await entry('March', 'verb');
    expect(await ctx.prisma.entry.count()).toBe(3);
  });

  it('schema: catalog (language, lemma, pos) stays unique among catalog rows; two learners may each own deploy/verb next to the catalog deploy/verb; a private row without owner or a catalog row with an owner is refused', async () => {
    const [first, second] = [randomUUID(), randomUUID()];
    const insert = (scope: string, owner: string | null) => ctx.prisma.$executeRaw`
      INSERT INTO entries (language, lemma, pos, scope, owner_user_id) VALUES ('en', 'deploy', 'verb', ${scope}, ${owner}::uuid)`;
    await insert('catalog', null);
    await insert('private', first);
    await insert('private', second);
    expect(await ctx.prisma.entry.count({ where: { lemma: 'deploy', pos: 'verb' } })).toBe(3);
    const before = await ctx.prisma.entry.findMany({ orderBy: { id: 'asc' } });
    await expect(insert('catalog', null)).rejects.toThrow(/entries_catalog_key/);
    await expect(insert('private', first)).rejects.toThrow(/entries_private_key/);
    await expect(insert('private', null)).rejects.toThrow(/entries_scope_owner_check/);
    await expect(insert('catalog', first)).rejects.toThrow(/entries_scope_owner_check/);
    await expect(insert('shared', first)).rejects.toThrow(/entries_scope_check/);
    expect(await ctx.prisma.entry.findMany({ orderBy: { id: 'asc' } })).toEqual(before);
  });

  it('B2#20 (schema): a second non-retired sense with the same (entry, label) is refused, a different label is allowed, and NULL label counts as one label', async () => {
    const { id: entryId } = await entry();
    const main = await ctx.prisma.sense.create({ data: { entryId, contextLabel: null, state: 'open' } });
    await ctx.prisma.sense.create({ data: { entryId, contextLabel: 'river', state: 'unpublished' } });
    await ctx.prisma.sense.create({ data: { entryId, contextLabel: 'finance', state: 'open' } });
    expect(await ctx.prisma.sense.count({ where: { entryId } })).toBe(3);
    const before = await senses(entryId);
    for (const contextLabel of [null, '', 'river', 'finance']) {
      await expect(ctx.prisma.sense.create({ data: { entryId, contextLabel, state: 'open' } })).rejects.toMatchObject({ code: 'P2002' });
      expect(await senses(entryId)).toEqual(before);
    }
    await ctx.prisma.sense.create({ data: { entryId, contextLabel: 'river', state: 'retired' } });
    await ctx.prisma.sense.update({ where: { id: main.id }, data: { state: 'retired' } });
    await ctx.prisma.sense.create({ data: { entryId, contextLabel: null, state: 'open' } });
    expect(await ctx.prisma.sense.count({ where: { entryId, contextLabel: null, state: { not: 'retired' } } })).toBe(1);
  });

  it('B2#21 (schema): a waiting replacement (replaces_sense_id set, live_revision_id null) may coexist with the live sense, a second waiting replacement for the same sense is refused, and once the replacement has live_revision_id set a new sense with the same (entry, label) is refused', async () => {
    const { id: entryId } = await entry();
    const live = await ctx.prisma.sense.create({ data: { entryId, contextLabel: null, state: 'open' } });
    const liveRevision = await revision(live.id, 1, 'published');
    await ctx.prisma.sense.update({ where: { id: live.id }, data: { liveRevisionId: liveRevision.id } });
    const waiting = await ctx.prisma.sense.create({
      data: { entryId, contextLabel: null, state: 'open', replacesSenseId: live.id },
    });
    expect(waiting.liveRevisionId).toBeNull();
    expect(await ctx.prisma.sense.findUniqueOrThrow({ where: { id: live.id } })).toMatchObject({
      state: 'open', liveRevisionId: liveRevision.id,
    });
    const before = await senses(entryId);
    // A different label cannot bypass the one-waiting-replacement invariant.
    for (const contextLabel of [null, 'different']) {
      await expect(ctx.prisma.sense.create({
        data: { entryId, contextLabel, state: 'unpublished', replacesSenseId: live.id },
      })).rejects.toMatchObject({ code: 'P2002' });
      expect(await senses(entryId)).toEqual(before);
    }
    const replacementRevision = await revision(waiting.id, 1, 'published');
    await ctx.prisma.$transaction([
      ctx.prisma.sense.update({ where: { id: live.id }, data: { state: 'retired' } }),
      ctx.prisma.sense.update({ where: { id: waiting.id }, data: { liveRevisionId: replacementRevision.id } }),
    ]);
    const published = await senses(entryId);
    expect(await ctx.prisma.sense.findUniqueOrThrow({ where: { id: waiting.id } })).toMatchObject({
      replacesSenseId: live.id, liveRevisionId: replacementRevision.id, state: 'open',
    });
    await expect(ctx.prisma.sense.create({ data: { entryId, contextLabel: null, state: 'open' } })).rejects.toMatchObject({ code: 'P2002' });
    expect(await senses(entryId)).toEqual(published);
    // A retired waiting replacement releases its slot for a later attempt.
    const retired = await ctx.prisma.sense.create({ data: {
      entryId, contextLabel: null, state: 'retired', replacesSenseId: waiting.id,
    } });
    const next = await ctx.prisma.sense.create({ data: {
      entryId, contextLabel: null, state: 'open', replacesSenseId: waiting.id,
    } });
    expect(next.id).not.toBe(retired.id);
  });

  it('B2#48 (schema): at most one draft/reviewed revision per sense', async () => {
    const { id: entryId } = await entry();
    for (const firstStatus of ['draft', 'reviewed']) {
      const sense = await ctx.prisma.sense.create({ data: { entryId, contextLabel: firstStatus, state: 'open' } });
      const first = await revision(sense.id, 1, firstStatus);
      const before = await revisions(sense.id);
      for (const status of ['draft', 'reviewed']) {
        await expect(revision(sense.id, 2, status)).rejects.toMatchObject({ code: 'P2002' });
        expect(await revisions(sense.id)).toEqual(before);
      }
      await ctx.prisma.senseRevision.update({ where: { id: first.id }, data: { status: 'superseded' } });
      await revision(sense.id, 2, 'reviewed');
      await revision(sense.id, 3, 'published');
      await revision(sense.id, 4, 'rejected');
      expect(await revisions(sense.id)).toMatchObject([
        { revisionNo: 1, status: 'superseded' }, { revisionNo: 2, status: 'reviewed' },
        { revisionNo: 3, status: 'published' }, { revisionNo: 4, status: 'rejected' },
      ]);
      const closedAndOpen = await revisions(sense.id);
      await expect(revision(sense.id, 3, 'superseded')).rejects.toMatchObject({ code: 'P2002' });
      expect(await revisions(sense.id)).toEqual(closedAndOpen);
    }
  });

  it('B2#14 (schema): entry_levels unique on (entry, source, level) so C1 and C2 from one source coexist', async () => {
    const { id: entryId } = await entry();
    const source = await ctx.prisma.dataSource.create({ data: {
      kind: 'third_party', name: 'CEFR-J', version: '1.5', license: 'test', displayPriority: 10,
    } });
    for (const level of ['C1', 'C2']) await ctx.prisma.entryLevel.create({
      data: { entryId, sourceId: source.id, level, basis: 'imported', sourceExtra: { notes: 'unchanged' } },
    });
    const before = await ctx.prisma.entryLevel.findMany({ where: { entryId }, orderBy: { level: 'asc' } });
    expect(before).toMatchObject([
      { sourceId: source.id, level: 'C1', sourceExtra: { notes: 'unchanged' } },
      { sourceId: source.id, level: 'C2', sourceExtra: { notes: 'unchanged' } },
    ]);
    await expect(ctx.prisma.entryLevel.create({
      data: { entryId, sourceId: source.id, level: 'C1', basis: 'imported' },
    })).rejects.toMatchObject({ code: 'P2002' });
    expect(await ctx.prisma.entryLevel.findMany({ where: { entryId }, orderBy: { level: 'asc' } })).toEqual(before);
    await ctx.prisma.entryLevel.create({ data: { entryId, sourceId: OWNER_SOURCE_ID, level: 'C1', basis: 'editorial' } });
    expect(await ctx.prisma.entryLevel.count({ where: { entryId } })).toBe(3);
  });

  it('check constraints: unknown level, state, status, kind, language are refused', async () => {
    const { id: entryId } = await entry();
    await ctx.prisma.entryVariant.create({ data: { entryId, text: 'banks', kind: 'alias', acceptedAsAnswer: false } });
    await ctx.prisma.entryLevel.create({ data: { entryId, sourceId: OWNER_SOURCE_ID, level: 'A1', basis: 'editorial' } });
    const sense = await ctx.prisma.sense.create({ data: { entryId, state: 'open' } });
    const rev = await revision(sense.id, 1);
    await ctx.prisma.senseRevisionText.create({ data: { revisionId: rev.id, language: 'vi', kind: 'gloss', text: 'ngân hàng' } });
    const snapshot = () => Promise.all([
      ctx.prisma.dataSource.findMany({ orderBy: { id: 'asc' } }),
      ctx.prisma.topicName.findMany({ orderBy: [{ topicCode: 'asc' }, { language: 'asc' }] }),
      ctx.prisma.entry.findMany({ orderBy: { id: 'asc' } }),
      ctx.prisma.entryVariant.findMany({ orderBy: { id: 'asc' } }),
      ctx.prisma.entryLevel.findMany({ orderBy: { id: 'asc' } }),
      ctx.prisma.sense.findMany({ orderBy: { id: 'asc' } }),
      ctx.prisma.senseRevision.findMany({ orderBy: { id: 'asc' } }),
      ctx.prisma.senseRevisionText.findMany({ orderBy: [{ revisionId: 'asc' }, { language: 'asc' }, { kind: 'asc' }] }),
    ]);
    const before = await snapshot();
    // Valid rows above are the control; raw SQL bypasses client-side validation.
    const invalid = [
      Prisma.sql`INSERT INTO topic_names (topic_code, language, name) VALUES ('technology', 'unknown', 'invalid')`,
      Prisma.sql`INSERT INTO data_sources (kind, name, display_priority) VALUES ('unknown', 'invalid', 10)`,
      Prisma.sql`INSERT INTO entries (language, lemma, pos) VALUES ('vi', 'invalid', 'noun')`,
      Prisma.sql`INSERT INTO entries (language, lemma, pos) VALUES ('en', 'invalid', 'nuon')`,
      Prisma.sql`INSERT INTO entries (lemma, pos, entry_type) VALUES ('invalid', 'noun', 'phrase')`,
      Prisma.sql`INSERT INTO entry_variants (entry_id, text, kind) VALUES (${entryId}::uuid, 'invalid', 'unknown')`,
      Prisma.sql`INSERT INTO entry_levels (entry_id, source_id, level, basis)
        VALUES (${entryId}::uuid, ${OWNER_SOURCE_ID}::uuid, 'C3', 'editorial')`,
      Prisma.sql`INSERT INTO entry_levels (entry_id, source_id, level, basis)
        VALUES (${entryId}::uuid, ${OWNER_SOURCE_ID}::uuid, 'A2', 'unknown')`,
      Prisma.sql`INSERT INTO senses (entry_id, context_label, state) VALUES (${entryId}::uuid, 'invalid', 'unknown')`,
      Prisma.sql`INSERT INTO sense_revisions (sense_id, revision_no, status, draft_source, content_hash, created_by)
        VALUES (${sense.id}::uuid, 2, 'unknown', 'ui', 'invalid', ${randomUUID()}::uuid)`,
      Prisma.sql`INSERT INTO sense_revisions (sense_id, revision_no, status, draft_source, content_hash, created_by)
        VALUES (${sense.id}::uuid, 2, 'rejected', 'unknown', 'invalid', ${randomUUID()}::uuid)`,
      Prisma.sql`INSERT INTO sense_revision_texts (revision_id, language, kind, text)
        VALUES (${rev.id}::uuid, 'unknown', 'gloss', 'invalid')`,
      Prisma.sql`INSERT INTO sense_revision_texts (revision_id, language, kind, text)
        VALUES (${rev.id}::uuid, 'en', 'unknown', 'invalid')`,
    ];
    for (const statement of invalid) {
      await expect(ctx.prisma.$executeRaw(statement)).rejects.toThrow(/check constraint/i);
      expect(await snapshot()).toEqual(before);
    }
  });

  it('seed: the owner source exists with id OWNER_SOURCE_ID, kind owner, display_priority 0, and topics technology, marketing, business, food, daily-life exist with vi and en names', async () => {
    expect(await ctx.prisma.dataSource.findUniqueOrThrow({ where: { id: OWNER_SOURCE_ID } })).toMatchObject({
      id: '00000000-0000-4000-8000-000000000001', kind: 'owner', displayPriority: 0,
      version: '', license: '', attribution: '',
    });
    expect(await ctx.prisma.topic.findMany({ orderBy: { code: 'asc' } })).toEqual([
      { code: 'business', archivedAt: null }, { code: 'daily-life', archivedAt: null },
      { code: 'food', archivedAt: null }, { code: 'marketing', archivedAt: null }, { code: 'technology', archivedAt: null },
    ]);
    expect(await ctx.prisma.topicName.findMany({ orderBy: [{ topicCode: 'asc' }, { language: 'asc' }] })).toEqual([
      { topicCode: 'business', language: 'en', name: 'business' }, { topicCode: 'business', language: 'vi', name: 'Kinh doanh' },
      { topicCode: 'daily-life', language: 'en', name: 'daily-life' }, { topicCode: 'daily-life', language: 'vi', name: 'Đời sống' },
      { topicCode: 'food', language: 'en', name: 'food' }, { topicCode: 'food', language: 'vi', name: 'Ẩm thực' },
      { topicCode: 'marketing', language: 'en', name: 'marketing' }, { topicCode: 'marketing', language: 'vi', name: 'Tiếp thị' },
      { topicCode: 'technology', language: 'en', name: 'technology' }, { topicCode: 'technology', language: 'vi', name: 'Công nghệ' },
    ]);
  });

  it('seed: resetCatalog empties catalog records and non-owner sources while preserving the migration seeds', async () => {
    const before = await seeds();
    const { id: entryId } = await entry();
    const source = await ctx.prisma.dataSource.create({ data: { kind: 'third_party', name: 'test', displayPriority: 10 } });
    await ctx.prisma.entryVariant.create({ data: { entryId, text: 'banks', kind: 'alias', acceptedAsAnswer: true } });
    await ctx.prisma.entryLevel.create({ data: { entryId, sourceId: source.id, level: 'B1', basis: 'imported' } });
    const live = await ctx.prisma.sense.create({ data: { entryId, contextLabel: null, state: 'open' } });
    const rev = await revision(live.id, 1, 'published');
    await ctx.prisma.sense.update({ where: { id: live.id }, data: { liveRevisionId: rev.id } });
    const waiting = await ctx.prisma.sense.create({ data: { entryId, contextLabel: null, state: 'open', replacesSenseId: live.id } });
    expect(waiting).toMatchObject({
      entryId, contextLabel: live.contextLabel, state: 'open', replacesSenseId: live.id, liveRevisionId: null,
    });
    await ctx.prisma.senseRevisionText.create({ data: { revisionId: rev.id, language: 'vi', kind: 'gloss', text: 'ngân hàng' } });
    expect(await ctx.prisma.entry.count()).toBe(1);
    expect(await ctx.prisma.sense.count()).toBe(2);
    await resetCatalog(ctx.prisma);
    await resetCatalog(ctx.prisma);
    expect(await Promise.all([
      ctx.prisma.entry.count(), ctx.prisma.entryVariant.count(), ctx.prisma.entryLevel.count(),
      ctx.prisma.sense.count(), ctx.prisma.senseRevision.count(), ctx.prisma.senseRevisionText.count(),
      ctx.prisma.dataSource.count({ where: { kind: 'third_party' } }),
    ])).toEqual([0, 0, 0, 0, 0, 0, 0]);
    expect(await seeds()).toEqual(before);
  });
});
