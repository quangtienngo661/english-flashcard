import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ContentService, contentHash, OWNER_SOURCE_ID, type RevisionContent } from '../../src/content/index.js';
import { ImportRowProcessor } from '../../src/content-pipeline/import/row-processor.js';
import { BackgroundJobsService } from '../../src/content-pipeline/jobs/background-jobs.service.js';
import type { JobContext } from '../../src/content-pipeline/jobs/job-types.js';
import { contentKey, normalizeRow, type NormalizedRow } from '../../src/content-pipeline/upload/row-normalizer.js';
import type { Prisma } from '../../src/generated/prisma/client.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { makeFakeJobContext } from '../support/fake-job-context.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';
import { resetCatalog } from '../support/reset-catalog.js';

const full: RevisionContent = {
  glossVi: 'ngân hàng', definitionEn: 'A financial institution.', examplesEn: ['I visited the bank.'],
  topicCodes: ['business'], acceptedForms: ['banks'],
};
function row(input: Partial<NormalizedRow> = {}): NormalizedRow {
  return { rowNumber: 2, lemma: 'bank', pos: 'noun', variants: [], level: null, levelExtra: null,
    content: { ...full }, senseId: null, revision: null, contextLabel: null, replaceMeaning: false,
    inflections: null, formOf: null, ...input };
}
type EntryKey = { id: string; lemma: string; pos: string };
type ImportInput = Parameters<ContentService['importContent']>[1];

