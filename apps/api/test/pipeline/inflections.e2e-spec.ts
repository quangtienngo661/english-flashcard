import { createHash, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ContentService, INFLECTION_KINDS, OWNER_SOURCE_ID, type InflectionKind, type RevisionContent } from '../../src/content/index.js';
import { ImportBatchHandler } from '../../src/content-pipeline/import/import-batch.handler.js';
import { ImportRowProcessor } from '../../src/content-pipeline/import/row-processor.js';
import { InflectionsBackfillHandler } from '../../src/content-pipeline/inflections/inflections-backfill.handler.js';
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

  it('D29/D46 (import): a newly created entry gets library forms in the same transaction; an inflections cell gives the reviewed set instead; existing entries and adjectives get none', async () => {
    const existing = await catalogWord('walk', 'verb');
    const { outcomes } = await importFile(csv(['headword', 'pos', 'inflections'], [
      ['run', 'verb', ''], ['mouse', 'noun', ''], ['happy', 'adjective', ''], ['go', 'verb', 'past:went'], ['walk', 'verb', '']]));
    expect(outcomes.map(({ outcome }) => outcome)).toEqual(['created', 'created', 'created', 'created', 'unchanged']);
    const formsOf = async (lemma: string) => {
      const entry = await ctx.prisma.entry.findFirstOrThrow({ where: { lemma } });
      return (await ctx.prisma.entryInflection.findMany({ where: { entryId: entry.id }, orderBy: { position: 'asc' } }))
        .map(({ kind, form, source }) => `${source} ${kind}:${form}`);
    };
    expect(await formsOf('run')).toEqual(['library third_person:runs', 'library present_participle:running',
      'library past:ran', 'library past_participle:run'].filter((form) => !form.endsWith(':run')));
    expect(await formsOf('mouse')).toEqual(['library plural:mice']);
    expect(await formsOf('happy')).toEqual([]);
    expect(await formsOf('go')).toEqual(['reviewed past:went']);
    expect(await forms(existing.entryId)).toEqual([]);
  });

  it('D47: a new uncountable noun gets no library plural, but a reviewed plural for it from CSV is kept', async () => {
    await importFile(csv(['headword', 'pos', 'inflections'], [['software', 'noun', ''], ['information', 'noun', 'plural:informations']]));
    const software = await ctx.prisma.entry.findFirstOrThrow({ where: { lemma: 'software' } });
    expect(await forms(software.id)).toEqual([]);
    await importFile(csv(['headword', 'pos', 'inflections'], [['software', 'noun', 'plural:softwares']]));
    expect(await forms(software.id)).toEqual([{ form: 'softwares', kind: 'plural', source: 'reviewed' }]);
    const information = await ctx.prisma.entry.findFirstOrThrow({ where: { lemma: 'information' } });
    expect(await forms(information.id)).toEqual([{ form: 'informations', kind: 'plural', source: 'reviewed' }]);
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

  it('L9: form_of to the row\'s own entry, a kind that does not fit the base\'s part of speech, or a NUL character rejects only that row', async () => {
    await catalogWord('go', 'verb');
    await catalogWord('book', 'noun');
    const { status, outcomes } = await importFile(csv(['headword', 'pos', 'gloss_vi', 'form_of'], [
      ['go', 'verb', 'đi', 'go/verb:past'], ['booked', 'verb', 'đã đặt', 'book/noun:past'], ['went', 'verb', 'đã đi', 'go\u0000/verb:past'],
      ['went', 'verb', 'đã đi', 'go/verb:past']]));
    expect(status).toBe('partial');
    expect(outcomes.map(({ outcome, errorCodes }) => [outcome, errorCodes])).toEqual([
      ['rejected', ['invalid-form-of']], ['rejected', ['invalid-form-of']], ['rejected', ['invalid-form-of']], ['created', []]]);
  });

  it('T-A2: form_of naming a private entry is not found; a new entry created by that rejected row is rolled back; a base without a level gives no derived level', async () => {
    const owner = randomUUID();
    await ctx.prisma.$executeRaw`INSERT INTO entries (language, lemma, pos, scope, owner_user_id) VALUES ('en', 'yeet', 'verb', 'private', ${owner}::uuid)`;
    const rejected = await importFile(csv(['headword', 'pos', 'gloss_vi', 'form_of'], [['yeeted', 'verb', 'ném', 'yeet/verb:past']]));
    expect(rejected.outcomes).toEqual([expect.objectContaining({ outcome: 'rejected', errorCodes: ['form-of-not-found'] })]);
    expect(await ctx.prisma.entry.count({ where: { lemma: 'yeeted' } })).toBe(0);
    await catalogWord('blorp', 'verb');
    await importFile(csv(['headword', 'pos', 'gloss_vi', 'form_of'], [['blorped', 'verb', 'đã blorp', 'blorp/verb:past']]));
    const blorped = await ctx.prisma.entry.findFirstOrThrow({ where: { lemma: 'blorped' }, include: { levels: true } });
    expect(blorped.levels).toEqual([]);
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

  it('T-A1: a level row that carries an inflections cell is always processed again (never skipped by the prefilter) and reports unchanged', async () => {
    const source = await ctx.prisma.dataSource.create({ data: {
      kind: 'third_party', name: `CEFR-J ${randomUUID()}`, version: '1.5', displayPriority: 10, license: 'fixture', attribution: 'fixture',
    } });
    const bytes = csv(['headword', 'pos', 'CEFR', 'inflections'], [['go', 'verb', 'A1', 'past:went; past_participle:gone']]);
    const first = await importFile(bytes, source.id);
    expect(first.outcomes).toEqual([expect.objectContaining({ outcome: 'created' })]);
    const processed = vi.spyOn(ctx.app.get(ImportRowProcessor), 'process');
    try {
      const second = await importFile(bytes, source.id);
      expect(second.outcomes).toEqual([expect.objectContaining({ outcome: 'unchanged' })]);
      expect(processed).toHaveBeenCalledTimes(1);
    } finally {
      processed.mockRestore();
    }
  });

  it('H1: re-uploading an earlier identical file after a later one changed the reviewed forms restores them', async () => {
    const go = await catalogWord('go', 'verb');
    const fa = csv(['headword', 'pos', 'inflections'], [['go', 'verb', 'past:went']]);
    expect((await importFile(fa)).outcomes.map(({ outcome }) => outcome)).toEqual(['updated']);
    expect((await importFile(csv(['headword', 'pos', 'inflections'], [['go', 'verb', 'past:goed']]))).outcomes
      .map(({ outcome }) => outcome)).toEqual(['updated']);
    expect(await forms(go.entryId)).toEqual([{ form: 'goed', kind: 'past', source: 'reviewed' }]);
    const again = await importFile(fa);
    expect(again.outcomes.map(({ outcome }) => outcome)).toEqual(['updated']);
    expect(await forms(go.entryId)).toEqual([{ form: 'went', kind: 'past', source: 'reviewed' }]);
  });

  it('M3: "-" records a reviewed empty set that the backfill and later imports respect; the error message names "-"', async () => {
    const pork = await catalogWord('pork', 'noun');
    await write('pork', 'noun', (tx) => content.replaceInflections(tx, pork.entryId, 'library', [{ form: 'porks', kind: 'plural' }]));
    const dash = await importFile(csv(['headword', 'pos', 'inflections'], [['pork', 'noun', '-']]));
    expect(dash.outcomes.map(({ outcome }) => outcome)).toEqual(['updated']);
    expect(await forms(pork.entryId)).toEqual([]);
    expect((await ctx.prisma.entry.findUniqueOrThrow({ where: { id: pork.entryId } })).inflectionsReviewedAt).toEqual(ctx.clock.now());
    // The same "-" again is unchanged; the backfill does not bring porks back.
    expect((await importFile(csv(['headword', 'pos', 'inflections'], [['pork', 'noun', '-']]))).outcomes
      .map(({ outcome }) => outcome)).toEqual(['unchanged']);
    const jobs = ctx.app.get(BackgroundJobsService);
    const jobId = await ctx.prisma.$transaction((tx) => jobs.create(tx, { queue: 'content-inflections', createdBy: actorId, operationId: randomUUID() }));
    const lease = await jobs.acquire(jobId, randomUUID());
    expect(await ctx.app.get(InflectionsBackfillHandler).run(makeJobContext(ctx.prisma, jobId, lease!.attempts, lease!.epoch))).toBe('succeeded');
    expect(await forms(pork.entryId)).toEqual([]);
    // Export shows "-" so an export → upload round trip keeps the decision.
    const exported = await exportFile('/v1/admin/content/entries/export', { has_sense: 'false' });
    // The formula guard writes "-" as "'-", and the upload strips it again.
    expect(exported.rows.find((row) => row.headword === 'pork')).toMatchObject({ inflections: "'-", _inflections: '' });
    expect((await importFile(exported.bytes)).outcomes.map(({ outcome }) => outcome)).toEqual(['unchanged']);
    expect(await forms(pork.entryId)).toEqual([]);
    const bad = await importFile(csv(['headword', 'pos', 'inflections'], [['pork', 'noun', 'plural']]));
    expect(bad.outcomes[0].errorMessages[0]).toContain('"-"');
  });

  it('M4: a row whose only cell is form_of "-" is not a content row: no sense is created and the entry stays in the has_sense=false export', async () => {
    await catalogWord('quiet', 'adjective', { level: 'A1' });
    const { outcomes } = await importFile(csv(['headword', 'pos', 'gloss_vi', 'form_of'], [['quiet', 'adjective', '', '-']]));
    expect(outcomes.map(({ outcome }) => outcome)).toEqual(['unchanged']);
    expect(await ctx.prisma.sense.count()).toBe(0);
    expect(await ctx.prisma.senseRevision.count()).toBe(0);
    const exported = await exportFile('/v1/admin/content/entries/export', { has_sense: 'false' });
    expect(exported.rows.map((row) => row.headword)).toContain('quiet');
  });

  it('M4: form_of "-" without sense_id clears the link of the sense the row matches, through a new draft', async () => {
    const go = await catalogWord('go', 'verb', { level: 'A1' });
    await importFile(csv(['headword', 'pos', 'gloss_vi', 'example_en_1', 'form_of'], [['went', 'verb', 'đã đi', 'He went.', 'go/verb:past']]));
    const went = await ctx.prisma.entry.findFirstOrThrow({ where: { lemma: 'went', pos: 'verb', scope: 'catalog' }, include: { senses: true } });
    const latest = () => ctx.prisma.senseRevision.findFirstOrThrow({ where: { senseId: went.senses[0].id }, orderBy: { revisionNo: 'desc' },
      select: { revisionNo: true, formOfEntryId: true, formKind: true } });
    expect(await latest()).toEqual({ revisionNo: 1, formOfEntryId: go.entryId, formKind: 'past' });
    const clear = csv(['headword', 'pos', 'form_of'], [['went', 'verb', '-']]);
    expect((await importFile(clear)).outcomes).toEqual([expect.objectContaining({ outcome: 'updated', errorCodes: [] })]);
    expect(await latest()).toEqual({ revisionNo: 2, formOfEntryId: null, formKind: null });
    expect(await ctx.prisma.sense.count({ where: { entryId: went.id } })).toBe(1);
    // Nothing left to clear: the same row again changes nothing.
    expect((await importFile(clear)).outcomes).toEqual([expect.objectContaining({ outcome: 'unchanged', errorCodes: [] })]);
    expect(await latest()).toEqual({ revisionNo: 2, formOfEntryId: null, formKind: null });
  });

  it('L8: reverting a batch whose file had an inflections column says that inflections are not reverted, and leaves them', async () => {
    const go = await catalogWord('go', 'verb');
    const { id } = await importFile(csv(['headword', 'pos', 'inflections'], [['go', 'verb', 'past:went']]));
    const res = await ctx.http().post(`/v1/admin/content/uploads/${id}/revert`).set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', randomUUID()).send({});
    expect(res.status).toBe(200);
    expect(res.body.report.not_reverted).toEqual([{ kind: 'inflections', detail: expect.stringContaining('inflections') }]);
    expect(await forms(go.entryId)).toEqual([{ form: 'went', kind: 'past', source: 'reviewed' }]);
    const plain = await importFile(csv(['headword', 'pos', 'gloss_vi'], [['run', 'verb', 'chạy']]));
    const plainRevert = await ctx.http().post(`/v1/admin/content/uploads/${plain.id}/revert`).set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', randomUUID()).send({});
    expect(plainRevert.body.report.not_reverted).toBeUndefined();
  });

  it('M5: confirming a derived level as editorial turns it into an editorial level', async () => {
    await catalogWord('go', 'verb', { level: 'A1' });
    await importFile(csv(['headword', 'pos', 'gloss_vi', 'example_en_1', 'form_of'], [['went', 'verb', 'đã đi', 'We went home.', 'go/verb:past']]));
    const went = await ctx.prisma.entry.findFirstOrThrow({ where: { lemma: 'went', scope: 'catalog' } });
    expect(await ctx.prisma.entryLevel.findMany({ where: { entryId: went.id }, select: { level: true, basis: true } }))
      .toEqual([{ level: 'A1', basis: 'derived' }]);
    await write('went', 'verb', (tx) => content.setEditorialLevel(tx, went.id, 'A1'));
    expect(await ctx.prisma.entryLevel.findMany({ where: { entryId: went.id }, select: { level: true, basis: true } }))
      .toEqual([{ level: 'A1', basis: 'editorial' }]);
  });
});
