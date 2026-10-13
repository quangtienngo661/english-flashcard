import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Prisma } from '../../src/generated/prisma/client.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';

describe('pipeline schema (e2e, isolated database)', () => {
  let ctx: TestApp;
  const job = (status = 'queued', exclusiveKey: string | null = null) => ctx.prisma.backgroundJob.create({
    data: { queue: 'content-import', status, exclusiveKey, createdBy: randomUUID(), operationId: randomUUID() },
  });
  const batchData = (id: string) => ({
    id, fileName: 'vocabulary.csv', fileSha256: 'a'.repeat(64), fileSize: 100, rowCount: 1,
    rawHeaders: ['headword', 'pos', 'cefr'], warnings: [], counters: { processed: 0 },
  });
  const batch = async () => {
    const { id } = await job();
    return ctx.prisma.importBatch.create({ data: batchData(id) });
  };
  const jobs = () => ctx.prisma.backgroundJob.findMany({ orderBy: { id: 'asc' } });
  const snapshot = async () => ({
    jobs: await jobs(),
    batches: await ctx.prisma.importBatch.findMany({ orderBy: { id: 'asc' } }),
    files: await ctx.prisma.importBatchFile.findMany({ orderBy: { batchId: 'asc' } }),
    outcomes: await ctx.prisma.importRowOutcome.findMany({ orderBy: [{ batchId: 'asc' }, { rowNumber: 'asc' }] }),
    keys: await ctx.prisma.importRowKey.findMany({ orderBy: [{ kind: 'asc' }, { sourceId: 'asc' }, { rowKey: 'asc' }, { contentHash: 'asc' }] }),
    records: await ctx.prisma.batchRecord.findMany({ orderBy: [{ batchId: 'asc' }, { recordType: 'asc' }, { recordId: 'asc' }] }),
  });

  beforeAll(async () => {
    ctx = await createTestApp({ databaseUrl: await createIsolatedDatabase() });
  });
  beforeEach(async () => { await ctx.prisma.backgroundJob.deleteMany(); });
  afterAll(async () => { await ctx?.close(); });

  it('status and kind check constraints refuse unknown values; unknown queue, outcome and record_type are also refused', async () => {
    const { id: batchId } = await batch();
    // Every allowed enum value is a control; raw SQL below bypasses client-side validation.
    for (const queue of ['content-import', 'content-publish']) {
      for (const status of ['queued', 'running', 'succeeded', 'partial', 'failed']) {
        await ctx.prisma.backgroundJob.create({ data: {
          queue, status, createdBy: randomUUID(), operationId: randomUUID(),
        } });
      }
    }
    const outcomes = ['created', 'updated', 'unchanged', 'rejected'];
    for (const [index, outcome] of outcomes.entries()) {
      await ctx.prisma.importRowOutcome.create({ data: {
        batchId, rowNumber: index + 2, outcome,
        errorCodes: outcome === 'rejected' ? ['invalid-pos'] : [],
        ...(outcome === 'rejected' ? { raw: ['bank', 'nuon', 'B1'] } : {}),
      } });
    }
    for (const kind of ['level', 'content']) {
      await ctx.prisma.importRowKey.create({ data: {
        batchId, kind, sourceId: randomUUID(), rowKey: 'bank:noun', contentHash: 'hash',
      } });
    }
    for (const recordType of ['entry', 'variant', 'level', 'sense', 'revision']) {
      await ctx.prisma.batchRecord.create({ data: {
        batchId, recordType, recordId: randomUUID(),
        ...(recordType === 'revision' ? { meta: { replacedRevisionId: randomUUID() } } : {}),
      } });
    }
    const before = await snapshot();
    const invalid = [
      Prisma.sql`INSERT INTO background_jobs (queue, status, created_by, operation_id)
        VALUES ('content-import', 'unknown', ${randomUUID()}::uuid, ${randomUUID()}::uuid)`,
      Prisma.sql`INSERT INTO background_jobs (queue, created_by, operation_id)
        VALUES ('unknown', ${randomUUID()}::uuid, ${randomUUID()}::uuid)`,
      Prisma.sql`INSERT INTO import_row_outcomes (batch_id, row_number, outcome)
        VALUES (${batchId}::uuid, 99, 'unknown')`,
      Prisma.sql`INSERT INTO import_row_keys (kind, source_id, row_key, content_hash, batch_id)
        VALUES ('unknown', ${randomUUID()}::uuid, 'invalid', 'hash', ${batchId}::uuid)`,
      Prisma.sql`INSERT INTO batch_records (batch_id, record_type, record_id)
        VALUES (${batchId}::uuid, 'unknown', ${randomUUID()}::uuid)`,
    ];
    for (const statement of invalid) {
      await expect(ctx.prisma.$executeRaw(statement)).rejects.toThrow(/check constraint/i);
      expect(await snapshot()).toEqual(before);
    }
    expect(await ctx.prisma.importRowOutcome.findUniqueOrThrow({
      where: { batchId_rowNumber: { batchId, rowNumber: 5 } },
    })).toMatchObject({ raw: ['bank', 'nuon', 'B1'], errorCodes: ['invalid-pos'] });
  });

  it('import_row_keys is unique on (kind, source, key, hash) but the same key with another hash is allowed', async () => {
    const first = await batch();
    const second = await batch();
    const key = { kind: 'level', sourceId: randomUUID(), rowKey: 'bank:noun', contentHash: 'hash-1' };
    await ctx.prisma.importRowKey.create({ data: { ...key, batchId: first.id } });
    const before = await snapshot();
    for (const batchId of [first.id, second.id]) {
      await expect(ctx.prisma.importRowKey.create({ data: { ...key, batchId } })).rejects.toMatchObject({ code: 'P2002' });
      expect(await snapshot()).toEqual(before);
    }
    const allowed = [
      { ...key, contentHash: 'hash-2' },
      { ...key, kind: 'content' },
      { ...key, sourceId: randomUUID() },
      { ...key, rowKey: 'bank:verb' },
    ];
    for (const data of allowed) await ctx.prisma.importRowKey.create({ data: { ...data, batchId: second.id } });
    expect(await ctx.prisma.importRowKey.findMany()).toHaveLength(5);
  });

  it('import_row_outcomes has primary key (batch_id, row_number) and batch_records is unique on (batch_id, record_type, record_id)', async () => {
    const first = await batch();
    const second = await batch();
    const recordId = randomUUID();
    await ctx.prisma.importRowOutcome.create({ data: { batchId: first.id, rowNumber: 2, outcome: 'created' } });
    await ctx.prisma.batchRecord.create({ data: { batchId: first.id, recordType: 'entry', recordId } });
    const before = await snapshot();
    await expect(ctx.prisma.importRowOutcome.create({ data: {
      batchId: first.id, rowNumber: 2, outcome: 'updated',
    } })).rejects.toMatchObject({ code: 'P2002' });
    expect(await snapshot()).toEqual(before);
    await expect(ctx.prisma.batchRecord.create({ data: {
      batchId: first.id, recordType: 'entry', recordId,
    } })).rejects.toMatchObject({ code: 'P2002' });
    expect(await snapshot()).toEqual(before);
    await ctx.prisma.importRowOutcome.create({ data: { batchId: first.id, rowNumber: 3, outcome: 'unchanged' } });
    await ctx.prisma.importRowOutcome.create({ data: { batchId: second.id, rowNumber: 2, outcome: 'created' } });
    await ctx.prisma.batchRecord.create({ data: { batchId: second.id, recordType: 'entry', recordId } });
    await ctx.prisma.batchRecord.create({ data: { batchId: first.id, recordType: 'variant', recordId } });
    await ctx.prisma.batchRecord.create({ data: { batchId: first.id, recordType: 'entry', recordId: randomUUID() } });
    expect(await ctx.prisma.importRowOutcome.count()).toBe(3);
    expect(await ctx.prisma.batchRecord.count()).toBe(4);
  });

  it('deleting a background job cascades to its import_batch, file, outcomes and records, including row keys', async () => {
    const doomed = await batch();
    const retained = await batch();
    const bytes = Buffer.from('headword,pos,cefr\r\nbank,noun,B1\r\n');
    for (const { id: batchId } of [doomed, retained]) {
      await ctx.prisma.importBatchFile.create({ data: { batchId, content: bytes } });
      await ctx.prisma.importRowOutcome.create({ data: { batchId, rowNumber: 2, outcome: 'created' } });
      await ctx.prisma.importRowKey.create({ data: {
        batchId, kind: 'level', sourceId: randomUUID(), rowKey: 'bank:noun', contentHash: 'hash',
      } });
      await ctx.prisma.batchRecord.create({ data: { batchId, recordType: 'entry', recordId: randomUUID() } });
    }
    const before = await snapshot();
    expect(before.jobs).toHaveLength(2);
    expect(before.batches).toHaveLength(2);
    expect(before.files).toHaveLength(2);
    expect(before.outcomes).toHaveLength(2);
    expect(before.keys).toHaveLength(2);
    expect(before.records).toHaveLength(2);
    expect(Buffer.from((await ctx.prisma.importBatchFile.findUniqueOrThrow({
      where: { batchId: doomed.id },
    })).content)).toEqual(bytes);

    await ctx.prisma.backgroundJob.delete({ where: { id: doomed.id } });
    expect(await snapshot()).toEqual({
      jobs: before.jobs.filter((row) => row.id === retained.id),
      batches: before.batches.filter((row) => row.id === retained.id),
      files: before.files.filter((row) => row.batchId === retained.id),
      outcomes: before.outcomes.filter((row) => row.batchId === retained.id),
      keys: before.keys.filter((row) => row.batchId === retained.id),
      records: before.records.filter((row) => row.batchId === retained.id),
    });
  });

  it('an import_batch cannot exist without a background_jobs row, and one job has at most one batch and file', async () => {
    const before = await snapshot();
    await expect(ctx.prisma.importBatch.create({ data: batchData(randomUUID()) })).rejects.toMatchObject({ code: 'P2003' });
    expect(await snapshot()).toEqual(before);
    const { id } = await job();
    await ctx.prisma.importBatch.create({ data: batchData(id) });
    await ctx.prisma.importBatchFile.create({ data: { batchId: id, content: Buffer.from('csv') } });
    const populated = await snapshot();
    await expect(ctx.prisma.importBatch.create({ data: batchData(id) })).rejects.toMatchObject({ code: 'P2002' });
    expect(await snapshot()).toEqual(populated);
    await expect(ctx.prisma.importBatchFile.create({ data: { batchId: id, content: Buffer.from('another') } })).rejects.toMatchObject({ code: 'P2002' });
    expect(await snapshot()).toEqual(populated);
  });

  it('B2E26: background_jobs.created_by and import_batches.level_source_id carry no foreign key, so deleting a user or a source leaves batch history intact', async () => {
    const user = await ctx.prisma.user.create({ data: { email: `${randomUUID()}@example.test`, timezone: 'Asia/Saigon' } });
    const source = await ctx.prisma.dataSource.create({ data: {
      kind: 'third_party', name: `source-${randomUUID()}`, version: '1.5', license: 'test', displayPriority: 10,
    } });
    const { id } = await ctx.prisma.backgroundJob.create({ data: {
      queue: 'content-import', createdBy: user.id, operationId: randomUUID(),
    } });
    await ctx.prisma.importBatch.create({ data: { ...batchData(id), levelSourceId: source.id } });
    await ctx.prisma.importRowKey.create({ data: {
      batchId: id, kind: 'level', sourceId: source.id, rowKey: 'bank:noun', contentHash: 'hash',
    } });
    const before = await snapshot();
    await ctx.prisma.user.delete({ where: { id: user.id } });
    expect(await ctx.prisma.user.findUnique({ where: { id: user.id } })).toBeNull();
    expect(await snapshot()).toEqual(before);
    await ctx.prisma.dataSource.delete({ where: { id: source.id } });
    expect(await ctx.prisma.dataSource.findUnique({ where: { id: source.id } })).toBeNull();
    expect(await snapshot()).toEqual(before);
    expect(await ctx.prisma.backgroundJob.findUniqueOrThrow({ where: { id } })).toMatchObject({ createdBy: user.id });
    expect(await ctx.prisma.importBatch.findUniqueOrThrow({ where: { id } })).toMatchObject({ levelSourceId: source.id });
  });

  it('exclusive_key partial unique index allows shared keys with at most one running job and refuses a second running job', async () => {
    const exclusiveKey = `content-import:${randomUUID()}`;
    const running = await job('running', exclusiveKey);
    const queued = await job('queued', exclusiveKey);
    for (const status of ['queued', 'succeeded', 'partial', 'failed']) await job(status, exclusiveKey);
    expect(await ctx.prisma.backgroundJob.count({ where: { exclusiveKey } })).toBe(6);
    const before = await jobs();
    await expect(ctx.prisma.$executeRaw`
      INSERT INTO background_jobs (queue, status, exclusive_key, created_by, operation_id)
      VALUES ('content-import', 'running', ${exclusiveKey}, ${randomUUID()}::uuid, ${randomUUID()}::uuid)
    `).rejects.toThrow(/unique constraint/i);
    expect(await jobs()).toEqual(before);
    // Acquiring a queued job also has to obey the same index.
    await expect(ctx.prisma.backgroundJob.update({
      where: { id: queued.id }, data: { status: 'running' },
    })).rejects.toMatchObject({ code: 'P2002' });
    expect(await jobs()).toEqual(before);
    await job('running', `content-import:${randomUUID()}`);
    await job('running');
    await job('running');
    await ctx.prisma.backgroundJob.update({ where: { id: running.id }, data: { status: 'succeeded' } });
    await ctx.prisma.backgroundJob.update({ where: { id: queued.id }, data: { status: 'running' } });
    expect(await ctx.prisma.backgroundJob.findMany({ where: { exclusiveKey, status: 'running' } })).toMatchObject([{ id: queued.id }]);
  });
});
