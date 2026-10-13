import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { encodeBoundToken } from '../../src/common/pagination/page-token.util.js';
import { ContentService, type Level, type RevisionContent } from '../../src/content/index.js';
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
type Item = {
  sense_id: string; entry_id: string; lemma: string; pos: string; level: Level | null; is_function_word: boolean;
  context_label: string | null; meaning: { text: string; language: string; translation_missing: boolean };
  definition_en: string | null; examples: string[]; topics: Array<{ code: string; name: string }>;
};

describe('learner catalog reads (e2e, isolated database)', () => {
  let ctx: TestApp;
  let content: ContentService;
  let actorId: string;
  let viToken: string;
  let enToken: string;
  let incompleteToken: string;
  const get = (path = '', query: object = {}, token = viToken) =>
    ctx.http().get(`/v1/senses${path}`).set('Authorization', `Bearer ${token}`).query(query);
  const ids = (items: Item[]) => items.map(({ sense_id }) => sense_id);
  const catalog = async () => [
    await ctx.prisma.entry.findMany({ orderBy: { id: 'asc' }, include: {
      variants: { orderBy: { id: 'asc' } }, levels: { orderBy: { id: 'asc' } },
    } }),
    await ctx.prisma.sense.findMany({ orderBy: { id: 'asc' }, include: {
      revisions: { orderBy: { revisionNo: 'asc' }, include: {
        texts: { orderBy: [{ language: 'asc' }, { kind: 'asc' }] },
      } },
    } }),
    await ctx.prisma.topic.findMany({ orderBy: { code: 'asc' }, include: { names: { orderBy: { language: 'asc' } } } }),
  ];
  const write = <T>(lemma: string, action: (tx: Prisma.TransactionClient) => Promise<T>, pos = 'noun') =>
    ctx.prisma.$transaction(async (tx) => {
      await content.lockEntryKey(tx, lemma, pos);
      return action(tx);
    }, transactionOptions);
  const entry = (lemma: string, pos = 'noun', variants: string[] = []) => write(lemma,
    async (tx) => (await content.ensureEntry(tx, { lemma, pos, variants })).entry, pos);
  const draft = async (lemma: string, options: {
    pos?: string; variants?: string[]; contextLabel?: string; content?: Partial<RevisionContent>; level?: Level | false;
  } = {}) => {
    const row = await entry(lemma, options.pos, options.variants);
    const result = await write(row.lemma, async (tx) => {
      if (options.level !== false) await content.setEditorialLevel(tx, row.id, options.level ?? 'B1');
      return content.createSense(tx, { entryId: row.id, contextLabel: options.contextLabel ?? null,
        source: 'ui', actorId, content: { ...complete, ...options.content } });
    }, row.pos);
    return { entry: row, ...result };
  };
  const published = async (lemma: string, options: Parameters<typeof draft>[1] = {}) => {
    const row = await draft(lemma, options);
    expect(await content.publishItem({ senseId: row.senseId, revision: 1 }, actorId)).toEqual({ outcome: 'published' });
    return row;
  };
  const save = (row: Awaited<ReturnType<typeof draft>>, patch: Partial<RevisionContent>, baseRevision = 1) =>
    write(row.entry.lemma, (tx) => content.saveDraft(tx, {
      senseId: row.senseId, baseRevision, content: patch, source: 'ui', actorId,
    }), row.entry.pos);
  const rejected = async (request: () => ReturnType<typeof get>, status: number, slug: string) => {
    const before = await catalog();
    const res = await request();
    expect(res.status).toBe(status);
    expect(res.body.type).toBe(problem(slug));
    expect(await catalog()).toEqual(before);
  };
  const allPages = async (path: string, query: object, pageSize: number) => {
    const items: Item[] = [];
    let pageToken: string | undefined;
    do {
      const res = await get(path, { ...query, page_size: pageSize, ...(pageToken ? { page_token: pageToken } : {}) });
      expect(res.status).toBe(200);
      expect(res.body.items.length).toBeLessThanOrEqual(pageSize);
      items.push(...res.body.items);
      pageToken = res.body.next_page_token ?? undefined;
      if (pageToken) expect(res.body.items).toHaveLength(pageSize);
      expect(items.length).toBeLessThan(200); // Detect a repeated cursor without hanging the suite.
    } while (pageToken);
    expect(new Set(ids(items)).size).toBe(items.length);
    return items;
  };

  beforeAll(async () => {
    ctx = await createTestApp({ databaseUrl: await createIsolatedDatabase() });
    content = ctx.app.get(ContentService);
    ctx.clock.set(new Date('2026-10-12T12:00:00Z'));
    actorId = (await seedUser(ctx.prisma, { verified: true, staffRole: 'editor' })).userId;
    // Learner content also permits unverified emails and users with no staff permissions.
    const vi = await seedUser(ctx.prisma, { nativeLanguage: 'vi' });
    const en = await seedUser(ctx.prisma, { nativeLanguage: 'en' });
    const incomplete = await seedUser(ctx.prisma, { staffRole: 'admin', verified: true });
    viToken = (await startSession(ctx, vi.userId)).accessToken;
    enToken = (await startSession(ctx, en.userId)).accessToken;
    incompleteToken = (await startSession(ctx, incomplete.userId)).accessToken;
  });
  beforeEach(async () => {
    await resetCatalog(ctx.prisma);
    ctx.clock.set(new Date('2026-10-12T12:00:00Z'));
  });
  afterAll(async () => { await ctx?.close(); });

  it('B2#57: searching analyse finds analyze/analyse; lemma and every variant are case-insensitive and %, _ and \\ match only themselves', async () => {
    const analyze = await published('analyze', { pos: 'verb', variants: ['analyse', 'ANALYSE', 'inspect'] });
    for (const q of ['analyze', 'ANALYZE', 'analyse', 'AnAlYsE', 'INSPECT', 'naly', 'spect']) {
      const res = await get('/search', { q });
      expect(res.status).toBe(200);
      expect(ids(res.body.items)).toEqual([analyze.senseId]);
    }
    const nfc = await published('café');
    expect(ids((await get('/search', { q: '  CAFE\u0301  ' })).body.items)).toEqual([nfc.senseId]);
    await published('ordinary');
    for (const character of ['%', '_', '\\']) {
      const lemma = await published(`literal${character}word`);
      const variant = await published(`variant-${character === '%' ? 'percent' : character === '_' ? 'underscore' : 'slash'}`,
        { variants: [`alias${character}word`] });
      const res = await get('/search', { q: character });
      expect(res.status).toBe(200);
      expect(new Set(ids(res.body.items))).toEqual(new Set([lemma.senseId, variant.senseId]));
    }
    // Answer acceptance does not limit learner search of aliases.
    await write(analyze.entry.lemma, (tx) => content.setVariants(tx, analyze.entry.id,
      [{ text: 'examine', kind: 'alias', acceptedAsAnswer: false }]), analyze.entry.pos);
    expect(ids((await get('/search', { q: 'EXAMINE' })).body.items)).toEqual([analyze.senseId]);
  });

  it('B2#58: exact then prefix then contains use the best lemma/variant rank and explicit lemma, pos, sense id order across pages', async () => {
    const exact = [
      await published('cat'), await published('CAT'), await published('cat', { contextLabel: 'second' }),
      await published('cat', { pos: 'verb' }),
      await published('aardvark', { variants: ['cat', 'catapult', 'wildcat'] }),
    ];
    const prefix = [await published('catalog'), await published('alpha', { variants: ['catapult', 'wildcat'] })];
    const contains = [await published('bobcat'), await published('beta', { variants: ['wildcat', 'tomcat'] })];
    await published('unrelated');
    const expected: string[] = [];
    for (const group of [exact, prefix, contains]) {
      const rows = await ctx.prisma.sense.findMany({ where: { id: { in: group.map(({ senseId }) => senseId) } },
        orderBy: [{ entry: { lemma: 'asc' } }, { entry: { pos: 'asc' } }, { id: 'asc' }],
      });
      expected.push(...rows.map(({ id }) => id));
    }
    const full = await get('/search', { q: 'CAT', page_size: 100 });
    expect(full.status).toBe(200);
    expect(ids(full.body.items)).toEqual(expected);
    expect(full.body.next_page_token).toBeNull();
    for (const pageSize of [1, 2, 3]) expect(ids(await allPages('/search', { q: 'cat' }, pageSize))).toEqual(expected);
  });

  it('B2#59: draft, reviewed, rejected, unpublished, retired and entries without published senses stay invisible in search, browse and detail', async () => {
    const visible = await published('visibility-open');
    const hidden = [await draft('visibility-draft'), await draft('visibility-reviewed'), await draft('visibility-rejected')];
    for (const [index, action] of [[1, 'reviewed'], [2, 'rejected']] as const) {
      const row = hidden[index];
      await write(row.entry.lemma, (tx) => content.markRevisions(tx, [{ senseId: row.senseId, revision: 1, action }]));
    }
    const unpublished = await published('visibility-unpublished');
    const retired = await published('visibility-retired');
    await content.unpublish([unpublished.senseId]);
    await content.retire([retired.senseId]);
    hidden.push(unpublished, retired);
    const bare = await entry('visibility-no-sense');
    const before = await catalog();
    for (const [path, query] of [['/search', { q: 'visibility' }], ['', {}]] as const) {
      const res = await get(path, query);
      expect(res.status).toBe(200);
      expect(ids(res.body.items)).toEqual([visible.senseId]);
      expect(res.body.items.map((item: Item) => item.entry_id)).not.toContain(bare.id);
    }
    for (const row of hidden) await rejected(() => get(`/${row.senseId}`), 404, 'not-found');
    await rejected(() => get(`/${randomUUID()}`), 404, 'not-found');
    expect(await catalog()).toEqual(before);
    const stored = await ctx.prisma.sense.findMany({ where: { id: { in: hidden.map(({ senseId }) => senseId) } },
      include: { revisions: { orderBy: { revisionNo: 'desc' } } }, orderBy: { id: 'asc' },
    });
    expect(stored.find(({ id }) => id === hidden[1].senseId)?.revisions[0].status).toBe('reviewed');
    expect(stored.find(({ id }) => id === hidden[2].senseId)?.revisions[0].status).toBe('rejected');
    expect(stored.find(({ id }) => id === unpublished.senseId)?.state).toBe('unpublished');
    expect(stored.find(({ id }) => id === retired.senseId)?.state).toBe('retired');
  });

  it('B2#59 (live revision): newer draft, reviewed and rejected revisions never replace live meaning, examples or topic filters', async () => {
    const row = await published('live-bank');
    const newer = await save(row, { glossVi: 'bản nháp', definitionEn: 'Draft definition.', examplesEn: ['Draft example.'],
      topicCodes: ['food'], acceptedForms: ['secret-answer'] });
    for (const status of ['draft', 'reviewed', 'rejected'] as const) {
      if (status !== 'draft') await write(row.entry.lemma, (tx) =>
        tx.senseRevision.update({ where: { id: newer.revisionId }, data: { status } }));
      const detail = await get(`/${row.senseId}`);
      expect(detail.status).toBe(200);
      expect(detail.body).toMatchObject({ meaning: { text: complete.glossVi }, definition_en: complete.definitionEn,
        examples: complete.examplesEn, topics: [{ code: 'business', name: 'Kinh doanh' }] });
      expect((await get('', { topic: 'business' })).body.items).toEqual([detail.body]);
      expect((await get('', { topic: 'food' })).body.items).toEqual([]);
      expect((await get('/search', { q: 'live-bank' })).body.items).toEqual([detail.body]);
    }
  });

  it('B2#60: browse filters intersect on displayed level, live topic and pos in stable order, including flagged function words unless excluded', async () => {
    const target = await published('browse-bank');
    const functionWord = await published('browse-in', { pos: 'preposition' });
    const otherLevel = await published('browse-basic', { level: 'A1' });
    const otherTopic = await published('browse-food', { content: { topicCodes: ['food'] } });
    const otherPos = await published('browse-run', { pos: 'verb' });
    await draft('browse-draft');
    const source = await ctx.prisma.dataSource.create({ data: {
      kind: 'third_party', name: 'browse-source', version: '1.0', license: 'test', displayPriority: 10,
    } });
    // Imported B1 does not make the displayed editorial A1 match a B1 browse.
    await write(otherLevel.entry.lemma, (tx) => content.addImportedLevel(tx,
      { entryId: otherLevel.entry.id, sourceId: source.id, level: 'B1', extra: null }));
    const all = await allPages('', {}, 2);
    const ordered = await ctx.prisma.sense.findMany({ where: { state: 'open', liveRevisionId: { not: null } },
      orderBy: [{ entry: { lemma: 'asc' } }, { entry: { pos: 'asc' } }, { id: 'asc' }],
    });
    expect(ids(all)).toEqual(ordered.map(({ id }) => id));
    expect(all.find(({ sense_id }) => sense_id === functionWord.senseId)?.is_function_word).toBe(true);
    expect(all.find(({ sense_id }) => sense_id === target.senseId)?.is_function_word).toBe(false);
    for (const [query, expected] of [
      [{ level: 'B1', topic: 'business', pos: 'noun' }, [target.senseId]],
      [{ level: 'A1' }, [otherLevel.senseId]], [{ topic: 'food' }, [otherTopic.senseId]],
      [{ pos: 'verb' }, [otherPos.senseId]], [{ pos: 'preposition' }, [functionWord.senseId]],
      [{ topic: 'does-not-exist' }, []],
    ] as const) {
      const res = await get('', query);
      expect(res.status).toBe(200);
      expect(ids(res.body.items)).toEqual(expected);
    }
    const excluded = await get('', { exclude_function_words: 'true' });
    expect(excluded.status).toBe(200);
    expect(ids(excluded.body.items)).toEqual(ids(all).filter((id) => id !== functionWord.senseId));
    expect(excluded.body.items.every((item: Item) => !item.is_function_word)).toBe(true);
    expect(ids((await get('', { exclude_function_words: 'false' })).body.items)).toEqual(ids(all));
  });

  it('B2#61: vi uses the gloss, en uses its English definition, and absent native/English text falls back to the vi gloss with translation_missing', async () => {
    const both = await published('meaning-both', { contextLabel: 'finance' });
    const fallback = await published('meaning-fallback', { content: { definitionEn: null } });
    for (const [token, language, text, translationMissing, topicName] of [
      [viToken, 'vi', complete.glossVi, false, 'Kinh doanh'],
      [enToken, 'en', complete.definitionEn, false, 'business'],
    ] as const) {
      const detail = await get(`/${both.senseId}`, {}, token);
      expect(detail.status).toBe(200);
      expect(detail.body).toEqual({ sense_id: both.senseId, entry_id: both.entry.id, lemma: 'meaning-both', pos: 'noun',
        level: 'B1', is_function_word: false, context_label: 'finance',
        meaning: { text, language, translation_missing: translationMissing }, definition_en: complete.definitionEn,
        examples: complete.examplesEn, topics: [{ code: 'business', name: topicName }] });
      for (const [path, query] of [['/search', { q: 'meaning-both' }], ['', { topic: 'business' }]] as const) {
        const res = await get(path, query, token);
        expect(res.status).toBe(200);
        expect(res.body.items.find((item: Item) => item.sense_id === both.senseId)).toEqual(detail.body);
        for (const item of res.body.items) {
          expect(item).not.toHaveProperty('accepted_forms');
          expect(item).not.toHaveProperty('acceptedForms');
        }
      }
      const missing = await get(`/${fallback.senseId}`, {}, token);
      expect(missing.status).toBe(200);
      expect(missing.body.meaning).toEqual({ text: complete.glossVi, language: 'vi', translation_missing: token === enToken });
      expect(missing.body.definition_en).toBeNull();
      for (const [path, query] of [['/search', { q: 'meaning-fallback' }], ['', { topic: 'business' }]] as const) {
        expect((await get(path, query, token)).body.items.find((item: Item) => item.sense_id === fallback.senseId)).toEqual(missing.body);
      }
    }
  });

  it('B2#60 (displayed level): source priority and the lower level within one source win until the newest editorial choice, with imported rows unchanged', async () => {
    const cefr = await ctx.prisma.dataSource.create({ data: {
      kind: 'third_party', name: 'CEFR-J', version: '1.5', license: 'test', displayPriority: 10,
    } });
    const oct = await ctx.prisma.dataSource.create({ data: {
      kind: 'third_party', name: 'Octanove', version: '1.0', license: 'test', displayPriority: 20,
    } });
    const prioritized = await draft('source-priority', { level: false });
    const multiLevel = await draft('source-multiple', { level: false });
    await write(prioritized.entry.lemma, async (tx) => {
      await content.addImportedLevel(tx, { entryId: prioritized.entry.id, sourceId: oct.id, level: 'C1', extra: null });
      await content.addImportedLevel(tx, { entryId: prioritized.entry.id, sourceId: cefr.id, level: 'B1', extra: null });
    });
    await write(multiLevel.entry.lemma, async (tx) => {
      await content.addImportedLevel(tx, { entryId: multiLevel.entry.id, sourceId: oct.id, level: 'C2', extra: null });
      await content.addImportedLevel(tx, { entryId: multiLevel.entry.id, sourceId: oct.id, level: 'C1', extra: null });
    });
    for (const row of [prioritized, multiLevel]) {
      expect(await content.publishItem({ senseId: row.senseId, revision: 1 }, actorId)).toEqual({ outcome: 'published' });
    }
    const imported = await ctx.prisma.entryLevel.findMany({ where: { basis: 'imported' }, orderBy: { id: 'asc' } });
    for (const [value, senseId] of [['B1', prioritized.senseId], ['C1', multiLevel.senseId]] as const) {
      const res = await get('', { level: value, page_size: 1 });
      expect(res.status).toBe(200);
      expect(ids(res.body.items)).toEqual([senseId]);
      expect(res.body.items[0].level).toBe(value);
      expect(res.body.next_page_token).toBeNull();
    }
    expect((await get('', { level: 'C2' })).body.items).toEqual([]);
    for (const value of ['A2', 'B2', 'A2'] as const) {
      ctx.clock.advance(1_000);
      await write(prioritized.entry.lemma, (tx) => content.setEditorialLevel(tx, prioritized.entry.id, value));
      const detail = await get(`/${prioritized.senseId}`);
      expect(detail.status).toBe(200);
      expect(detail.body.level).toBe(value);
      expect((await get('', { level: value })).body.items).toEqual([detail.body]);
      expect((await get('', { level: 'B1' })).body.items).toEqual([]);
      expect((await get('/search', { q: prioritized.entry.lemma })).body.items).toEqual([detail.body]);
      expect(await ctx.prisma.entryLevel.findMany({ where: { basis: 'imported' }, orderBy: { id: 'asc' } })).toEqual(imported);
    }
  });

  it('B2#62: both lists default to 20, cap pages at 100 and reject malformed, cross-query, cross-filter and cross-route tokens without writes', async () => {
    for (let index = 0; index < 103; index++) await published(`page-${index.toString().padStart(3, '0')}`);
    for (const [path, query] of [['/search', { q: 'page' }], ['', {}]] as const) {
      const first = await get(path, query);
      expect(first.status).toBe(200);
      expect(first.body.items).toHaveLength(20);
      expect(first.body.next_page_token).toEqual(expect.any(String));
      const hundred = await get(path, { ...query, page_size: 100 });
      expect(hundred.status).toBe(200);
      expect(hundred.body.items).toHaveLength(100);
      const tail = await get(path, { ...query, page_size: 100, page_token: hundred.body.next_page_token });
      expect(tail.status).toBe(200);
      expect(tail.body.items).toHaveLength(3);
      expect(tail.body.next_page_token).toBeNull();
      const expected = await ctx.prisma.sense.findMany({ orderBy: [{ entry: { lemma: 'asc' } }, { entry: { pos: 'asc' } }, { id: 'asc' }] });
      expect(ids([...hundred.body.items, ...tail.body.items])).toEqual(expected.map(({ id }) => id));
      for (const pageSize of [0, 101, -1, 1.5, 'abc']) {
        await rejected(() => get(path, { ...query, page_size: pageSize }), 400, 'validation-failed');
      }
      const envelope = JSON.parse(Buffer.from(first.body.next_page_token, 'base64url').toString('utf8'));
      const malformed = ['bad-token!', '', Buffer.from('{}').toString('base64url'), `${first.body.next_page_token}=`,
        encodeBoundToken({ ...envelope.payload, rank: 3 }, envelope.binding),
        encodeBoundToken({ ...envelope.payload, id: 'bad-uuid' }, envelope.binding),
        encodeBoundToken({ ...envelope.payload, extra: 'unknown' }, envelope.binding),
        encodeBoundToken({ ...envelope.payload, lemma: 'bad\0lemma' }, envelope.binding),
      ];
      for (const pageToken of malformed) {
        await rejected(() => get(path, { ...query, page_token: pageToken }), 400, 'validation-failed');
      }
    }
    const search = await get('/search', { q: 'page', page_size: 1 });
    await rejected(() => get('/search', { q: 'other', page_token: search.body.next_page_token }), 400, 'validation-failed');
    await rejected(() => get('', { page_token: search.body.next_page_token }), 400, 'validation-failed');
    const browse = await get('', { level: 'B1', topic: 'business', pos: 'noun', page_size: 1 });
    for (const filter of [{ level: 'A1' }, { topic: 'food' }, { pos: 'verb' }, { exclude_function_words: 'true' }]) {
      await rejected(() => get('', { level: 'B1', topic: 'business', pos: 'noun', ...filter,
        page_token: browse.body.next_page_token }), 400, 'validation-failed');
    }
    await rejected(() => get('/search', { q: 'page', page_token: browse.body.next_page_token }), 400, 'validation-failed');
    // Normalized q preserves the same query; changing page size is allowed.
    const same = await get('/search', { q: '  PAGE  ', page_size: 2, page_token: search.body.next_page_token });
    expect(same.status).toBe(200);
    expect(same.body.items).toHaveLength(2);
    expect(ids(same.body.items)).not.toContain(search.body.items[0].sense_id);
    const sameFilters = await get('', { level: 'B1', topic: ' BUSINESS ', pos: 'noun', exclude_function_words: 'false',
      page_size: 2, page_token: browse.body.next_page_token });
    expect(sameFilters.status).toBe(200);
    expect(sameFilters.body.items).toHaveLength(2);
    expect(ids(sameFilters.body.items)).not.toContain(browse.body.items[0].sense_id);
  }, 60_000);

  it('B2#62 (Unicode): 100-code-point lemmas paginate on both lists without counting surrogate pairs twice', async () => {
    for (const lemma of ['😀'.repeat(100), `${'😀'.repeat(99)}😁`]) await published(lemma);
    const expected = await ctx.prisma.sense.findMany({
      orderBy: [{ entry: { lemma: 'asc' } }, { entry: { pos: 'asc' } }, { id: 'asc' }],
    });
    for (const [path, query] of [['/search', { q: '😀' }], ['', {}]] as const) {
      expect(ids(await allPages(path, query, 1))).toEqual(expected.map(({ id }) => id));
    }
  });

  it('B2#62 (validation): bad browse filters, unknown parameters, missing q, NUL and malformed ids return 400 with persisted state unchanged', async () => {
    await published('valid');
    for (const query of [{ level: 'Z9' }, { topic: 'bad/topic' }, { pos: 'vern' }, { exclude_function_words: '1' },
      { exclude_function_words: '' }, { unknown: 'value' }, { q: 'valid' }]) {
      await rejected(() => get('', query), 400, 'validation-failed');
    }
    await rejected(() => get('/search'), 400, 'validation-failed');
    await rejected(() => get('/search', { q: 'bad\0query' }), 400, 'validation-failed');
    await rejected(() => get('/not-a-uuid'), 400, 'validation-failed');
  });

  it('B2#63 (all learner routes): no native_language is 403 profile-incomplete, no valid token is 401, and unverified learners need no staff permission', async () => {
    const row = await published('authenticated');
    const routes = [['/search', { q: 'authenticated' }], ['', {}], [`/${row.senseId}`, {}]] as const;
    for (const [path, query] of routes) {
      await rejected(() => get(path, query, incompleteToken), 403, 'profile-incomplete');
      await rejected(() => ctx.http().get(`/v1/senses${path}`).query(query), 401, 'invalid-token');
      await rejected(() => get(path, query, 'invalid-token'), 401, 'invalid-token');
      const allowed = await get(path, query);
      expect(allowed.status).toBe(200);
      expect(path.startsWith('/search') || path === '' ? ids(allowed.body.items) : [allowed.body.sense_id]).toEqual([row.senseId]);
    }
  });

  it('B2E21 (Review Focus 5): %, _ and \\ match literally, spaces-only and 101-character q are 400, and unpublished-only matches return an empty list', async () => {
    for (const q of ['%', '_', '\\']) {
      const row = await published(q);
      await published(`ordinary-${q === '%' ? 'percent' : q === '_' ? 'underscore' : 'slash'}`);
      const res = await get('/search', { q });
      expect(res.status).toBe(200);
      expect(ids(res.body.items)).toEqual([row.senseId]);
    }
    for (const q of ['', '   ', '\t\n', 'x'.repeat(101), '😀'.repeat(101)]) {
      await rejected(() => get('/search', { q }), 400, 'validation-failed');
    }
    const boundary = await published('x'.repeat(100));
    expect(ids((await get('/search', { q: 'x'.repeat(100) })).body.items)).toEqual([boundary.senseId]);
    const hidden = await published('only-unpublished');
    await content.unpublish([hidden.senseId]);
    const res = await get('/search', { q: 'only-unpublished' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ items: [], next_page_token: null });
  });

  it('B2E23: the same lemma with published noun and verb senses returns both as separate results', async () => {
    const noun = await published('walk');
    const verb = await published('walk', { pos: 'verb' });
    const res = await get('/search', { q: 'walk' });
    expect(res.status).toBe(200);
    expect(ids(res.body.items)).toEqual([noun.senseId, verb.senseId]);
    expect(res.body.items.map((item: Item) => item.pos)).toEqual(['noun', 'verb']);
    expect(new Set(res.body.items.map((item: Item) => item.entry_id)).size).toBe(2);
  });

  it('B2E20: a topic archived after publishing remains on the published sense in search, browse and detail with localized names', async () => {
    const code = `learner-archived-${randomUUID()}`;
    await ctx.prisma.topic.create({ data: { code, names: { create: [
      { language: 'vi', name: 'Chủ đề lưu trữ' }, { language: 'en', name: 'Archived topic' },
    ] } } });
    const row = await published('archived-topic', { content: { topicCodes: [code] } });
    await ctx.prisma.topic.update({ where: { code }, data: { archivedAt: ctx.clock.now() } });
    const before = await catalog();
    for (const [token, name] of [[viToken, 'Chủ đề lưu trữ'], [enToken, 'Archived topic']] as const) {
      const detail = await get(`/${row.senseId}`, {}, token);
      expect(detail.status).toBe(200);
      expect(detail.body.topics).toEqual([{ code, name }]);
      for (const [path, query] of [['/search', { q: 'archived-topic' }], ['', { topic: code }]] as const) {
        const res = await get(path, query, token);
        expect(res.status).toBe(200);
        expect(res.body.items).toEqual([detail.body]);
      }
    }
    expect(await catalog()).toEqual(before);
  });

  it('B2#43 (visibility): a freshly published complete sense appears immediately in search, browse and detail', async () => {
    const row = await draft('freshly-published');
    expect((await get('/search', { q: row.entry.lemma })).body.items).toEqual([]);
    expect((await get('')).body.items).toEqual([]);
    expect(await content.publishItem({ senseId: row.senseId, revision: 1 }, actorId)).toEqual({ outcome: 'published' });
    expect(await ctx.prisma.sense.findUniqueOrThrow({ where: { id: row.senseId } })).toMatchObject({
      state: 'open', liveRevisionId: row.revisionId,
    });
    const detail = await get(`/${row.senseId}`);
    expect(detail.status).toBe(200);
    expect((await get('/search', { q: row.entry.lemma })).body.items).toEqual([detail.body]);
    expect((await get('')).body.items).toEqual([detail.body]);
  });

  it('B2#51 (browse): exclude_function_words follows true and false overrides and clearing the override restores the derived flag', async () => {
    const noun = await published('override-noun');
    const preposition = await published('override-preposition', { pos: 'preposition' });
    const flags = async (nounFlag: boolean, prepositionFlag: boolean) => {
      const res = await get('');
      expect(res.status).toBe(200);
      expect(res.body.items.find((item: Item) => item.sense_id === noun.senseId)?.is_function_word).toBe(nounFlag);
      expect(res.body.items.find((item: Item) => item.sense_id === preposition.senseId)?.is_function_word).toBe(prepositionFlag);
      const excluded = await get('', { exclude_function_words: 'true' });
      expect(excluded.status).toBe(200);
      expect(ids(excluded.body.items)).toEqual([...(nounFlag ? [] : [noun.senseId]), ...(prepositionFlag ? [] : [preposition.senseId])]);
    };
    await flags(false, true);
    await write(noun.entry.lemma, (tx) => content.setFunctionWordOverride(tx, noun.entry.id, true));
    await write(preposition.entry.lemma, (tx) => content.setFunctionWordOverride(tx, preposition.entry.id, false), preposition.entry.pos);
    await flags(true, false);
    await write(noun.entry.lemma, (tx) => content.setFunctionWordOverride(tx, noun.entry.id, null));
    await write(preposition.entry.lemma, (tx) => content.setFunctionWordOverride(tx, preposition.entry.id, null), preposition.entry.pos);
    await flags(false, true);
    expect(await ctx.prisma.entry.findUniqueOrThrow({ where: { id: noun.entry.id } })).toMatchObject({
      functionWordDerived: false, functionWordOverride: null,
    });
    expect(await ctx.prisma.entry.findUniqueOrThrow({ where: { id: preposition.entry.id } })).toMatchObject({
      functionWordDerived: true, functionWordOverride: null,
    });
  });
});