describe('CSV content import (e2e, isolated database)', () => {
  let ctx: TestApp;
  let content: ContentService;
  let jobs: BackgroundJobsService;
  let processor: ImportRowProcessor;
  let job: JobContext;
  let actorId: string;

  const write = <T>(entry: Pick<EntryKey, 'lemma' | 'pos'>, action: (tx: Prisma.TransactionClient) => Promise<T>) =>
    job.tx(async (tx) => {
      await content.lockEntryKey(tx, entry.lemma, entry.pos);
      return action(tx);
    });
  const ensure = async (lemma = 'bank', pos = 'noun') => (await write({ lemma, pos }, (tx) =>
    content.ensureEntry(tx, { lemma, pos, variants: [] }))).entry;
  const batch = async (levelSourceId: string | null = null) => {
    const id = await ctx.prisma.$transaction((tx) => jobs.create(tx, {
      queue: 'content-import', createdBy: actorId, operationId: randomUUID(),
    }));
    return ctx.prisma.importBatch.create({ data: {
      id, levelSourceId, fileName: 'content.csv', fileSha256: 'a'.repeat(64), fileSize: 1, rowCount: 20,
      rawHeaders: ['headword', 'pos', 'gloss_vi'], warnings: [], counters: { processed: 0 },
    } });
  };
  const readSense = (id: string) => ctx.prisma.sense.findUniqueOrThrow({ where: { id }, include: {
    revisions: { orderBy: { revisionNo: 'asc' }, include: { texts: { orderBy: [{ language: 'asc' }, { kind: 'asc' }] } } },
  } });
  const snapshot = async () => ({
    entries: await ctx.prisma.entry.findMany({ orderBy: { id: 'asc' } }),
    variants: await ctx.prisma.entryVariant.findMany({ orderBy: { id: 'asc' } }),
    levels: await ctx.prisma.entryLevel.findMany({ orderBy: { id: 'asc' } }),
    senses: await ctx.prisma.sense.findMany({ orderBy: { id: 'asc' } }),
    revisions: await ctx.prisma.senseRevision.findMany({ orderBy: { id: 'asc' } }),
    texts: await ctx.prisma.senseRevisionText.findMany({ orderBy: [{ revisionId: 'asc' }, { language: 'asc' }, { kind: 'asc' }] }),
    records: await ctx.prisma.batchRecord.findMany({ orderBy: [{ batchId: 'asc' }, { recordType: 'asc' }, { recordId: 'asc' }] }),
    keys: await ctx.prisma.importRowKey.findMany({ orderBy: [{ batchId: 'asc' }, { rowKey: 'asc' }] }),
    outcomes: await ctx.prisma.importRowOutcome.findMany({ orderBy: [{ batchId: 'asc' }, { rowNumber: 'asc' }] }),
  });
  const importPatch = (entry: EntryKey, input: Partial<ImportInput> = {}) => write(entry, (tx) =>
    content.importContent(tx, { entryId: entry.id, lemma: entry.lemma, content: { ...full }, senseId: null,
      revision: null, contextLabel: null, replaceMeaning: false, actorId, ...input }));
  const create = async (source: 'ui' | 'csv' = 'csv', patch: Partial<RevisionContent> = full) => {
    const entry = await ensure();
    const first = await write(entry, (tx) => content.createSense(tx, {
      entryId: entry.id, contextLabel: null, content: patch, source, actorId,
    }));
    return { entry, ...first };
  };
  const published = async () => {
    const first = await create('ui');
    // Publishing behavior belongs to Task 6; establish its persisted state under the entry lock.
    await write(first.entry, async (tx) => {
      await content.setEditorialLevel(tx, first.entry.id, 'A1');
      await tx.senseRevision.update({ where: { id: first.revisionId }, data: { status: 'published', publishedAt: ctx.clock.now() } });
      await tx.sense.update({ where: { id: first.senseId }, data: { liveRevisionId: first.revisionId } });
    });
    return first;
  };

  beforeAll(async () => {
    ctx = await createTestApp({ databaseUrl: await createIsolatedDatabase(), pipeline: { runWorkers: false } });
    content = ctx.app.get(ContentService);
    jobs = ctx.app.get(BackgroundJobsService);
    processor = new ImportRowProcessor(content);
  });
  beforeEach(async () => {
    await ctx.prisma.backgroundJob.deleteMany();
    await resetCatalog(ctx.prisma);
    ctx.clock.set(new Date('2026-10-12T12:00:00Z'));
    actorId = randomUUID();
    job = makeFakeJobContext(ctx.prisma);
  });
  afterAll(async () => { await ctx?.close(); });

  it.each([false, true])('B2#17: content creates revision 1 without a level, earlier imported entry=%s', async (earlierEntry) => {
    if (earlierEntry) {
      expect(await processor.process(job, await batch(), row({ content: null }))).toEqual({ outcome: 'created' });
      expect(await ctx.prisma.sense.count()).toBe(0);
    }
    const upload = await batch();
    expect(await processor.process(job, upload, row())).toEqual({ outcome: 'created' });
    const entry = await ctx.prisma.entry.findFirstOrThrow();
    const sense = await ctx.prisma.sense.findFirstOrThrow();
    const stored = await readSense(sense.id);
    expect(stored).toMatchObject({ entryId: entry.id, liveRevisionId: null, replacesSenseId: null });
    expect(stored.revisions).toEqual([expect.objectContaining({ revisionNo: 1, status: 'draft', draftSource: 'csv',
      createdBy: actorId, publishedAt: null, examples: full.examplesEn, topicCodes: full.topicCodes,
      acceptedForms: full.acceptedForms, contentHash: contentHash(full), texts: [
        { revisionId: stored.revisions[0].id, language: 'en', kind: 'definition', text: full.definitionEn },
        { revisionId: stored.revisions[0].id, language: 'vi', kind: 'gloss', text: full.glossVi },
      ] })]);
    expect(await ctx.prisma.entry.count()).toBe(1);
    expect(await ctx.prisma.sense.count()).toBe(1);
    expect(await ctx.prisma.entryLevel.count()).toBe(0);
    expect(await ctx.prisma.batchRecord.findMany({ where: { batchId: upload.id, recordType: { in: ['sense', 'revision'] } } }))
      .toEqual(expect.arrayContaining([
        { batchId: upload.id, recordType: 'sense', recordId: sense.id, meta: null },
        { batchId: upload.id, recordType: 'revision', recordId: stored.revisions[0].id, meta: null },
      ]));
    expect(await ctx.prisma.batchRecord.count({ where: { batchId: upload.id } })).toBe(earlierEntry ? 2 : 3);
  });

  it('B2#18: a key-matched row with the live gloss creates a draft and preserves published content', async () => {
    const first = await published();
    const before = await readSense(first.senseId);
    const upload = await batch();
    expect(await processor.process(job, upload, row({ content: { glossVi: full.glossVi, examplesEn: ['New example.'] } })))
      .toEqual({ outcome: 'updated' });
    const after = await readSense(first.senseId);
    expect(after.liveRevisionId).toBe(first.revisionId);
    expect(after.revisions[0]).toEqual(before.revisions[0]);
    expect(after.revisions[1]).toMatchObject({ revisionNo: 2, draftSource: 'csv', status: 'draft', createdBy: actorId,
      publishedAt: null, examples: ['New example.'], topicCodes: full.topicCodes, acceptedForms: full.acceptedForms });
    expect(after.revisions[1].texts).toEqual(expect.arrayContaining([
      expect.objectContaining({ language: 'vi', kind: 'gloss', text: full.glossVi }),
      expect.objectContaining({ language: 'en', kind: 'definition', text: full.definitionEn }),
    ]));
    expect(await ctx.prisma.sense.count()).toBe(1);
    expect(await ctx.prisma.batchRecord.findMany({ where: { batchId: upload.id } }))
      .toEqual([{ batchId: upload.id, recordType: 'revision', recordId: after.revisions[1].id, meta: null }]);
  });

  it('B2#19: changed live gloss rejects the whole row, including its variant and level additions', async () => {
    const first = await published();
    const upload = await batch(OWNER_SOURCE_ID);
    const before = await snapshot();
    expect(await processor.process(job, upload, row({ content: { glossVi: 'bờ sông' }, variants: ['bank-variant'], level: 'B1' })))
      .toMatchObject({ outcome: 'rejected', errors: [{ code: 'gloss-changed', message: expect.any(String) }] });
    expect(await snapshot()).toEqual(before);
    expect((await readSense(first.senseId)).revisions).toHaveLength(1);
  });

  it('B2#19: a never-published CSV sense accepts a changed gloss', async () => {
    const first = await create();
    const result = await importPatch(first.entry, { content: { glossVi: 'bờ sông' } });
    expect(result).toMatchObject({ kind: 'new_revision', senseId: first.senseId, supersededRevisionId: first.revisionId,
      droppedReviewedMark: false, droppedTopics: [] });
    const after = await readSense(first.senseId);
    expect(after.liveRevisionId).toBeNull();
    expect(after.revisions.map(({ status }) => status)).toEqual(['superseded', 'draft']);
    expect(after.revisions[1].texts).toContainEqual(expect.objectContaining({ language: 'vi', text: 'bờ sông' }));
  });

  it('B2#19/D8: key conflict compares against live gloss, even when the latest CSV draft has another gloss', async () => {
    const first = await published();
    const live = (await readSense(first.senseId)).revisions[0];
    expect(await importPatch(first.entry, { senseId: first.senseId, revision: 1, content: { glossVi: 'bờ sông' } }))
      .toMatchObject({ kind: 'new_revision', supersededRevisionId: null, droppedReviewedMark: false, droppedTopics: [] });
    const before = await snapshot();
    // Inheriting the CSV draft's gloss must still conflict with the published gloss.
    expect(await importPatch(first.entry, { content: { examplesEn: ['Different example.'] } }))
      .toEqual({ kind: 'rejected', codes: ['gloss-changed'] });
    expect(await snapshot()).toEqual(before);
    // Explicitly restoring the live gloss is allowed despite differing from the latest draft's gloss.
    expect(await importPatch(first.entry, { content: { glossVi: full.glossVi, examplesEn: ['Different example.'] } }))
      .toMatchObject({ kind: 'new_revision', senseId: first.senseId });
    const after = await readSense(first.senseId);
    expect(after.revisions.map(({ status }) => status)).toEqual(['published', 'superseded', 'draft']);
    expect(after.liveRevisionId).toBe(first.revisionId);
    expect(after.revisions[0]).toEqual(live);
    expect(after.revisions[2].texts).toContainEqual(expect.objectContaining({ language: 'vi', text: full.glossVi }));
  });

  it('B2#20: a new label creates a second sense without touching the published one', async () => {
    const first = await published();
    const before = await readSense(first.senseId);
    expect(await processor.process(job, await batch(), row({ contextLabel: 'river', content: { glossVi: 'bờ sông' } })))
      .toEqual({ outcome: 'created' });
    expect(await readSense(first.senseId)).toEqual(before);
    const second = await ctx.prisma.sense.findFirstOrThrow({ where: { contextLabel: 'river' } });
    expect(second).toMatchObject({ entryId: first.entry.id, replacesSenseId: null, liveRevisionId: null });
    expect((await readSense(second.id)).revisions).toMatchObject([{ revisionNo: 1, status: 'draft', draftSource: 'csv' }]);
    expect(await ctx.prisma.sense.count()).toBe(2);
  });

  it('B2#21: replacement rows create one waiting sense and then revise that same waiting sense', async () => {
    const first = await published();
    const old = await readSense(first.senseId);
    const upload = await batch();
    expect(await processor.process(job, upload, row({ replaceMeaning: true, content: { glossVi: 'bờ sông' } })))
      .toEqual({ outcome: 'created' });
    const waiting = await ctx.prisma.sense.findFirstOrThrow({ where: { replacesSenseId: first.senseId } });
    expect(waiting).toMatchObject({ entryId: first.entry.id, contextLabel: null, liveRevisionId: null, state: 'open' });
    const initial = (await readSense(waiting.id)).revisions[0];
    expect(await processor.process(job, upload, row({ rowNumber: 3, replaceMeaning: true,
      content: { glossVi: 'bờ sông mới', examplesEn: ['We sat by the bank.'] } }))).toEqual({ outcome: 'updated' });
    const after = await readSense(waiting.id);
    expect(after.revisions.map(({ revisionNo, status }) => [revisionNo, status])).toEqual([[1, 'superseded'], [2, 'draft']]);
    expect(after.revisions[1]).toMatchObject({ draftSource: 'csv', examples: ['We sat by the bank.'] });
    expect(after.revisions[1].texts).toContainEqual(expect.objectContaining({ language: 'vi', text: 'bờ sông mới' }));
    expect(await ctx.prisma.sense.count({ where: { replacesSenseId: first.senseId } })).toBe(1);
    expect(await readSense(first.senseId)).toEqual(old);
    expect(await ctx.prisma.batchRecord.findFirstOrThrow({ where: { batchId: upload.id, recordId: after.revisions[1].id } }))
      .toMatchObject({ recordType: 'revision', meta: { replacedRevisionId: initial.id } });
    const beforeRepeat = await snapshot();
    expect(await processor.process(job, upload, row({ rowNumber: 3, replaceMeaning: true,
      content: { glossVi: 'bờ sông mới', examplesEn: ['We sat by the bank.'] } }))).toEqual({ outcome: 'unchanged' });
    expect(await snapshot()).toEqual(beforeRepeat);
  });

  it.each([
    ['unknown-import-topic', 'unknown-topic'], ['archived-import-topic', 'topic-archived'],
  ] as const)('B2#22: explicit topic %s rejects with %s and writes nothing', async (topic, code) => {
    if (code === 'topic-archived') await ctx.prisma.topic.upsert({ where: { code: topic },
      create: { code: topic, archivedAt: ctx.clock.now() }, update: { archivedAt: ctx.clock.now() } });
    const upload = await batch(OWNER_SOURCE_ID);
    const before = await snapshot();
    expect(await processor.process(job, upload, row({ variants: ['banks-variant'], level: 'B1', content: { topicCodes: [topic] } })))
      .toEqual({ outcome: 'rejected', errors: [{ code, message: expect.stringContaining(topic) }] });
    expect(await snapshot()).toEqual(before);
    const first = await create();
    const beforeEdit = await snapshot();
    expect(await importPatch(first.entry, { content: { definitionEn: 'Must not persist.', topicCodes: [topic] } }))
      .toEqual({ kind: 'rejected', codes: [code] });
    expect(await snapshot()).toEqual(beforeEdit);
  });

  it.each(['revision-required', 'stale-revision', 'sense-not-found', 'sense-retired', 'sense-entry-mismatch'] as const)(
    'B2#23: %s is rejected without any content or entry/level writes', async (code) => {
      const first = await create();
      await write(first.entry, (tx) => content.saveDraft(tx, { senseId: first.senseId, baseRevision: 1,
        content: { definitionEn: 'Revision two.' }, source: 'csv', actorId }));
      if (code === 'sense-retired') await write(first.entry, (tx) =>
        tx.sense.update({ where: { id: first.senseId }, data: { state: 'retired' } }));
      const upload = await batch(OWNER_SOURCE_ID);
      const input = row({ lemma: code === 'sense-entry-mismatch' ? 'different-entry' : 'bank',
        variants: ['must-roll-back'], level: 'B1', senseId: code === 'sense-not-found' ? randomUUID() : first.senseId,
        revision: code === 'revision-required' ? null : code === 'stale-revision' ? 1 : 2,
        content: { glossVi: 'must not persist' } });
      const before = await snapshot();
      expect(await processor.process(job, upload, input)).toMatchObject({ outcome: 'rejected', errors: [{ code }] });
      expect(await snapshot()).toEqual(before);
    },
  );

  it.each([
    { glossVi: 'UI gloss' }, { definitionEn: 'UI definition' }, { examplesEn: ['UI example'] },
    { topicCodes: ['business'] }, { acceptedForms: ['banking'] },
  ])('B2#24/B2E35: a UI open revision with real content $glossVi $definitionEn is protected', async (patch) => {
    const first = await create('ui', patch);
    const upload = await batch();
    const before = await snapshot();
    expect(await processor.process(job, upload, row({ content: { glossVi: 'CSV gloss', definitionEn: 'CSV definition' } })))
      .toMatchObject({ outcome: 'rejected', errors: [{ code: 'open-draft-conflict' }] });
    expect(await snapshot()).toEqual(before);
    expect((await readSense(first.senseId)).revisions[0].draftSource).toBe('ui');
  });

  it.each([false, true])('B2#24/B2#24a: CSV overwrites supersede the open revision and report reviewed=%s', async (reviewed) => {
    const earlier = await batch();
    expect(await processor.process(job, earlier, row())).toEqual({ outcome: 'created' });
    const sense = await ctx.prisma.sense.findFirstOrThrow();
    const entry = await ctx.prisma.entry.findFirstOrThrow();
    const initial = (await readSense(sense.id)).revisions[0];
    if (reviewed) expect(await write(entry, (tx) => content.markRevisions(tx, [
      { senseId: sense.id, revision: 1, action: 'reviewed' },
    ]))).toEqual([{ senseId: sense.id, ok: true }]);
    const result = await importPatch(entry, { content: { examplesEn: ['Second upload.'] } });
    expect(result).toMatchObject({ kind: 'new_revision', senseId: sense.id, supersededRevisionId: initial.id,
      droppedReviewedMark: reviewed, droppedTopics: [] });
    const second = (await readSense(sense.id)).revisions[1];
    expect(second).toMatchObject({ revisionNo: 2, status: 'draft', draftSource: 'csv', examples: ['Second upload.'] });
    expect((await readSense(sense.id)).revisions[0].status).toBe('superseded');
    if (reviewed) await write(entry, (tx) => content.markRevisions(tx, [{ senseId: sense.id, revision: 2, action: 'reviewed' }]));
    const upload = await batch();
    const processed = await processor.process(job, upload, row({ content: { examplesEn: ['Third upload.'] } }));
    expect(processed).toMatchObject({ outcome: 'updated' });
    if (processed.outcome === 'rejected') throw new Error('Expected success');
    if (reviewed) expect(processed.warnings).toEqual([expect.stringContaining('đã rà')]);
    else expect(processed.warnings).toBeUndefined();
    const after = await readSense(sense.id);
    expect(after.revisions.map(({ status }) => status)).toEqual(['superseded', 'superseded', 'draft']);
    expect(await ctx.prisma.senseRevision.count({ where: { senseId: sense.id, status: { in: ['draft', 'reviewed'] } } })).toBe(1);
    expect(await ctx.prisma.batchRecord.findMany({ where: { batchId: upload.id } })).toEqual([
      { batchId: upload.id, recordType: 'revision', recordId: after.revisions[2].id,
        meta: { replacedRevisionId: second.id, replacedRevisionPreviousStatus: reviewed ? 'reviewed' : 'draft' } },
    ]);
  });

  it('B2#26: a single field keeps all other values; nonempty lists replace the whole list', async () => {
    const first = await create();
    const upload = await batch();
    const normalized = normalizeRow(2, { headword: 'bank', pos: 'noun', gloss_vi: '', definition_en: '', example_en_1: 'Only example.' },
      { hasLevelColumn: false });
    if (!normalized.ok) throw new Error('Expected normalized row');
    expect(await processor.process(job, upload, normalized.row)).toEqual({ outcome: 'updated' });
    const second = (await readSense(first.senseId)).revisions[1];
    expect(second).toMatchObject({ examples: ['Only example.'], topicCodes: full.topicCodes, acceptedForms: full.acceptedForms,
      contentHash: contentHash({ ...full, examplesEn: ['Only example.'] }) });
    expect(second.texts).toEqual(expect.arrayContaining([
      expect.objectContaining({ text: full.glossVi }), expect.objectContaining({ text: full.definitionEn }),
    ]));
    expect(await processor.process(job, upload, row({ rowNumber: 3, content: {
      examplesEn: ['Replacement example.'], topicCodes: ['FOOD', 'food'], acceptedForms: ['bank', ' riverbank ', 'RIVERBANK'],
    } }))).toEqual({ outcome: 'updated' });
    expect((await readSense(first.senseId)).revisions[2]).toMatchObject({
      examples: ['Replacement example.'], topicCodes: ['food'], acceptedForms: ['riverbank'],
      contentHash: contentHash({ ...full, examplesEn: ['Replacement example.'], topicCodes: ['food'], acceptedForms: ['riverbank'] }),
    });
  });

  it('B2#10/B2E10: unchanged merge preserves an intervening real UI edit before conflict checks', async () => {
    const upload = await batch();
    // This partial CSV owns only the gloss. A UI edit changes a field it never supplied.
    const original = row({ content: { glossVi: full.glossVi } });
    expect(await processor.process(job, upload, original)).toEqual({ outcome: 'created' });
    const entry = await ctx.prisma.entry.findFirstOrThrow();
    const sense = await ctx.prisma.sense.findFirstOrThrow();
    const ui = await write(entry, (tx) => content.saveDraft(tx, { senseId: sense.id, baseRevision: 1,
      content: { definitionEn: 'Admin-only change.' }, source: 'ui', actorId }));
    expect(ui.changed).toBe(true);
    const before = await snapshot();
    expect((await readSense(sense.id)).revisions[1]).toMatchObject({ id: ui.revisionId, draftSource: 'ui', status: 'draft',
      contentHash: contentHash({ glossVi: full.glossVi, definitionEn: 'Admin-only change.', examplesEn: [], topicCodes: [], acceptedForms: [] }) });
    expect(await processor.process(job, upload, original)).toEqual({ outcome: 'unchanged' });
    expect(await snapshot()).toEqual(before);
    // A changed patch reaches the conflict rule on the very same UI revision, proving this is not an empty-draft case.
    expect(await processor.process(job, upload, { ...original, rowNumber: 3, content: { glossVi: 'Different gloss.' } }))
      .toMatchObject({ outcome: 'rejected', errors: [{ code: 'open-draft-conflict' }] });
    expect(await snapshot()).toEqual(before);
  });

  it('B2E20: inherited archived topics are dropped by saveDraft and reported to Content and Pipeline callers', async () => {
    const topic = 'import-archived-later';
    await ctx.prisma.topic.upsert({ where: { code: topic }, create: { code: topic }, update: { archivedAt: null } });
    const first = await create('csv', { ...full, topicCodes: ['business', topic] });
    await ctx.prisma.topic.update({ where: { code: topic }, data: { archivedAt: ctx.clock.now() } });
    const result = await importPatch(first.entry, { content: { examplesEn: ['Updated example.'] } });
    expect(result).toMatchObject({ kind: 'new_revision', droppedTopics: [topic] });
    expect((await readSense(first.senseId)).revisions[1].topicCodes).toEqual(['business']);
    // Restore an older topic list as a fixture to exercise the Pipeline warning path too.
    await ctx.prisma.topic.update({ where: { code: topic }, data: { archivedAt: null } });
    await write(first.entry, (tx) => content.saveDraft(tx, { senseId: first.senseId, baseRevision: 2,
      content: { topicCodes: ['business', topic] }, source: 'csv', actorId }));
    await ctx.prisma.topic.update({ where: { code: topic }, data: { archivedAt: ctx.clock.now() } });
    const processed = await processor.process(job, await batch(), row({ content: { examplesEn: ['Another example.'] } }));
    expect(processed).toEqual({ outcome: 'updated', warnings: [expect.stringContaining(topic)] });
    expect((await readSense(first.senseId)).revisions[3]).toMatchObject({ topicCodes: ['business'], status: 'draft', draftSource: 'csv' });
    expect((await readSense(first.senseId)).revisions[0].topicCodes).toEqual(['business', topic]);
  });

  it.each([false, true])('B2#18/D8: sense_id bypasses gloss-changed and a real UI open draft=%s', async (uiDraft) => {
    const first = await published();
    const live = (await readSense(first.senseId)).revisions[0];
    let revision = 1;
    if (uiDraft) {
      const saved = await write(first.entry, (tx) => content.saveDraft(tx, { senseId: first.senseId, baseRevision: 1,
        content: { definitionEn: 'UI open draft.' }, source: 'ui', actorId }));
      revision = saved.revisionNo;
    }
    expect(await processor.process(job, await batch(), row({ senseId: first.senseId, revision,
      content: { glossVi: 'bờ sông' } }))).toEqual({ outcome: 'updated' });
    const after = await readSense(first.senseId);
    expect(after.liveRevisionId).toBe(first.revisionId);
    expect(after.revisions[0]).toEqual(live);
    expect(after.revisions[revision]).toMatchObject({ revisionNo: revision + 1, status: 'draft', draftSource: 'csv' });
    expect(after.revisions[revision].texts).toContainEqual(expect.objectContaining({ language: 'vi', text: 'bờ sông' }));
    if (uiDraft) {
      expect(after.revisions[1].status).toBe('superseded');
      expect(after.revisions[2].texts).toContainEqual(expect.objectContaining({ language: 'en', text: 'UI open draft.' }));
    }
  });

  it('B2#52-into-CSV: an empty UI draft from pasted entries is filled without conflict', async () => {
    const first = await create('ui', {});
    expect((await readSense(first.senseId)).revisions[0]).toMatchObject({ draftSource: 'ui', texts: [],
      examples: [], topicCodes: [], acceptedForms: [] });
    expect(await processor.process(job, await batch(), row())).toEqual({ outcome: 'updated' });
    const after = await readSense(first.senseId);
    expect(after.revisions.map(({ status }) => status)).toEqual(['superseded', 'draft']);
    expect(after.revisions[1]).toMatchObject({ revisionNo: 2, draftSource: 'csv', contentHash: contentHash(full) });
    expect(await ctx.prisma.sense.count()).toBe(1);
  });

  it('B2#21: replace_meaning without a matching older sense creates an ordinary first CSV sense', async () => {
    const entry = await ensure();
    const result = await importPatch(entry, { replaceMeaning: true });
    expect(result).toMatchObject({ kind: 'created_sense', senseId: expect.any(String), revisionId: expect.any(String) });
    if (result.kind !== 'created_sense') throw new Error('Expected created sense');
    expect(await readSense(result.senseId)).toMatchObject({ replacesSenseId: null, liveRevisionId: null,
      revisions: [expect.objectContaining({ id: result.revisionId, revisionNo: 1, draftSource: 'csv', contentHash: contentHash(full) })] });
  });

  it('B2#17: unchanged content does not suppress an entry/level update', async () => {
    await create();
    const upload = await batch(OWNER_SOURCE_ID);
    expect(await processor.process(job, upload, row({ variants: ['bank-variant'], level: 'B1' }))).toEqual({ outcome: 'updated' });
    expect(await ctx.prisma.senseRevision.count()).toBe(1);
    expect(await ctx.prisma.entryVariant.count()).toBe(1);
    expect(await ctx.prisma.entryLevel.count()).toBe(1);
    expect(await ctx.prisma.importRowOutcome.findMany({ where: { batchId: upload.id } })).toMatchObject([{ outcome: 'updated' }]);
  });

  it('B2#27: too many examples reject both create and edit without writes', async () => {
    const entry = await ensure();
    const before = await snapshot();
    expect(await importPatch(entry, { content: { examplesEn: ['one', 'two', 'three', 'four'] } }))
      .toEqual({ kind: 'rejected', codes: ['too-many-examples'] });
    expect(await snapshot()).toEqual(before);
    const first = await create();
    const beforeEdit = await snapshot();
    expect(await importPatch(first.entry, { content: { examplesEn: ['one', 'two', 'three', 'four'] } }))
      .toEqual({ kind: 'rejected', codes: ['too-many-examples'] });
    expect(await snapshot()).toEqual(beforeEdit);
  });

  it('B2#25: content keys use sense_id when supplied, otherwise the label, regardless of content', () => {
    expect(contentKey(row())).toEqual(contentKey(row({ content: { glossVi: 'different' } })));
    expect(contentKey(row({ contextLabel: 'river' }))).not.toEqual(contentKey(row()));
    const senseId = randomUUID();
    expect(contentKey(row({ senseId, contextLabel: 'river' }))).toEqual(contentKey(row({ senseId, contextLabel: null })));
  });
});
