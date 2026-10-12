import { Queue } from 'bullmq';
import { parse } from 'csv-parse/sync';
import { Redis } from 'ioredis';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { afterEach, beforeAll, beforeEach, describe, expect, inject, it } from 'vitest';
import { APP_CONFIG, type AppConfig } from '../../src/common/config/app-config.js';
import { encodeBoundToken } from '../../src/common/pagination/page-token.util.js';
import { LEVELS, OWNER_SOURCE_ID, VALID_POS } from '../../src/content/index.js';
import { parseUploadFile } from '../../src/content-pipeline/upload/csv-file.js';
import { toCsv } from '../../src/content-pipeline/upload/csv-writer.js';
import { normalizeRow } from '../../src/content-pipeline/upload/row-normalizer.js';
import { seedUser, startSession } from '../support/auth-helpers.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';
import { resetCatalog } from '../support/reset-catalog.js';

const endpoint = '/v1/admin/content/uploads';
const limits = { maxRows: 20_000, maxBytes: 10_000_000 };
const polling = { timeout: 15_000, interval: 20 };
const evidenceDirectory = new URL('../../../../docs/preparation/evidence/wordlists_2026-10-02/', import.meta.url);
const problem = (slug: string) => `https://api.example.com/problems/${slug}`;

describe('batch reports (e2e, real workers and isolated database)', () => {
  let databaseUrl: string;
  let ctx: TestApp;
  let editorToken: string;
  let rawQueue: Queue;
  let connection: Redis;

  const upload = async (bytes: Buffer, sourceId?: string, fileName = 'report.csv') => {
    const req = ctx.http().post(endpoint).set('Authorization', `Bearer ${editorToken}`)
      .set('Idempotency-Key', randomUUID());
    if (sourceId !== undefined) req.field('level_source_id', sourceId);
    const response = await req.attach('file', bytes, { filename: fileName, contentType: 'text/csv' });
    expect(response.status).toBe(202);
    return response.body.batch_id as string;
  };
  const get = (path: string, token = editorToken) => ctx.http().get(path).set('Authorization', `Bearer ${token}`);
  const report = async (id: string) => {
    const response = await get(`${endpoint}/${id}`);
    expect(response.status).toBe(200);
    return response.body;
  };
  const finish = async (id: string, status = 'succeeded', timeout = polling.timeout) => {
    await expect.poll(async () => (await ctx.prisma.backgroundJob.findUnique({ where: { id } }))?.status,
      { ...polling, timeout }).toBe(status);
    await expect.poll(() => rawQueue.getJob(id), polling).toBeUndefined();
    return report(id);
  };
  const download = async (id: string, token = editorToken) => {
    const response = await get(`${endpoint}/${id}/rejected.csv`, token);
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.headers['content-type']).toContain('charset=utf-8');
    expect(response.headers['content-disposition']).toBe(`attachment; filename="rejected-${id}.csv"`);
    expect(response.text.charCodeAt(0)).toBe(0xfeff);
    return response.text;
  };

  beforeAll(async () => { databaseUrl = await createIsolatedDatabase(); });
  beforeEach(async () => {
    ctx = await createTestApp({ databaseUrl, redisUrl: inject('redisUrl'), pipeline: {
      runWorkers: true, importMaxRows: limits.maxRows, importMaxBytes: limits.maxBytes,
      leaseSeconds: 60, heartbeatSeconds: 20, reconcileSeconds: 60, rowRetryBaseMs: 1, jobBackoffMs: 1,
    } });
    const config = ctx.app.get<AppConfig>(APP_CONFIG);
    connection = new Redis(config.redisUrl, { maxRetriesPerRequest: null });
    rawQueue = new Queue('content-import', { connection, prefix: config.pipeline.queuePrefix });
    await ctx.prisma.backgroundJob.deleteMany();
    await ctx.prisma.idempotencyKey.deleteMany();
    await resetCatalog(ctx.prisma);
    await ctx.prisma.rateLimitCounter.deleteMany();
    await ctx.prisma.user.deleteMany();
    const editor = await seedUser(ctx.prisma, { verified: true, staffRole: 'editor' });
    editorToken = (await startSession(ctx, editor.userId)).accessToken;
  });
  afterEach(async () => {
    const failures: unknown[] = [];
    try { await ctx?.close(); } catch (error) { failures.push(error); }
    if (rawQueue) {
      try { await rawQueue.obliterate({ force: true }); } catch (error) { failures.push(error); }
      try { await rawQueue.close(); } catch (error) { failures.push(error); }
    }
    connection?.disconnect();
    if (failures.length) throw new AggregateError(failures, 'Reports test cleanup failed');
  });

  it('B2#33: a finished report preserves original columns, raw rejected cells and every message after file purge', async () => {
    const headers = [' definition_en ', 'POS', ' HeadWord ', 'CEFR', 'gloss_vi', 'notes'];
    const rows = [
      ['A financial institution.', 'noun', 'bank', 'A1', 'ngân hàng', ''],
      ['A "quoted", definition.\r\nAnother line.', 'nuon', 'bad', 'D1', 'sai', '  raw, note  '],
    ];
    const id = await upload(Buffer.from(toCsv(headers, rows), 'utf8'), OWNER_SOURCE_ID, 'original.csv');
    const view = await finish(id, 'partial');
    const batch = await ctx.prisma.importBatch.findUniqueOrThrow({ where: { id }, include: { job: true } });
    expect(view).toEqual({ id, status: 'partial', file_name: 'original.csv', row_count: 2,
      counters: batch.counters, warnings: batch.warnings, created_at: batch.job.createdAt.toISOString(),
      started_at: batch.job.startedAt!.toISOString(), finished_at: batch.job.finishedAt!.toISOString(), reverted: false });
    expect(view.counters).toEqual({ processed: 2, created: 1, updated: 0, unchanged: 0, rejected: 1,
      entries_created: 1, variants_created: 0, levels_created: 1, senses_created: 1, revisions_created: 1 });
    expect(view.warnings).toEqual([]);
    expect(Date.parse(view.started_at)).toBeGreaterThanOrEqual(Date.parse(view.created_at));
    expect(Date.parse(view.finished_at)).toBeGreaterThanOrEqual(Date.parse(view.started_at));

    const text = await download(id);
    const parsed = parseUploadFile(Buffer.from(text, 'utf8'), limits);
    expect(parsed.rawHeaders).toEqual([...headers, '_row', '_error']);
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.rows[0].cells.slice(0, headers.length)).toEqual(rows[1]);
    expect(parsed.rows[0].cells[headers.length]).toBe('3');
    const [outcome] = await ctx.prisma.importRowOutcome.findMany({ where: { batchId: id, outcome: 'rejected' } });
    expect(outcome.errorCodes).toEqual(['invalid-pos', 'invalid-level']);
    expect(outcome.errorMessages).toEqual([
      `Loại từ "nuon" không hợp lệ. Giá trị hợp lệ: ${VALID_POS.join(', ')}.`,
      `Level "D1" không hợp lệ. Giá trị hợp lệ: ${LEVELS.join(', ')}.`,
    ]);
    expect(parsed.rows[0].cells.at(-1)).toBe(outcome.errorMessages.join('; '));
    await ctx.prisma.importBatchFile.delete({ where: { batchId: id } });
    expect(await ctx.prisma.importBatchFile.findUnique({ where: { batchId: id } })).toBeNull();
    expect(await download(id)).toBe(text);
    expect(await report(id)).toEqual(view);
  });

  it('B2#11 (report)/round trip: real Octanove rejects only records 606/2129; editing their pos re-imports exactly those rows', async () => {
    const bytes = readFileSync(new URL('octanove-vocabulary-profile-c1c2-1.0.csv', evidenceDirectory));
    const original = parseUploadFile(bytes, limits);
    expect(original.rawHeaders).toEqual(['headword', 'pos', 'CEFR', 'notes']);
    expect(original.rows).toHaveLength(2136);
    const badRows = original.rows.filter((row) => !normalizeRow(row.rowNumber,
      Object.fromEntries(original.headers.map((header, index) => [header, row.cells[index]])),
      { hasLevelColumn: true }).ok);
    expect(badRows).toEqual([
      { rowNumber: 606, cells: ['batter', '', 'C1', 'one who bats'] },
      { rowNumber: 2129, cells: ['remonstrate', 'vern', 'C2', ''] },
    ]);
    const source = await ctx.http().post('/v1/admin/content/sources').set('Authorization', `Bearer ${editorToken}`)
      .send({ name: 'Octanove', version: '1.0', license: 'test license', display_priority: 20 });
    expect(source.status).toBe(201);
    const sourceId = source.body.id as string;
    const id = await upload(bytes, sourceId, 'octanove.csv');
    const view = await finish(id, 'partial', 180_000);
    expect(view.row_count).toBe(2136);
    expect(view.counters).toMatchObject({ processed: 2136, rejected: 2 });
    const downloaded = parseUploadFile(Buffer.from(await download(id), 'utf8'), limits);
    expect(downloaded.rawHeaders).toEqual([...original.rawHeaders, '_row', '_error']);
    expect(downloaded.rows).toHaveLength(2);
    for (const [index, bad] of badRows.entries()) {
      const cells = downloaded.rows[index].cells;
      expect(cells.slice(0, 4)).toEqual(bad.cells);
      expect(cells[4]).toBe(String(bad.rowNumber));
      expect(cells[5]).toBe(`Loại từ ${JSON.stringify(bad.cells[1])} không hợp lệ. Giá trị hợp lệ: ${VALID_POS.join(', ')}.`);
    }
    expect(await ctx.prisma.importRowOutcome.count({ where: { batchId: id, outcome: 'rejected' } })).toBe(2);

    const fixed = downloaded.rows.map(({ cells }, index) => cells.map((cell, column) =>
      column === 1 ? (index === 0 ? 'noun' : 'verb') : cell));
    // The original _row (606/2129) and _error text remain byte-for-byte unchanged.
    expect(fixed.map((cells) => cells.slice(4))).toEqual(downloaded.rows.map(({ cells }) => cells.slice(4)));
    const fixedId = await upload(Buffer.from(toCsv(downloaded.rawHeaders, fixed), 'utf8'), sourceId, 'fixed.csv');
    expect(fixedId).not.toBe(id);
    const fixedView = await finish(fixedId);
    expect(fixedView).toMatchObject({ row_count: 2, warnings: [],
      counters: { processed: 2, created: 1, updated: 0, unchanged: 1, rejected: 0,
        entries_created: 1, levels_created: 1, senses_created: 0, revisions_created: 0 } });
    // batter noun C1 already exists at record 605; remonstrate verb C2 is new.
    expect(await ctx.prisma.importRowOutcome.findMany({ where: { batchId: fixedId }, orderBy: { rowNumber: 'asc' } }))
      .toMatchObject([{ rowNumber: 2, outcome: 'unchanged' }, { rowNumber: 3, outcome: 'created' }]);
    expect(await ctx.prisma.entry.findUniqueOrThrow({ where: { language_lemma_pos: { language: 'en', lemma: 'remonstrate', pos: 'verb' } },
      include: { levels: true } })).toMatchObject({ levels: [expect.objectContaining({ sourceId, level: 'C2' })] });
    expect(parse(await download(fixedId), { bom: true })).toEqual([[...downloaded.rawHeaders, '_row', '_error']]);
  }, 240_000);

  it('B2#28/Review Focus 2: fix only the bad pos in rejected.csv; formula content round-trips and _row/_error are ignored', async () => {
    const formula = '=SUM(A1),"B1"';
    const bytes = Buffer.from(`headword,pos,gloss_vi\r\nformula,nuon,"=SUM(A1),""B1"""\r\n`, 'utf8');
    const id = await upload(bytes);
    await finish(id, 'partial');
    const downloaded = parseUploadFile(Buffer.from(await download(id), 'utf8'), limits);
    expect(downloaded.rows[0].cells).toMatchObject(['formula', 'nuon', `'${formula}`, '2', expect.any(String)]);
    const fixed = downloaded.rows.map(({ cells }) => cells.map((cell, index) => index === 1 ? 'noun' : cell));
    expect(fixed[0].slice(2)).toEqual(downloaded.rows[0].cells.slice(2));
    const fixedId = await upload(Buffer.from(toCsv(downloaded.rawHeaders, fixed), 'utf8'));
    expect(await finish(fixedId)).toMatchObject({ row_count: 1, warnings: [],
      counters: { processed: 1, created: 1, updated: 0, unchanged: 0, rejected: 0 } });
    expect(await ctx.prisma.importRowOutcome.findMany({ where: { batchId: fixedId } }))
      .toMatchObject([{ rowNumber: 2, outcome: 'created' }]);
    expect(await ctx.prisma.senseRevisionText.findMany()).toMatchObject([{ language: 'vi', kind: 'gloss', text: formula }]);
  });

  it('B2#28 (report): surfaces the stored human-readable unknown-column warning', async () => {
    const id = await upload(Buffer.from('headword,pos,glos_vi,_note\r\nbank,noun,ignored,ignored\r\n'));
    const view = await finish(id);
    expect(view.warnings).toEqual([
      'Unknown column "glos_vi" is ignored. Check its spelling if you intended a supported column.',
    ]);
    expect(view.warnings).toEqual((await ctx.prisma.importBatch.findUniqueOrThrow({ where: { id } })).warnings);
  });

  it('B2E7: an invalid level rejects the whole otherwise-valid row and reports the single problem once', async () => {
    const id = await upload(Buffer.from('headword,pos,CEFR,gloss_vi,definition_en\r\nwhole,noun,D1,hợp lệ,Valid content.\r\n'), OWNER_SOURCE_ID);
    expect(await finish(id, 'partial')).toMatchObject({ row_count: 1,
      counters: { processed: 1, created: 0, updated: 0, unchanged: 0, rejected: 1,
        entries_created: 0, levels_created: 0, senses_created: 0, revisions_created: 0 } });
    expect(await ctx.prisma.entry.count()).toBe(0);
    expect(await ctx.prisma.entryLevel.count()).toBe(0);
    expect(await ctx.prisma.sense.count()).toBe(0);
    expect(await ctx.prisma.senseRevision.count()).toBe(0);
    expect(await ctx.prisma.batchRecord.count({ where: { batchId: id } })).toBe(0);
    const downloaded = parseUploadFile(Buffer.from(await download(id), 'utf8'), limits);
    expect(downloaded.rows).toHaveLength(1);
    expect(downloaded.rows[0].cells.slice(-2)).toEqual(['2', `Level "D1" không hợp lệ. Giá trị hợp lệ: ${LEVELS.join(', ')}.`]);
  });

  it('B2#33: duplicate-key and processor rejections also retain their full messages through recordRejected', async () => {
    const id = await upload(Buffer.from('headword,pos,gloss_vi,topics\r\nbank,noun,ngân hàng,\r\nbank,noun,ngân hàng,\r\nwalk,verb,đi bộ,missing-topic\r\n'));
    expect(await finish(id, 'partial')).toMatchObject({ counters: { processed: 3, created: 1, rejected: 2 } });
    const outcomes = await ctx.prisma.importRowOutcome.findMany({ where: { batchId: id, outcome: 'rejected' }, orderBy: { rowNumber: 'asc' } });
    expect(outcomes).toMatchObject([
      { rowNumber: 3, errorCodes: ['duplicate-key-in-file'], errorMessages: [expect.stringContaining('2')] },
      { rowNumber: 4, errorCodes: ['unknown-topic'], errorMessages: [expect.stringContaining('missing-topic')] },
    ]);
    const downloaded = parseUploadFile(Buffer.from(await download(id), 'utf8'), limits);
    expect(downloaded.rows.map(({ cells }) => cells.slice(-2)))
      .toEqual(outcomes.map((outcome) => [String(outcome.rowNumber), outcome.errorMessages.join('; ')]));
    expect(await ctx.prisma.entry.findFirst({ where: { lemma: 'walk' } })).toBeNull();
  });

  it('B2#33: lists newest first with a bound keyset token and deterministic id ties, even across a new upload', async () => {
    const create = async (name: string) => {
      const id = await upload(Buffer.from(`headword,pos\r\n${name},noun\r\n`), undefined, `${name}.csv`);
      await finish(id);
      return id;
    };
    const oldest = await create('oldest');
    ctx.clock.advance(1000);
    const ties = [await create('second'), await create('third')].sort();
    const first = await get(endpoint).query({ page_size: 1 });
    expect(first.status).toBe(200);
    expect(first.body.items).toEqual([expect.objectContaining({ id: ties[0], status: 'succeeded', row_count: 1,
      file_name: expect.any(String), created_at: ctx.clock.now().toISOString() })]);
    expect(first.body.next_page_token).toEqual(expect.any(String));
    ctx.clock.advance(1000);
    const newest = await create('newest');
    const second = await get(endpoint).query({ page_size: 1, page_token: first.body.next_page_token });
    expect(second.status).toBe(200);
    expect(second.body.items.map((item: { id: string }) => item.id)).toEqual([ties[1]]);
    const third = await get(endpoint).query({ page_size: 1, page_token: second.body.next_page_token });
    expect(third.status).toBe(200);
    expect(third.body.items.map((item: { id: string }) => item.id)).toEqual([oldest]);
    expect(third.body.next_page_token).toBeNull();
    const all = await get(endpoint);
    expect(all.status).toBe(200);
    expect(all.body.items.map((item: { id: string }) => item.id)).toEqual([newest, ...ties, oldest]);
    expect(all.body.next_page_token).toBeNull();

    const tokenEnvelope = JSON.parse(Buffer.from(first.body.next_page_token, 'base64url').toString('utf8'));
    tokenEnvelope.payload.created_at = 'not-a-date';
    for (const query of [
      { page_size: 0 }, { page_size: 101 }, { page_token: 'garbage' },
      { page_token: `${first.body.next_page_token}!` },
      { page_token: encodeBoundToken({ id: ties[0], created_at: ctx.clock.now().toISOString() }, 'another-route') },
      { page_token: Buffer.from(JSON.stringify(tokenEnvelope)).toString('base64url') },
      { unknown: 'filter' },
    ]) {
      const invalid = await get(endpoint).query(query);
      expect(invalid.status).toBe(400);
      expect(invalid.body.type).toBe(problem('validation-failed'));
    }
  });

  it('B2#33: a batch with no rejections downloads headers only; missing batches are not-found and bad ids are validation-failed', async () => {
    const id = await upload(Buffer.from('headword,pos\r\nbank,noun\r\n'));
    await finish(id);
    expect(parse(await download(id), { bom: true })).toEqual([['headword', 'pos', '_row', '_error']]);
    for (const suffix of ['', '/rejected.csv']) {
      const missing = await get(`${endpoint}/${randomUUID()}${suffix}`);
      expect(missing.status).toBe(404);
      expect(missing.body.type).toBe(problem('not-found'));
      const invalid = await get(`${endpoint}/bad-id${suffix}`);
      expect(invalid.status).toBe(400);
      expect(invalid.body.type).toBe(problem('validation-failed'));
    }
  });

  it('B2#33/B2#65: another editor with only content.import and an admin can read all three routes', async () => {
    const id = await upload(Buffer.from('headword,pos\r\nbank,nuon\r\n'));
    await finish(id, 'partial');
    const otherEditor = await seedUser(ctx.prisma, { verified: true, staffRole: 'editor' });
    const admin = await seedUser(ctx.prisma, { verified: true, staffRole: 'admin' });
    const tokens = [(await startSession(ctx, otherEditor.userId)).accessToken, (await startSession(ctx, admin.userId)).accessToken];
    ctx.rolePermissions.editor = ['content.import'];
    for (const token of tokens) {
      expect((await get(endpoint, token)).status).toBe(200);
      expect((await get(`${endpoint}/${id}`, token)).status).toBe(200);
      await download(id, token);
    }
    // The existing automatic admin-permissions suite discovers these routes and tests
    // learner, missing-content.import, unauthenticated and revoked-session refusal.
  });
});
