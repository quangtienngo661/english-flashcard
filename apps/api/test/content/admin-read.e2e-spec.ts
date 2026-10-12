import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { encodeBoundToken } from '../../src/common/pagination/page-token.util.js';
import { ContentService, OWNER_SOURCE_ID, type Level, type RevisionContent } from '../../src/content/index.js';
import type { Prisma } from '../../src/generated/prisma/client.js';
import { seedUser, startSession } from '../support/auth-helpers.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';
import { resetCatalog } from '../support/reset-catalog.js';

const transactionOptions = { timeout: 10_000, maxWait: 5_000 };
const problem = (slug: string) => `https://api.example.com/problems/${slug}`;
const complete: RevisionContent = {
  glossVi: 'ngân hàng', definitionEn: 'A financial institution.', examplesEn: ['I visited the bank.'],
  topicCodes: ['business'], acceptedForms: ['banks'],
};
type EntryView = { id: string; lemma: string; pos: string; displayed_level: Level | null; conflict: boolean };
type SenseView = { sense_id: string; revision: number; status: string; missing?: string[] };

describe('admin catalog reads (e2e, isolated database)', () => {
  let ctx: TestApp;
  let content: ContentService;
  let actorId: string;
  let token: string;
  const get = (path: string, query: object = {}) => ctx.http().get(`/v1/admin/content/${path}`)
    .set('Authorization', `Bearer ${token}`).query(query);
  const catalog = async () => [
    await ctx.prisma.entry.findMany({ orderBy: { id: 'asc' }, include: {
      variants: { orderBy: { id: 'asc' } }, levels: { orderBy: { id: 'asc' } },
    } }),
    await ctx.prisma.sense.findMany({ orderBy: { id: 'asc' }, include: {
      revisions: { orderBy: { revisionNo: 'asc' }, include: {
        texts: { orderBy: [{ language: 'asc' }, { kind: 'asc' }] },
      } },
    } }),
  ];
  const write = <T>(lemma: string, action: (tx: Prisma.TransactionClient) => Promise<T>, pos = 'noun') =>
    ctx.prisma.$transaction(async (tx) => {
      await content.lockEntryKey(tx, lemma, pos);
      return action(tx);
    }, transactionOptions);
  const entry = (lemma: string, pos = 'noun') => write(lemma,
    async (tx) => (await content.ensureEntry(tx, { lemma, pos, variants: [] })).entry, pos);
  const source = (name: string, displayPriority: number) => ctx.prisma.dataSource.create({ data: {
    name, kind: 'third_party', version: '1.0', license: 'test', displayPriority,
  } });
  const level = (row: { id: string; lemma: string; pos: string }, sourceId: string, value: Level) =>
    write(row.lemma, (tx) => content.addImportedLevel(tx, { entryId: row.id, sourceId, level: value, extra: null }), row.pos);
  const sense = async (lemma: string, options: { level?: boolean; content?: Partial<RevisionContent>; pos?: string } = {}) => {
    const row = await entry(lemma, options.pos);
    const result = await write(row.lemma, async (tx) => {
      if (options.level !== false) await content.setEditorialLevel(tx, row.id, 'B1');
      return content.createSense(tx, { entryId: row.id, contextLabel: null, source: 'ui', actorId,
        content: { ...complete, ...options.content } });
    }, row.pos);
    return { entry: row, ...result };
  };
  const save = (row: Awaited<ReturnType<typeof sense>>, patch: Partial<RevisionContent>, baseRevision = 1) =>
    write(row.entry.lemma, (tx) => content.saveDraft(tx, {
      senseId: row.senseId, baseRevision, content: patch, source: 'ui', actorId,
    }), row.entry.pos);

  beforeAll(async () => {
    ctx = await createTestApp({ databaseUrl: await createIsolatedDatabase() });
    content = ctx.app.get(ContentService);
    ctx.clock.set(new Date('2026-10-12T12:00:00Z'));
    actorId = (await seedUser(ctx.prisma, { verified: true, staffRole: 'editor' })).userId;
    token = (await startSession(ctx, actorId)).accessToken;
  });
  beforeEach(async () => {
    await resetCatalog(ctx.prisma);
    ctx.clock.set(new Date('2026-10-12T12:00:00Z'));
  });
  afterAll(async () => { await ctx?.close(); });

  it('B2#52a: entries with conflict=true, has_sense=false, level and q match every given filter', async () => {
    const cefr = await source('CEFR-J', 10);
    const oct = await source('Octanove', 20);
    const target = await entry('bank');
    const otherLevel = await entry('banking');
    const otherQuery = await entry('river');
    const noConflict = await entry('banker');
    for (const row of [target, otherQuery]) {
      await level(row, cefr.id, 'B1');
      await level(row, oct.id, 'C1');
    }
    const hasSense = await entry('bank-account');
    await level(hasSense, cefr.id, 'B1');
    await level(hasSense, oct.id, 'C1');
    await write(hasSense.lemma, (tx) => content.createSense(tx, { entryId: hasSense.id, contextLabel: null, source: 'ui', actorId }));
    await level(otherLevel, cefr.id, 'A1');
    await level(otherLevel, oct.id, 'C1');
    await level(noConflict, cefr.id, 'B1');
    const res = await get('entries', { conflict: 'true', has_sense: 'false', level: 'B1', q: 'bank' });
    expect(res.status).toBe(200);
    expect(res.body.items.map((item: EntryView) => item.id)).toEqual([target.id]);
    expect(res.body.items[0]).toMatchObject({ conflict: true, displayed_level: 'B1', senses: [] });
    expect((await get('entries', { conflict: 'false', has_sense: 'false', level: 'B1', q: 'bank' })).body.items
      .map((item: EntryView) => item.id)).toEqual([noConflict.id]);
    expect((await get('entries', { conflict: 'true', has_sense: 'true', level: 'B1', q: 'bank' })).body.items
      .map((item: EntryView) => item.id)).toEqual([hasSense.id]);
  });

  it('B2#15 (read): all imported levels remain, source priority wins until the latest editorial choice, and one source C1+C2 displays C1', async () => {
    const cefr = await source('CEFR-J', 10);
    const oct = await source('Octanove', 20);
    const row = await entry('bank');
    const octOnly = await entry('oct-only');
    await level(row, cefr.id, 'B1');
    await level(row, oct.id, 'C1');
    await level(octOnly, oct.id, 'C2');
    await level(octOnly, oct.id, 'C1');
    const before = await ctx.prisma.entryLevel.findMany({ where: { entryId: row.id }, orderBy: { id: 'asc' } });
    const first = await get('entries');
    expect(first.status).toBe(200);
    expect(first.body.items.find((item: EntryView) => item.id === row.id)).toMatchObject({ displayed_level: 'B1', conflict: true,
      levels: expect.arrayContaining([
        expect.objectContaining({ level: 'B1', source_id: cefr.id, basis: 'imported', source: expect.objectContaining({ name: 'CEFR-J', version: '1.0' }) }),
        expect.objectContaining({ level: 'C1', source_id: oct.id, basis: 'imported' }),
      ]) });
    expect(first.body.items.find((item: EntryView) => item.id === octOnly.id)).toMatchObject({ displayed_level: 'C1', conflict: true });
    await write(row.lemma, (tx) => content.setEditorialLevel(tx, row.id, 'A2'));
    ctx.clock.advance(1_000);
    await write(row.lemma, (tx) => content.setEditorialLevel(tx, row.id, 'B2'));
    const editorial = (await get('entries')).body.items.find((item: EntryView) => item.id === row.id);
    expect(editorial).toMatchObject({ displayed_level: 'B2', conflict: false });
    expect(editorial.levels).toHaveLength(4);
    expect(editorial.levels).toEqual(expect.arrayContaining([expect.objectContaining({ level: 'B2', source_id: OWNER_SOURCE_ID, basis: 'editorial' })]));
    expect(await ctx.prisma.entryLevel.findMany({ where: { entryId: row.id, basis: 'imported' }, orderBy: { id: 'asc' } })).toEqual(before);
    ctx.clock.advance(1_000);
    await write(row.lemma, (tx) => content.setEditorialLevel(tx, row.id, 'A2'));
    expect((await get('entries')).body.items.find((item: EntryView) => item.id === row.id)).toMatchObject({ displayed_level: 'A2', conflict: false });
  });

  it('B2#69: every staff read returns catalog entries, variants, effective flags and latest sense content through centralized queries', async () => {
    const row = await sense('catalog-bank');
    await write(row.entry.lemma, async (tx) => {
      await content.setVariants(tx, row.entry.id, [{ text: 'catalog-banque', kind: 'alias', acceptedAsAnswer: false }]);
      await content.setFunctionWordOverride(tx, row.entry.id, true);
    });
    await save(row, { definitionEn: 'Latest definition.' });
    const before = await catalog();
    const entries = await get('entries');
    const senses = await get('senses');
    const detail = await get(`senses/${row.senseId}`);
    for (const res of [entries, senses, detail]) expect(res.status).toBe(200);
    expect(entries.body.items).toHaveLength(1);
    expect(entries.body.items[0]).toMatchObject({ id: row.entry.id, language: 'en', entry_type: 'word', function_word: true,
      function_word_derived: false, function_word_override: true,
      variants: [expect.objectContaining({ text: 'catalog-banque', kind: 'alias', accepted_as_answer: false })],
      senses: [expect.objectContaining({ sense_id: row.senseId, revision: 2, status: 'draft' })] });
    expect(senses.body.items).toEqual([detail.body]);
    expect(detail.body).toMatchObject({ sense_id: row.senseId, entry_id: row.entry.id, lemma: row.entry.lemma, pos: 'noun',
      revision: 2, status: 'draft', content: { gloss_vi: complete.glossVi, definition_en: 'Latest definition.',
        examples_en: complete.examplesEn, topics: complete.topicCodes, accepted_forms: complete.acceptedForms } });
    expect(await catalog()).toEqual(before);
    const controller = await readFile(new URL('../../src/content/catalog/admin-catalog.controller.ts', import.meta.url), 'utf8');
    const queries = await readFile(new URL('../../src/content/catalog/admin-catalog.queries.ts', import.meta.url), 'utf8');
    expect(controller).not.toContain('PRISMA_CLIENT');
    expect(queries).toContain('PRISMA_CLIENT');
    const absentBefore = await catalog();
    const absent = await get(`senses/${randomUUID()}`);
    expect(absent.status).toBe(404);
    expect(absent.body.type).toBe(problem('not-found'));
    expect(await catalog()).toEqual(absentBefore);
  });

  it('B2#56a (read): unpublishable uses each latest open revision and returns exactly the shared publish violations', async () => {
    const missing = [];
    for (let mask = 1; mask < 16; mask++) {
      const row = await sense(`missing-${mask.toString().padStart(2, '0')}`, { level: !(mask & 4), content: {
        glossVi: mask & 1 ? null : complete.glossVi, examplesEn: mask & 2 ? [] : complete.examplesEn,
        topicCodes: mask & 8 ? [] : complete.topicCodes,
      } });
      const violations = [
        ...(mask & 1 ? ['gloss-missing'] : []), ...(mask & 2 ? ['example-missing'] : []),
        ...(mask & 4 ? ['level-missing'] : []), ...(mask & 8 ? ['topic-missing'] : []),
      ];
      missing.push({ row, violations });
    }
    const ready = await sense('ready');
    const repaired = await sense('repaired', { content: { examplesEn: [] } });
    await save(repaired, { examplesEn: complete.examplesEn });
    const rejected = await sense('rejected', { content: { examplesEn: [] } });
    await write(rejected.entry.lemma, (tx) => content.markRevisions(tx, [{ senseId: rejected.senseId, revision: 1, action: 'rejected' }]));
    const retired = await sense('retired', { content: { examplesEn: [] } });
    await content.retire([retired.senseId]);
    const reviewed = missing[0].row;
    await write(reviewed.entry.lemma, (tx) => content.markRevisions(tx, [{ senseId: reviewed.senseId, revision: 1, action: 'reviewed' }]));
    const before = await catalog();
    const res = await get('senses', { status: 'unpublishable' });
    expect(res.status).toBe(200);
    expect(res.body.items.map((item: SenseView) => item.sense_id)).toEqual(missing.map(({ row }) => row.senseId));
    for (const { row, violations } of missing) {
      expect(res.body.items.find((item: SenseView) => item.sense_id === row.senseId)).toMatchObject({ revision: 1, missing: violations });
      expect(await content.publishItem({ senseId: row.senseId, revision: 1 }, actorId)).toEqual({ outcome: 'refused', reason: 'publish-incomplete', violations });
    }
    expect(res.body.items[0].status).toBe('reviewed');
    expect(res.body.items.map((item: SenseView) => item.sense_id)).not.toContain(ready.senseId);
    expect(await catalog()).toEqual(before);
  });

  it('B2#56a (read archived topic): archived-only topics are missing, while any active topic suffices', async () => {
    const code = `archived-${randomUUID()}`;
    await ctx.prisma.topic.create({ data: { code } });
    const archivedOnly = await sense('archived-only', { content: { topicCodes: [code] } });
    await sense('also-active', { content: { topicCodes: [code, 'business'] } });
    await ctx.prisma.topic.update({ where: { code }, data: { archivedAt: ctx.clock.now() } });
    const before = await catalog();
    const res = await get('senses', { status: 'unpublishable' });
    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([expect.objectContaining({ sense_id: archivedOnly.senseId, missing: ['topic-missing'] })]);
    expect(await catalog()).toEqual(before);
  });

  it('B2#56a (read latest): repeated sense_id, level, pos, topic and status intersect, and published senses still return their newest draft', async () => {
    const live = await sense('live-bank');
    expect(await content.publishItem({ senseId: live.senseId, revision: 1 }, actorId)).toEqual({ outcome: 'published' });
    await save(live, { definitionEn: 'Latest live draft.', examplesEn: [] });
    const otherPos = await sense('live-verb', { pos: 'verb' });
    const otherTopic = await sense('other-topic', { content: { topicCodes: ['food'] } });
    const otherLevel = await sense('other-level');
    ctx.clock.advance(1_000);
    await write(otherLevel.entry.lemma, (tx) => content.setEditorialLevel(tx, otherLevel.entry.id, 'A1'));
    const filter = { sense_id: [live.senseId, otherPos.senseId, otherTopic.senseId, otherLevel.senseId], level: 'B1', pos: 'noun', topic: 'business' };
    const selected = await get('senses', filter);
    expect(selected.status).toBe(200);
    expect(selected.body.items).toEqual([expect.objectContaining({ sense_id: live.senseId, revision: 2, status: 'draft' })]);
    const published = await get('senses', { ...filter, status: 'published' });
    expect(published.status).toBe(200);
    expect(published.body.items).toEqual(selected.body.items);
    expect((await get('senses', { ...filter, status: 'open_draft' })).body.items).toEqual(selected.body.items);
    expect((await get('senses', { ...filter, status: 'unpublishable' })).body.items).toEqual([
      expect.objectContaining({ sense_id: live.senseId, revision: 2, missing: ['example-missing'] }),
    ]);
    expect((await get('senses', { sense_id: live.senseId })).body.items).toHaveLength(1);
    await content.unpublish([live.senseId]);
    expect((await get('senses', { status: 'published', sense_id: live.senseId })).body.items).toEqual([]);
    const latest = await content.latestRevisions([live.senseId, otherTopic.senseId, randomUUID(), live.senseId]);
    expect([...latest.keys()].sort()).toEqual([live.senseId, otherTopic.senseId].sort());
    expect(latest.get(live.senseId)).toEqual({ revisionNo: 2, status: 'draft', content: { ...complete, definitionEn: 'Latest live draft.', examplesEn: [] } });
    expect(await content.latestRevisions([])).toEqual(new Map());
  });

  it('B2#62 (admin): both lists default to 20, accept 100, and paginate every row once in explicit lemma, pos, id order', async () => {
    for (let index = 0; index < 103; index++) await sense(`page-${index.toString().padStart(3, '0')}`);
    await sense('page-000', { pos: 'verb' });
    const first = await ctx.prisma.entry.findFirstOrThrow({ where: { lemma: 'page-000', pos: 'noun' } });
    const second = await write(first.lemma, (tx) => content.createSense(tx, { entryId: first.id, contextLabel: 'second', source: 'ui', actorId }));
    for (const path of ['entries', 'senses'] as const) {
      const defaultPage = await get(path);
      expect(defaultPage.status).toBe(200);
      expect(defaultPage.body.items).toHaveLength(20);
      expect(defaultPage.body.next_page_token).toEqual(expect.any(String));
      const firstPage = await get(path, { page_size: 100 });
      expect(firstPage.status).toBe(200);
      expect(firstPage.body.items).toHaveLength(100);
      const next = await get(path, { page_size: 100, page_token: firstPage.body.next_page_token });
      expect(next.status).toBe(200);
      expect(next.body.items).toHaveLength(path === 'entries' ? 4 : 5);
      expect(next.body.next_page_token).toBeNull();
      const actual = [...firstPage.body.items, ...next.body.items].map((item: { id?: string; sense_id?: string }) => path === 'entries' ? item.id : item.sense_id);
      const expected = path === 'entries'
        ? (await ctx.prisma.entry.findMany({ orderBy: [{ lemma: 'asc' }, { pos: 'asc' }, { id: 'asc' }] })).map(({ id }) => id)
        : (await ctx.prisma.sense.findMany({ orderBy: [{ entry: { lemma: 'asc' } }, { entry: { pos: 'asc' } }, { id: 'asc' }] })).map(({ id }) => id);
      expect(actual).toEqual(expected);
      expect(new Set(actual).size).toBe(actual.length);
    }
    // Missing-item filtering must fill pages across chunks of otherwise publishable drafts.
    const sparseIds = [second.senseId];
    for (const index of [0, 50, 100]) {
      const row = await ctx.prisma.sense.findFirstOrThrow({ where: {
        entry: { lemma: `page-${index.toString().padStart(3, '0')}`, pos: 'noun' }, contextLabel: null,
      }, include: { entry: true } });
      await write(row.entry.lemma, (tx) => content.saveDraft(tx, {
        senseId: row.id, baseRevision: 1, content: { examplesEn: [] }, source: 'ui', actorId,
      }));
      sparseIds.push(row.id);
    }
    const sparseOrder = (await ctx.prisma.sense.findMany({ where: { id: { in: sparseIds } },
      orderBy: [{ entry: { lemma: 'asc' } }, { entry: { pos: 'asc' } }, { id: 'asc' }],
    })).map(({ id }) => id);
    const sparse = await get('senses', { status: 'unpublishable', page_size: 100 });
    expect(sparse.status).toBe(200);
    expect(sparse.body.items.map((item: SenseView) => item.sense_id)).toEqual(sparseOrder);
    expect(sparse.body.next_page_token).toBeNull();
    const sparseFirst = await get('senses', { status: 'unpublishable', page_size: 2 });
    const sparseNext = await get('senses', { status: 'unpublishable', page_size: 2, page_token: sparseFirst.body.next_page_token });
    expect(sparseFirst.status).toBe(200);
    expect(sparseNext.status).toBe(200);
    expect(sparseFirst.body.items).toHaveLength(2);
    expect(sparseNext.body.items).toHaveLength(2);
    expect([...sparseFirst.body.items, ...sparseNext.body.items].map((item: SenseView) => item.sense_id)).toEqual(sparseOrder);
    expect(sparseNext.body.next_page_token).toBeNull();
    const before = await catalog();
    const entryToken = (await get('entries', { page_size: 1 })).body.next_page_token;
    const senseToken = (await get('senses', { page_size: 1 })).body.next_page_token;
    for (const path of ['entries', 'senses']) {
      for (const query of [
        { page_token: 'garbage' }, { page_token: encodeBoundToken({ id: 'bad' }, 'foreign') },
        { page_token: path === 'entries' ? senseToken : entryToken },
        { page_token: path === 'entries' ? entryToken : senseToken, level: 'A1' },
        { page_size: 0 }, { page_size: 101 },
      ]) {
        const rejected = await get(path, query);
        expect(rejected.status).toBe(400);
        expect(rejected.body.type).toBe(problem('validation-failed'));
        expect(await catalog()).toEqual(before);
      }
    }
  });

  it('B2#62 (admin normalized filters): equivalent filters reuse tokens; literal query characters and malformed filters are safe', async () => {
    await entry('100%bank');
    await entry('100%river');
    await entry('100-bank');
    await entry('under_score');
    await entry('back\\slash');
    const first = await get('entries', { q: '  100%  ', page_size: 1 });
    expect(first.status).toBe(200);
    expect(first.body.items).toHaveLength(1);
    const next = await get('entries', { q: '100%', page_size: 1, page_token: first.body.next_page_token });
    expect(next.status).toBe(200);
    expect(next.body.items).toHaveLength(1);
    expect(new Set([first.body.items[0].id, next.body.items[0].id]).size).toBe(2);
    for (const q of ['_', '\\']) expect((await get('entries', { q })).body.items).toHaveLength(1);
    const selection = [await sense('selection-one'), await sense('selection-two')];
    const selectionIds = selection.map(({ senseId }) => senseId);
    const selected = await get('senses', { sense_id: selectionIds, page_size: 1 });
    expect(selected.status).toBe(200);
    const selectedNext = await get('senses', {
      sense_id: [selectionIds[1], selectionIds[0], selectionIds[1]], page_size: 1, page_token: selected.body.next_page_token,
    });
    expect(selectedNext.status).toBe(200);
    expect(selectedNext.body.items).toHaveLength(1);
    expect(new Set([selected.body.items[0].sense_id, selectedNext.body.items[0].sense_id])).toEqual(new Set(selectionIds));
    const before = await catalog();
    for (const [path, query] of [
      ['entries', { q: ' ' }], ['entries', { q: 'x'.repeat(101) }], ['entries', { q: 'bad\0query' }],
      ['entries', { conflict: 'yes' }], ['entries', { has_sense: '0' }], ['entries', { level: 'D1' }],
      ['entries', { unknown: 'value' }], ['senses', { sense_id: 'bad-id' }], ['senses', { status: 'draft' }],
      ['senses', { pos: 'vern' }], ['senses', { topic: 'bad\0topic' }], ['senses/bad-id', {}],
      ['senses', { sense_id: selectionIds[0], page_token: selected.body.next_page_token }],
    ] as const) {
      const res = await get(path, query);
      expect(res.status).toBe(400);
      expect(res.body.type).toBe(problem('validation-failed'));
      expect(await catalog()).toEqual(before);
    }
  });

  it('B2#62 (admin Unicode): valid 100-character lemmas paginate without counting surrogate pairs as extra characters', async () => {
    const lemmas = ['😀'.repeat(100), `${'😀'.repeat(99)}😁`];
    for (const lemma of lemmas) await sense(lemma);
    for (const path of ['entries', 'senses'] as const) {
      const first = await get(path, { page_size: 1 });
      expect(first.status).toBe(200);
      expect(first.body.items).toHaveLength(1);
      expect(first.body.next_page_token).toEqual(expect.any(String));
      const next = await get(path, { page_size: 1, page_token: first.body.next_page_token });
      expect(next.status).toBe(200);
      expect(next.body.items).toHaveLength(1);
      expect(next.body.next_page_token).toBeNull();
      expect(new Set([first.body.items[0].lemma, next.body.items[0].lemma])).toEqual(new Set(lemmas));
    }
  });

  it('batch_id without a BatchScope provider returns 400 batch-filter-unavailable on both lists and persists nothing', async () => {
    await sense('batch-bank');
    const before = await catalog();
    for (const path of ['entries', 'senses']) {
      const res = await get(path, { batch_id: randomUUID() });
      expect(res.status).toBe(400);
      expect(res.body.type).toBe(problem('batch-filter-unavailable'));
      expect(await catalog()).toEqual(before);
    }
  });
});
