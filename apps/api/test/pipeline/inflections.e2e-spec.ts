import { createHash, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ContentService, INFLECTION_KINDS, OWNER_SOURCE_ID, type InflectionKind, type RevisionContent } from '../../src/content/index.js';
import { ImportBatchHandler } from '../../src/content-pipeline/import/import-batch.handler.js';
import { BackgroundJobsService, makeJobContext } from '../../src/content-pipeline/jobs/background-jobs.service.js';
import { classifyColumns } from '../../src/content-pipeline/upload/columns.js';
import { parseUploadFile } from '../../src/content-pipeline/upload/csv-file.js';
import { toCsv } from '../../src/content-pipeline/upload/csv-writer.js';
import type { Prisma } from '../../src/generated/prisma/client.js';
import { seedUser, startSession } from '../support/auth-helpers.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';
import { resetCatalog } from '../support/reset-catalog.js';
import { testConfig } from '../support/test-config.js';

const limits = { maxRows: 20_000, maxBytes: 10_000_000 };
const full: RevisionContent = {
  glossVi: 'đi', definitionEn: 'To move.', examplesEn: ['We go home.'], topicCodes: [], acceptedForms: [],
};
const goForms: Array<{ form: string; kind: InflectionKind }> = [
  { form: 'goes', kind: 'third_person' }, { form: 'going', kind: 'present_participle' },
  { form: 'goed', kind: 'past' }, { form: 'goed', kind: 'past_participle' },
];

