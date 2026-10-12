import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ContentService, OWNER_SOURCE_ID, splitHeadword, type Level } from '../../src/content/index.js';
import type { Prisma } from '../../src/generated/prisma/client.js';
import { seedUser, startSession } from '../support/auth-helpers.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';
import { resetCatalog } from '../support/reset-catalog.js';
import { testConfig } from '../support/test-config.js';

const transactionOptions = { timeout: 10_000, maxWait: 5_000 };
const problem = (slug: string) => `https://api.example.com/problems/${slug}`;

describe('entries, variants and levels (e2e, isolated database)', () => {
  let ctx: TestApp;
  let content: ContentService;
  const catalog = () => Promise.all([
    ctx.prisma.entry.findMany({ orderBy: { id: 'asc' } }),
    ctx.prisma.entryVariant.findMany({ orderBy: { id: 'asc' } }),
    ctx.prisma.entryLevel.findMany({ orderBy: { id: 'asc' } }),
    ctx.prisma.sense.findMany({ orderBy: { id: 'asc' } }),
    ctx.prisma.senseRevision.findMany({ orderBy: { id: 'asc' } }),
    ctx.prisma.senseRevisionText.findMany({ orderBy: [{ revisionId: 'asc' }, { language: 'asc' }, { kind: 'asc' }] }),
    ctx.prisma.dataSource.findMany({ orderBy: { id: 'asc' } }),
  ]);
  const write = <T>(lemma: string, pos: string, action: (tx: Prisma.TransactionClient) => Promise<T>) =>
    ctx.prisma.$transaction(async (tx) => {
      await content.lockEntryKey(tx, lemma, pos);
      return action(tx);
    }, transactionOptions);
  const ensure = (headword: string, pos: string) => {
    const input = { ...splitHeadword(headword), pos };
    return write(input.lemma, pos, (tx) => content.ensureEntry(tx, input));
  };
  const source = (name: string, version: string, displayPriority: number) => ctx.prisma.dataSource.create({ data: {
    kind: 'third_party', name, version, displayPriority, license: 'test license', attribution: 'test authors',
  } });
  const staff = async () => {
    const user = await seedUser(ctx.prisma, { verified: true, staffRole: 'editor' });
    return startSession(ctx, user.userId);
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
  });
  afterAll(async () => { await ctx?.close(); });

  it('B2#7 (service): ensureEntry analyze/verb with variant analyse creates one word entry, one accepted spelling variant and function_word_derived=false', async () => {
    const cefr = await source('CEFR-J', '1.5', 10);
    const result = await ensure('analyze/analyse', 'verb');
    expect(result).toEqual({ entry: { id: expect.any(String), lemma: 'analyze', pos: 'verb' }, created: true,
      addedVariantIds: [expect.any(String)] });
    const level = await write('analyze', 'verb', (tx) => content.addImportedLevel(tx, {
      entryId: result.entry.id, sourceId: cefr.id, level: 'B1', extra: { notes: 'original' },
    }));
    expect(level).toEqual({ created: true, id: expect.any(String) });
    expect(await ctx.prisma.entry.findMany()).toEqual([expect.objectContaining({
      id: result.entry.id, language: 'en', lemma: 'analyze', pos: 'verb', entryType: 'word',
      functionWordDerived: false, functionWordOverride: null,
    })]);
    expect(await ctx.prisma.entryVariant.findMany()).toEqual([{
      id: result.addedVariantIds[0], entryId: result.entry.id, text: 'analyse', kind: 'spelling', acceptedAsAnswer: true,
    }]);
    expect(await ctx.prisma.entryLevel.findMany({ include: { source: true } })).toEqual([expect.objectContaining({
      id: level.id, entryId: result.entry.id, level: 'B1', basis: 'imported', sourceId: cefr.id,
      sourceExtra: { notes: 'original' }, source: expect.objectContaining({ name: 'CEFR-J', version: '1.5' }),
    })]);
    expect(await ctx.prisma.sense.count()).toBe(0);
    expect(await ctx.prisma.senseRevision.count()).toBe(0);
  });

  it('B2#8: March noun and march noun are two entries and neither overwrites the other', async () => {
    const upper = await ensure('March', 'noun');
    const lower = await ensure('march', 'noun');
    expect(upper.entry.id).not.toBe(lower.entry.id);
    expect(upper.created).toBe(true);
    expect(lower.created).toBe(true);
    const before = await catalog();
    expect(await ensure('March', 'noun')).toEqual({ ...upper, created: false });
    expect(await catalog()).toEqual(before);
    const entries = await ctx.prisma.entry.findMany();
    expect(entries).toHaveLength(2);
    expect(entries).toEqual(expect.arrayContaining([
      expect.objectContaining(upper.entry), expect.objectContaining(lower.entry),
    ]));
  });

  it('B2#9: preposition is flagged, noun is not, and in/preposition and in/adverb are independently flagged entries', async () => {
    const prep = await ensure('in', 'preposition');
    const adverb = await ensure('in', 'adverb');
    const noun = await ensure('word', 'noun');
    expect(new Set([prep.entry.id, adverb.entry.id, noun.entry.id]).size).toBe(3);
    expect(await ctx.prisma.entry.findMany()).toEqual(expect.arrayContaining([
      expect.objectContaining({ ...prep.entry, functionWordDerived: true, functionWordOverride: null }),
      expect.objectContaining({ ...adverb.entry, functionWordDerived: false, functionWordOverride: null }),
      expect.objectContaining({ ...noun.entry, functionWordDerived: false, functionWordOverride: null }),
    ]));
  });

  it('B2E9: ten concurrent ensureEntry calls for one new key leave exactly one entry and all callers reference it', async () => {
    const results = await Promise.all(Array.from({ length: 10 }, (_, i) => ensure(`race/variant-${i}`, 'noun')));
    expect(new Set(results.map(({ entry }) => entry.id)).size).toBe(1);
    expect(results.filter(({ created }) => created)).toHaveLength(1);
    expect(await ctx.prisma.entry.count()).toBe(1);
    expect(await ctx.prisma.entryVariant.count()).toBe(10);
    expect(results.flatMap(({ addedVariantIds }) => addedVariantIds)).toHaveLength(10);
    const variants = await ctx.prisma.entryVariant.findMany();
    expect(variants.every(({ entryId }) => entryId === results[0].entry.id)).toBe(true);
  });

  it('B2#14/B2#15 (service): identical levels deduplicate, C1 and C2 from one source coexist, and CEFR-J and Octanove rows are both kept', async () => {
    const { entry } = await ensure('catalog', 'noun');
    const cefr = await source('CEFR-J', '1.5', 10);
    const octanove = await source('Octanove', '1.0', 20);
    const add = (sourceId: string, level: Level, extra: Record<string, string> | null) =>
      write(entry.lemma, entry.pos, (tx) => content.addImportedLevel(tx, { entryId: entry.id, sourceId, level, extra }));
    const first = await add(octanove.id, 'C1', { notes: 'first', Threshold: 'kept verbatim' });
    const firstRow = await ctx.prisma.entryLevel.findUniqueOrThrow({ where: { id: first.id } });
    expect(first.created).toBe(true);
    expect(await add(octanove.id, 'C1', { notes: 'must not overwrite' })).toEqual({ created: false, id: first.id });
    expect(await ctx.prisma.entryLevel.findUniqueOrThrow({ where: { id: first.id } })).toEqual(firstRow);
    const second = await add(octanove.id, 'C2', null);
    const third = await add(cefr.id, 'B1', { 'CoreInventory 1': 'original' });
    expect(second.created).toBe(true);
    expect(third.created).toBe(true);
    expect(await ctx.prisma.entryLevel.count()).toBe(3);
    expect(await ctx.prisma.entryLevel.findMany()).toEqual(expect.arrayContaining([
      firstRow, expect.objectContaining({ id: second.id, level: 'C2', sourceId: octanove.id, basis: 'imported', sourceExtra: null }),
      expect.objectContaining({ id: third.id, level: 'B1', sourceId: cefr.id, basis: 'imported' }),
    ]));
    const listed = await write(entry.lemma, entry.pos, (tx) => content.listLevels(tx, entry.id, octanove.id));
    expect(listed).toHaveLength(2);
    expect(listed).toEqual(expect.arrayContaining([{ id: first.id, level: 'C1' }, { id: second.id, level: 'C2' }]));
    expect(await write(entry.lemma, entry.pos, (tx) => content.listLevels(tx, entry.id, cefr.id))).toEqual([
      { id: third.id, level: 'B1' },
    ]);
  });

  it('B2#50: setEditorialLevel and PUT editorial add owner editorial rows and leave imported rows unchanged', async () => {
    const { entry } = await ensure('editorial', 'noun');
    const cefr = await source('CEFR-J', '1.5', 10);
    await write(entry.lemma, entry.pos, (tx) => content.addImportedLevel(tx, {
      entryId: entry.id, sourceId: cefr.id, level: 'B1', extra: { notes: 'immutable' },
    }));
    const imported = await ctx.prisma.entryLevel.findMany({ where: { basis: 'imported' } });
    await write(entry.lemma, entry.pos, (tx) => content.setEditorialLevel(tx, entry.id, 'A2'));
    const editor = await staff();
    ctx.clock.advance(1_000);
    expect((await ctx.http().put(`/v1/admin/content/entries/${entry.id}/levels/editorial`)
      .set('Authorization', `Bearer ${editor.accessToken}`).send({ level: 'C1' })).status).toBe(204);
    expect(await ctx.prisma.entryLevel.findMany({ where: { basis: 'imported' } })).toEqual(imported);
    const editorial = await ctx.prisma.entryLevel.findMany({ where: { sourceId: OWNER_SOURCE_ID }, orderBy: { createdAt: 'desc' } });
    expect(editorial).toHaveLength(2);
    expect(editorial[0]).toMatchObject({ entryId: entry.id, level: 'C1', basis: 'editorial', sourceExtra: null });
    expect(editorial[1]).toMatchObject({ entryId: entry.id, level: 'A2', basis: 'editorial', sourceExtra: null });
    // Re-selecting an earlier editorial level must make that choice the latest without changing imports.
    ctx.clock.advance(1_000);
    await write(entry.lemma, entry.pos, (tx) => content.setEditorialLevel(tx, entry.id, 'A2'));
    expect(await ctx.prisma.entryLevel.count({ where: { sourceId: OWNER_SOURCE_ID } })).toBe(2);
    expect((await ctx.prisma.entryLevel.findFirstOrThrow({ where: { sourceId: OWNER_SOURCE_ID }, orderBy: { createdAt: 'desc' } })).level).toBe('A2');
    expect(await ctx.prisma.entryLevel.findMany({ where: { basis: 'imported' } })).toEqual(imported);
  });

  it('B2#14 (owner source): addImportedLevel uses editorial basis for OWNER_SOURCE_ID and never changes an existing row', async () => {
    const { entry } = await ensure('owner', 'noun');
    const add = (extra: Record<string, string> | null) => write(entry.lemma, entry.pos, (tx) => content.addImportedLevel(tx, {
      entryId: entry.id, sourceId: OWNER_SOURCE_ID, level: 'B2', extra,
    }));
    const first = await add({ notes: 'first' });
    const before = await catalog();
    expect(await add(null)).toEqual({ created: false, id: first.id });
    expect(await catalog()).toEqual(before);
    expect(await ctx.prisma.entryLevel.findUniqueOrThrow({ where: { id: first.id } })).toMatchObject({
      basis: 'editorial', sourceId: OWNER_SOURCE_ID, sourceExtra: { notes: 'first' },
    });
  });

  it('B2#51 (storage): PUT function-word stores true and false, null clears it, effective flag coalesces override and derived, and re-import preserves override', async () => {
    const editor = await staff();
    for (const [headword, pos, derived] of [['in', 'preposition', true], ['word', 'noun', false]] as const) {
      const { entry } = await ensure(headword, pos);
      for (const override of [!derived, derived, null]) {
        const res = await ctx.http().put(`/v1/admin/taxonomy/entries/${entry.id}/function-word`)
          .set('Authorization', `Bearer ${editor.accessToken}`).send({ override });
        expect(res.status).toBe(204);
        const stored = await ctx.prisma.entry.findUniqueOrThrow({ where: { id: entry.id } });
        expect(stored.functionWordDerived).toBe(derived);
        expect(stored.functionWordOverride).toBe(override);
        const effective = await ctx.prisma.$queryRaw<Array<{ effective: boolean }>>`
          SELECT coalesce(function_word_override, function_word_derived) AS effective FROM entries WHERE id = ${entry.id}::uuid`;
        expect(effective).toEqual([{ effective: override ?? derived }]);
        const before = await catalog();
        expect((await ensure(headword, pos)).created).toBe(false);
        expect(await catalog()).toEqual(before);
      }
    }
  });

  it('B2E5: one variant text may belong to two entries and aliases are accepted as answers only when explicitly flagged', async () => {
    const first = await ensure('first/shared', 'noun');
    const second = await ensure('second/shared', 'noun');
    expect(await ctx.prisma.entryVariant.count({ where: { text: 'shared' } })).toBe(2);
    const editor = await staff();
    const replace = (accepted_as_answer: boolean) => ctx.http().put(`/v1/admin/content/entries/${first.entry.id}/variants`)
      .set('Authorization', `Bearer ${editor.accessToken}`).send({
        variants: [{ text: 'shared', kind: 'alias', accepted_as_answer }],
      });
    expect((await replace(false)).status).toBe(204);
    expect(await ctx.prisma.entryVariant.findMany({ where: { text: 'shared' } })).toEqual(expect.arrayContaining([
      { id: first.addedVariantIds[0], entryId: first.entry.id, text: 'shared', kind: 'alias', acceptedAsAnswer: false },
      { id: second.addedVariantIds[0], entryId: second.entry.id, text: 'shared', kind: 'spelling', acceptedAsAnswer: true },
    ]));
    expect((await replace(true)).status).toBe(204);
    expect((await ctx.prisma.entryVariant.findUniqueOrThrow({ where: { id: first.addedVariantIds[0] } })).acceptedAsAnswer).toBe(true);
  });

  it('B2#13a: ensureEntry skips lemma and repeated variants, retains case-only variants and never removes or overwrites existing variants', async () => {
    const first = await ensure('a.m./A.M./am/am/a.m.', 'noun');
    expect(first.addedVariantIds).toHaveLength(2);
    await write(first.entry.lemma, first.entry.pos, (tx) => content.setVariants(tx, first.entry.id, [
      { text: 'A.M.', kind: 'alias', acceptedAsAnswer: false }, { text: 'am', kind: 'spelling', acceptedAsAnswer: true },
    ]));
    const before = await ctx.prisma.entryVariant.findMany({ orderBy: { id: 'asc' } });
    const repeated = await ensure('a.m./A.M./AM', 'noun');
    expect(repeated.created).toBe(false);
    expect(repeated.addedVariantIds).toHaveLength(1);
    expect(await ctx.prisma.entryVariant.findMany()).toEqual(expect.arrayContaining(before));
    expect(await ctx.prisma.entryVariant.count()).toBe(3);
    expect(await ctx.prisma.entryVariant.findUniqueOrThrow({ where: { id: repeated.addedVariantIds[0] } })).toMatchObject({
      text: 'AM', kind: 'spelling', acceptedAsAnswer: true,
    });
    const duplicate = await ensure('emphasize/emphasize', 'verb');
    expect(duplicate.addedVariantIds).toEqual([]);
    expect(await ctx.prisma.entryVariant.count({ where: { entryId: duplicate.entry.id } })).toBe(0);
  });

  it('B2#13: multiword and apostrophe headwords persist as word entries with trimmed whitespace', async () => {
    for (const headword of ['turn to ', 'according to', "o'clock", "'re"]) {
      const { entry } = await ensure(headword, 'verb');
      expect(await ctx.prisma.entry.findUniqueOrThrow({ where: { id: entry.id } })).toMatchObject({
        lemma: headword.trim(), entryType: 'word', pos: 'verb',
      });
      expect(await ctx.prisma.entryVariant.count({ where: { entryId: entry.id } })).toBe(0);
    }
  });

  it('B2#12: normalized keys converge without case folding; lemma length is checked after normalization and invalid writes roll back', async () => {
    const first = await ensure(' Cafe\u0301\t  March ', 'noun');
    expect(first.entry.lemma).toBe('Café March');
    expect((await ensure('Café March', 'noun')).entry.id).toBe(first.entry.id);
    expect((await ensure(` ${'a'.repeat(100)} `, 'noun')).created).toBe(true);
    const before = await catalog();
    for (const [lemma, pos] of [['   ', 'noun'], ['a'.repeat(101), 'noun'], ['bad-pos', 'nuon'], ['nul\0lemma', 'noun']]) {
      await expect(write('validation-check', 'noun', async (tx) => {
        await content.ensureEntry(tx, { lemma: 'validation-check', pos: 'noun', variants: [] });
        return content.ensureEntry(tx, { lemma, pos, variants: ['must not persist'] });
      }))
        .rejects.toMatchObject({ problemType: 'validation-failed' });
      expect(await catalog()).toEqual(before);
    }
  });

  it('variants PUT replaces the list, normalizes text, preserves retained ids and permits an empty list', async () => {
    const { entry, addedVariantIds } = await ensure('variant/old/retained', 'noun');
    const editor = await staff();
    const replace = (variants: object[]) => ctx.http().put(`/v1/admin/content/entries/${entry.id}/variants`)
      .set('Authorization', `Bearer ${editor.accessToken}`).send({ variants });
    expect((await replace([
      { text: ' retained ', kind: 'alias', accepted_as_answer: false },
      { text: ' Cafe\u0301\t name ', kind: 'spelling', accepted_as_answer: true },
    ])).status).toBe(204);
    expect(await ctx.prisma.entryVariant.findMany()).toEqual(expect.arrayContaining([
      { id: addedVariantIds[1], entryId: entry.id, text: 'retained', kind: 'alias', acceptedAsAnswer: false },
      expect.objectContaining({ entryId: entry.id, text: 'Café name', kind: 'spelling', acceptedAsAnswer: true }),
    ]));
    expect(await ctx.prisma.entryVariant.count()).toBe(2);
    expect((await replace([])).status).toBe(204);
    expect(await ctx.prisma.entryVariant.count()).toBe(0);
  });

  it('entry PUT routes reject invalid bodies, malformed ids and missing entries with Problem Details and preserve persisted state', async () => {
    const { entry } = await ensure('protected/original', 'noun');
    const editor = await staff();
    const before = await catalog();
    for (const [suffix, body] of [
      ['variants', {}], ['variants', { variants: 'wrong' }],
      ['variants', { variants: [{ text: ' ', kind: 'spelling', accepted_as_answer: true }] }],
      ['variants', { variants: [{ text: 'a'.repeat(2_001), kind: 'spelling', accepted_as_answer: true }] }],
      ['variants', { variants: [{ text: 'nul\0variant', kind: 'alias', accepted_as_answer: false }] }],
      ['variants', { variants: [{ text: 'alias', kind: 'invalid', accepted_as_answer: false }] }],
      ['variants', { variants: [{ text: 'alias', kind: 'alias', acceptedAsAnswer: false }] }],
      ['variants', { variants: [{ text: 'alias', kind: 'alias', accepted_as_answer: 'false' }] }],
      ['variants', { variants: [{ text: 'ok', kind: 'spelling', accepted_as_answer: true },
        { text: ' ok ', kind: 'alias', accepted_as_answer: false }] }],
      ['levels/editorial', {}], ['levels/editorial', { level: 'B3' }],
      ['levels/editorial', { level: 'A1', extra: true }],
    ] as const) {
      const res = await ctx.http().put(`/v1/admin/content/entries/${entry.id}/${suffix}`)
        .set('Authorization', `Bearer ${editor.accessToken}`).send(body);
      expect(res.status).toBe(400);
      expect(res.body.type).toBe(problem('validation-failed'));
      expect(res.headers['content-type']).toContain('application/problem+json');
      expect(await catalog()).toEqual(before);
    }
    for (const body of [{}, { override: 'false' }, { override: false, unexpected: true }]) {
      const res = await ctx.http().put(`/v1/admin/taxonomy/entries/${entry.id}/function-word`)
        .set('Authorization', `Bearer ${editor.accessToken}`).send(body);
      expect(res.status).toBe(400);
      expect(res.body.type).toBe(problem('validation-failed'));
      expect(await catalog()).toEqual(before);
    }
    for (const [id, status, slug] of [['bad-id', 400, 'validation-failed'], [randomUUID(), 404, 'not-found']] as const) {
      for (const request of [
        () => ctx.http().put(`/v1/admin/content/entries/${id}/variants`).send({ variants: [] }),
        () => ctx.http().put(`/v1/admin/content/entries/${id}/levels/editorial`).send({ level: 'A1' }),
        () => ctx.http().put(`/v1/admin/taxonomy/entries/${id}/function-word`).send({ override: null }),
      ]) {
        const res = await request().set('Authorization', `Bearer ${editor.accessToken}`);
        expect(res.status).toBe(status);
        expect(res.body.type).toBe(problem(slug));
        expect(await catalog()).toEqual(before);
      }
    }
  });
});
