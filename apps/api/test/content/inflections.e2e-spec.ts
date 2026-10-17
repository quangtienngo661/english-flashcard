import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ContentService, type InflectionKind } from '../../src/content/index.js';
import type { Prisma } from '../../src/generated/prisma/client.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';
import { resetCatalog } from '../support/reset-catalog.js';

const transactionOptions = { timeout: 10_000, maxWait: 5_000 };

describe('inflection table (e2e, isolated database)', () => {
  let ctx: TestApp;
  let content: ContentService;
  const write = <T>(lemma: string, pos: string, action: (tx: Prisma.TransactionClient) => Promise<T>) =>
    ctx.prisma.$transaction(async (tx) => {
      await content.lockEntryKey(tx, lemma, pos);
      return action(tx);
    }, transactionOptions);
  const catalogEntry = (lemma: string, pos: string) =>
    write(lemma, pos, async (tx) => (await content.ensureEntry(tx, { lemma, pos, variants: [] })).entry.id);
  const privateEntry = async (owner: string, lemma: string, pos: string) => (await ctx.prisma.$queryRaw<Array<{ id: string }>>`
    INSERT INTO entries (language, lemma, pos, scope, owner_user_id) VALUES ('en', ${lemma}, ${pos}, 'private', ${owner}::uuid)
    RETURNING id`)[0].id;
  const replace = (entryId: string, source: 'library' | 'reviewed', forms: Array<{ form: string; kind: InflectionKind }>) =>
    ctx.prisma.$transaction((tx) => content.replaceInflections(tx, entryId, source, forms), transactionOptions);
  const rows = (entryId: string) => ctx.prisma.entryInflection.findMany({
    where: { entryId }, orderBy: [{ kind: 'asc' }, { form: 'asc' }],
    select: { form: true, formKey: true, kind: true, source: true },
  });

  beforeAll(async () => {
    ctx = await createTestApp({ databaseUrl: await createIsolatedDatabase() });
    content = ctx.app.get(ContentService);
  });
  beforeEach(async () => { await resetCatalog(ctx.prisma); });
  afterAll(async () => { await ctx?.close(); });

  it('B3E13: entriesByForm("leaves") returns leaf (plural) and leave (third_person) when both are catalog entries', async () => {
    const leaf = await catalogEntry('leaf', 'noun');
    const leave = await catalogEntry('leave', 'verb');
    await replace(leaf, 'library', [{ form: 'leaves', kind: 'plural' }]);
    await replace(leave, 'library', [
      { form: 'leaves', kind: 'third_person' }, { form: 'leaving', kind: 'present_participle' },
      { form: 'left', kind: 'past' }, { form: 'left', kind: 'past_participle' },
    ]);
    const viewer = randomUUID();
    const found = await content.entriesByForm('leaves', viewer);
    expect(found.sort((a, b) => a.lemma.localeCompare(b.lemma))).toEqual([
      { entryId: leaf, lemma: 'leaf', pos: 'noun', kind: 'plural' },
      { entryId: leave, lemma: 'leave', pos: 'verb', kind: 'third_person' },
    ]);
    expect(await content.entriesByForm('left', viewer)).toEqual([
      { entryId: leave, lemma: 'leave', pos: 'verb', kind: 'past' },
      { entryId: leave, lemma: 'leave', pos: 'verb', kind: 'past_participle' },
    ]);
    expect(await content.entriesByForm('unknown', viewer)).toEqual([]);
  });

  it('entriesByForm matches case- and composition-insensitively through form_key', async () => {
    const cafe = await catalogEntry('café', 'noun');
    await replace(cafe, 'reviewed', [{ form: 'Cafés', kind: 'plural' }]);
    expect(await rows(cafe)).toEqual([{ form: 'Cafés', formKey: 'cafés', kind: 'plural', source: 'reviewed' }]);
    // 'CAFÉS' is NFD with an upper-case stem.
    expect(await content.entriesByForm('CAFÉS', randomUUID())).toEqual([
      { entryId: cafe, lemma: 'café', pos: 'noun', kind: 'plural' }]);
  });

  it('a reviewed set replaces library rows and a later library run leaves them alone', async () => {
    const go = await catalogEntry('go', 'verb');
    await replace(go, 'library', [
      { form: 'goes', kind: 'third_person' }, { form: 'going', kind: 'present_participle' },
      { form: 'goed', kind: 'past' }, { form: 'goed', kind: 'past_participle' },
    ]);
    expect((await rows(go)).map(({ source }) => source)).toEqual(['library', 'library', 'library', 'library']);
    const reviewed = [
      { form: 'goes', kind: 'third_person' as const }, { form: 'going', kind: 'present_participle' as const },
      { form: 'went', kind: 'past' as const }, { form: 'gone', kind: 'past_participle' as const },
    ];
    await replace(go, 'reviewed', reviewed);
    const after = await rows(go);
    expect(after).toEqual([
      { form: 'went', formKey: 'went', kind: 'past', source: 'reviewed' },
      { form: 'gone', formKey: 'gone', kind: 'past_participle', source: 'reviewed' },
      { form: 'going', formKey: 'going', kind: 'present_participle', source: 'reviewed' },
      { form: 'goes', formKey: 'goes', kind: 'third_person', source: 'reviewed' },
    ]);
    await replace(go, 'library', [{ form: 'goed', kind: 'past' }]);
    expect(await rows(go)).toEqual(after);
    // A second reviewed set replaces every row of the entry, including reviewed ones.
    await replace(go, 'reviewed', [{ form: 'went', kind: 'past' }]);
    expect(await rows(go)).toEqual([{ form: 'went', formKey: 'went', kind: 'past', source: 'reviewed' }]);
  });

  it('a library set replaces only earlier library rows', async () => {
    const mouse = await catalogEntry('mouse', 'noun');
    await replace(mouse, 'library', [{ form: 'mouses', kind: 'plural' }]);
    await replace(mouse, 'library', [{ form: 'mice', kind: 'plural' }]);
    expect(await rows(mouse)).toEqual([{ form: 'mice', formKey: 'mice', kind: 'plural', source: 'library' }]);
  });

  it('B3#12 (inflections): a private entry is found only by its owner; deleting an entry removes its forms', async () => {
    const owner = randomUUID();
    const mine = await privateEntry(owner, 'yeet', 'verb');
    await replace(mine, 'library', [{ form: 'yeeted', kind: 'past' }]);
    expect(await content.entriesByForm('yeeted', owner)).toEqual([{ entryId: mine, lemma: 'yeet', pos: 'verb', kind: 'past' }]);
    expect(await content.entriesByForm('yeeted', randomUUID())).toEqual([]);
    await ctx.prisma.entry.delete({ where: { id: mine } });
    expect(await ctx.prisma.entryInflection.count()).toBe(0);
  });

  it('schema: kind and source are checked, (entry, form, kind) is unique, and a revision can point to a base entry with a form kind', async () => {
    const go = await catalogEntry('go', 'verb');
    const insert = (form: string, kind: string, source: string) => ctx.prisma.$executeRaw`
      INSERT INTO entry_inflections (entry_id, form, form_key, kind, source) VALUES (${go}::uuid, ${form}, ${form}, ${kind}, ${source})`;
    await insert('went', 'past', 'library');
    await expect(insert('went', 'past', 'reviewed')).rejects.toThrow(/entry_inflections_entry_id_form_kind_key/);
    await expect(insert('goen', 'future', 'library')).rejects.toThrow(/entry_inflections_kind_check/);
    await expect(insert('goen', 'past', 'ai')).rejects.toThrow(/entry_inflections_source_check/);
    const went = await catalogEntry('went', 'verb');
    const sense = await ctx.prisma.sense.create({ data: { entryId: went } });
    const revision = await ctx.prisma.senseRevision.create({ data: {
      senseId: sense.id, revisionNo: 1, draftSource: 'ui', contentHash: 'h', createdBy: randomUUID(),
      formOfEntryId: go, formKind: 'past',
    } });
    expect(revision).toMatchObject({ formOfEntryId: go, formKind: 'past' });
    await expect(ctx.prisma.$executeRaw`UPDATE sense_revisions SET form_kind = 'future' WHERE id = ${revision.id}::uuid`)
      .rejects.toThrow(/sense_revisions_form_kind_check/);
    // Deleting the base entry (e.g. reverting the import that created it) unlinks the form instead of failing.
    await ctx.prisma.entry.delete({ where: { id: go } });
    expect(await ctx.prisma.senseRevision.findUniqueOrThrow({ where: { id: revision.id } })).toMatchObject({ formOfEntryId: null });
  });
});