describe('inflections and form-of links in the CSV flow (e2e, isolated database)', () => {
  let ctx: TestApp;
  let content: ContentService;
  let actorId: string;
  let token: string;

  const write = <T>(lemma: string, pos: string, action: (tx: Prisma.TransactionClient) => Promise<T>) =>
    ctx.prisma.$transaction(async (tx) => {
      await content.lockEntryKey(tx, lemma, pos);
      return action(tx);
    }, { timeout: 30_000, maxWait: 5_000 });
  const catalogWord = (lemma: string, pos: string, options: { level?: 'A1' | 'B1'; sense?: Partial<RevisionContent> } = {}) =>
    write(lemma, pos, async (tx) => {
      const { entry } = await content.ensureEntry(tx, { lemma, pos, variants: [] });
      if (options.level) await content.setEditorialLevel(tx, entry.id, options.level);
      const sense = options.sense
        ? await content.createSense(tx, { entryId: entry.id, contextLabel: null, content: options.sense, source: 'ui', actorId })
        : null;
      return { entryId: entry.id, senseId: sense?.senseId ?? null };
    });
  const forms = (entryId: string) => ctx.prisma.entryInflection.findMany({
    where: { entryId }, orderBy: [{ kind: 'asc' }, { form: 'asc' }], select: { form: true, kind: true, source: true } });
  const csv = (headers: string[], rows: string[][]) => Buffer.from(toCsv(headers, rows));
  const importFile = async (bytes: Buffer, levelSourceId: string | null = null) => {
    const parsed = parseUploadFile(bytes, limits);
    const jobs = ctx.app.get(BackgroundJobsService);
    const id = await ctx.prisma.$transaction(async (tx) => {
      const batchId = await jobs.create(tx, { queue: 'content-import', createdBy: actorId, operationId: randomUUID(),
        ...(levelSourceId ? { exclusiveKey: `content-import:${levelSourceId}` } : {}) });
      await tx.importBatch.create({ data: {
        id: batchId, levelSourceId, fileName: 'inflections.csv', fileSha256: createHash('sha256').update(bytes).digest('hex'),
        fileSize: bytes.length, rowCount: parsed.rows.length, rawHeaders: parsed.rawHeaders,
        warnings: classifyColumns(parsed.headers).problems, counters: {},
      } });
      await tx.importBatchFile.create({ data: { batchId, content: Buffer.from(bytes) } });
      return batchId;
    });
    const lease = await jobs.acquire(id, randomUUID());
    const job = makeJobContext(ctx.prisma, id, lease!.attempts, lease!.epoch);
    const status = await ctx.app.get(ImportBatchHandler).run(job);
    expect(await jobs.finish(id, job.epoch, status)).toBe(true);
    return { id, status, outcomes: await ctx.prisma.importRowOutcome.findMany({ where: { batchId: id }, orderBy: { rowNumber: 'asc' } }) };
  };
  const exportFile = async (path: string, query: object) => {
    const response = await ctx.http().get(path).set('Authorization', `Bearer ${token}`).query(query).buffer(true)
      .parse((res, done) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
        res.on('end', () => done(null, Buffer.concat(chunks)));
      });
    expect(response.status).toBe(200);
    const bytes = response.body as Buffer;
    const parsed = parseUploadFile(bytes, limits);
    return { bytes, headers: parsed.headers,
      rows: parsed.rows.map((row) => Object.fromEntries(parsed.headers.map((header, index) => [header, row.cells[index]]))) };
  };

  beforeAll(async () => {
    const config = testConfig();
    config.limits['user.write'].max = 10_000;
    ctx = await createTestApp({ databaseUrl: await createIsolatedDatabase(), config,
      pipeline: { runWorkers: false, exportMaxRows: 5_000, importMaxRows: limits.maxRows, importMaxBytes: limits.maxBytes } });
    content = ctx.app.get(ContentService);
  });
  beforeEach(async () => {
    await ctx.prisma.backgroundJob.deleteMany();
    await resetCatalog(ctx.prisma);
    await ctx.prisma.rateLimitCounter.deleteMany();
    await ctx.prisma.user.deleteMany();
    ctx.clock.set(new Date('2026-10-17T12:00:00Z'));
    actorId = (await seedUser(ctx.prisma, { verified: true, staffRole: 'editor' })).userId;
    token = (await startSession(ctx, actorId)).accessToken;
  });
  afterAll(async () => { await ctx?.close(); });

  it('D29 (import): a row went,verb with form_of go/verb:past creates the went sense linked to go and a derived level equal to go\'s', async () => {
    const go = await catalogWord('go', 'verb', { level: 'A1' });
    const { status, outcomes } = await importFile(csv(['headword', 'pos', 'gloss_vi', 'example_en_1', 'form_of'],
      [['went', 'verb', 'đã đi (quá khứ của go)', 'He went home.', 'go/verb:past']]));
    expect(status).toBe('succeeded');
    expect(outcomes).toEqual([expect.objectContaining({ outcome: 'created', errorCodes: [] })]);
    const went = await ctx.prisma.entry.findFirstOrThrow({ where: { lemma: 'went', pos: 'verb' }, include: {
      levels: true, senses: { include: { revisions: true } } } });
    expect(went.senses[0].revisions).toEqual([expect.objectContaining({ formOfEntryId: go.entryId, formKind: 'past', status: 'draft' })]);
    expect(went.levels).toEqual([expect.objectContaining({ level: 'A1', basis: 'derived', sourceId: OWNER_SOURCE_ID })]);
    // Uploading the same row again changes nothing; '-' clears the link through a new draft.
    const again = await importFile(csv(['headword', 'pos', 'gloss_vi', 'example_en_1', 'form_of'],
      [['went', 'verb', 'đã đi (quá khứ của go)', 'He went home.', 'go/verb:past']]));
    expect(again.outcomes).toEqual([expect.objectContaining({ outcome: 'unchanged' })]);
    const cleared = await importFile(csv(['headword', 'pos', 'form_of', 'sense_id', 'revision'],
      [['went', 'verb', '-', went.senses[0].id, '1']]));
    expect(cleared.outcomes).toEqual([expect.objectContaining({ outcome: 'updated' })]);
    expect(await ctx.prisma.senseRevision.findFirstOrThrow({ where: { senseId: went.senses[0].id, revisionNo: 2 } }))
      .toMatchObject({ formOfEntryId: null, formKind: null });
  });

  it('a reviewed inflections cell replaces library rows, an empty cell keeps them', async () => {
    const go = await catalogWord('go', 'verb', { level: 'A1' });
    await write('go', 'verb', (tx) => content.replaceInflections(tx, go.entryId, 'library', goForms));
    const reviewed = await importFile(csv(['headword', 'pos', 'inflections'],
      [['go', 'verb', 'third_person:goes; present_participle:going; past:went; past_participle:gone']]));
    expect(reviewed.outcomes).toEqual([expect.objectContaining({ outcome: 'updated' })]);
    const after = await forms(go.entryId);
    expect(after).toEqual([
      { form: 'went', kind: 'past', source: 'reviewed' }, { form: 'gone', kind: 'past_participle', source: 'reviewed' },
      { form: 'going', kind: 'present_participle', source: 'reviewed' }, { form: 'goes', kind: 'third_person', source: 'reviewed' },
    ]);
    const empty = await importFile(csv(['headword', 'pos', 'inflections'], [['go', 'verb', '']]));
    expect(empty.outcomes).toEqual([expect.objectContaining({ outcome: 'unchanged' })]);
    expect(await forms(go.entryId)).toEqual(after);
    // The same reviewed set again is unchanged, not a rewrite.
    const same = await importFile(csv(['headword', 'pos', 'inflections'],
      [['go', 'verb', 'past:went; past_participle:gone; third_person:goes; present_participle:going']]));
    expect(same.outcomes).toEqual([expect.objectContaining({ outcome: 'unchanged' })]);
  });

  it('an unknown kind → invalid-inflection listing the kinds', async () => {
    await catalogWord('go', 'verb');
    const { outcomes } = await importFile(csv(['headword', 'pos', 'inflections'], [['go', 'verb', 'past:went; future:will go']]));
    expect(outcomes).toEqual([expect.objectContaining({ outcome: 'rejected', errorCodes: ['invalid-inflection'] })]);
    for (const kind of INFLECTION_KINDS) expect(outcomes[0].errorMessages[0]).toContain(kind);
    expect(await ctx.prisma.entryInflection.count()).toBe(0);
    const empty = await importFile(csv(['headword', 'pos', 'inflections'], [['go', 'verb', 'past:']]));
    expect(empty.outcomes).toEqual([expect.objectContaining({ errorCodes: ['invalid-inflection'] })]);
  });

  it('form_of naming a missing entry → form-of-not-found; a malformed cell → invalid-form-of', async () => {
    const { outcomes } = await importFile(csv(['headword', 'pos', 'gloss_vi', 'form_of'], [
      ['went', 'verb', 'đã đi', 'gogo/verb:past'], ['gone', 'verb', 'đã đi', 'go-verb-past'], ['goes', 'verb', 'đi', 'go/verb:future']]));
    expect(outcomes.map(({ errorCodes }) => errorCodes)).toEqual([['form-of-not-found'], ['invalid-form-of'], ['invalid-form-of']]);
    expect(await ctx.prisma.sense.count()).toBe(0);
  });

  it('two rows of one entry with different inflections → second row inflections-differ-in-file', async () => {
    const { outcomes } = await importFile(csv(['headword', 'pos', 'context_label', 'gloss_vi', 'inflections'], [
      ['leave', 'verb', 'go away', 'rời đi', 'past:left'], ['leave', 'verb', 'allow', 'để lại', ''],
      ['leave', 'verb', 'abandon', 'bỏ', 'past:leaved']]));
    expect(outcomes.map(({ outcome, errorCodes }) => [outcome, errorCodes])).toEqual([
      ['created', []], ['created', []], ['rejected', ['inflections-differ-in-file']]]);
    const leave = await ctx.prisma.entry.findFirstOrThrow({ where: { lemma: 'leave' } });
    expect(await forms(leave.id)).toEqual([{ form: 'left', kind: 'past', source: 'reviewed' }]);
  });

  it('export → upload with the new columns is unchanged and the entry\'s library forms stay library', async () => {
    const go = await catalogWord('go', 'verb', { level: 'A1', sense: full });
    await write('go', 'verb', (tx) => content.replaceInflections(tx, go.entryId, 'library', goForms));
    const leave = await catalogWord('leave', 'verb', { level: 'A1', sense: { ...full, glossVi: 'rời đi' } });
    await write('leave', 'verb', (tx) => content.replaceInflections(tx, leave.entryId, 'reviewed', [{ form: 'left', kind: 'past' }]));
    await importFile(csv(['headword', 'pos', 'gloss_vi', 'example_en_1', 'form_of'], [['went', 'verb', 'đã đi', 'He went.', 'go/verb:past']]));
    const exported = await exportFile('/v1/admin/content/senses/export', {});
    expect(exported.headers).toEqual(['headword', 'pos', 'gloss_vi', 'definition_en', 'example_en_1', 'example_en_2', 'example_en_3',
      'topics', 'accepted_forms', 'context_label', 'form_of', 'inflections', 'sense_id', 'revision', '_status', '_level', '_inflections']);
    expect(exported.rows.find((row) => row.headword === 'go')).toMatchObject({ inflections: '', form_of: '',
      _inflections: 'third_person:goes; present_participle:going; past:goed; past_participle:goed' });
    expect(exported.rows.find((row) => row.headword === 'leave')).toMatchObject({ inflections: 'past:left', _inflections: '' });
    expect(exported.rows.find((row) => row.headword === 'went')).toMatchObject({ form_of: 'go/verb:past' });
    const before = await ctx.prisma.entryInflection.findMany({ orderBy: { id: 'asc' } });
    const { outcomes } = await importFile(exported.bytes);
    expect(outcomes.map(({ outcome }) => outcome)).toEqual(['unchanged', 'unchanged', 'unchanged']);
    expect(await ctx.prisma.entryInflection.findMany({ orderBy: { id: 'asc' } })).toEqual(before);
    // The entries-without-sense export carries the same entry-level columns.
    await catalogWord('mouse', 'noun', { level: 'A1' });
    const entries = await exportFile('/v1/admin/content/entries/export', { has_sense: 'false' });
    expect(entries.headers).toEqual(['headword', 'pos', 'gloss_vi', 'definition_en', 'example_en_1', 'example_en_2', 'example_en_3',
      'topics', 'accepted_forms', 'context_label', 'form_of', 'inflections', '_level', '_inflections']);
  });

  it('re-uploading a level file whose rows carry an unchanged inflections cell is prefiltered as unchanged', async () => {
    const source = await ctx.prisma.dataSource.create({ data: {
      kind: 'third_party', name: `CEFR-J ${randomUUID()}`, version: '1.5', displayPriority: 10, license: 'fixture', attribution: 'fixture',
    } });
    const bytes = csv(['headword', 'pos', 'CEFR', 'inflections'], [['go', 'verb', 'A1', 'past:went; past_participle:gone']]);
    const first = await importFile(bytes, source.id);
    expect(first.outcomes).toEqual([expect.objectContaining({ outcome: 'created' })]);
    expect(await ctx.prisma.importRowKey.count({ where: { batchId: first.id, kind: 'inflection' } })).toBe(1);
    const second = await importFile(bytes, source.id);
    expect(second.outcomes).toEqual([expect.objectContaining({ outcome: 'unchanged' })]);
  });
});
