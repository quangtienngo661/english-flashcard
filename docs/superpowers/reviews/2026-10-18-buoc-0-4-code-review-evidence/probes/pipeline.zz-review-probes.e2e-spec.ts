// Review probes (independent review 18/10/2026) — not part of the product suite; lives only in the review worktree.
import { createHash, randomUUID } from 'node:crypto';
import { appendFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ContentService, OWNER_SOURCE_ID } from '../../src/content/index.js';
import { ImportBatchHandler } from '../../src/content-pipeline/import/import-batch.handler.js';
import { BackgroundJobsService, makeJobContext } from '../../src/content-pipeline/jobs/background-jobs.service.js';
import { classifyColumns } from '../../src/content-pipeline/upload/columns.js';
import { parseUploadFile } from '../../src/content-pipeline/upload/csv-file.js';
import type { Prisma } from '../../src/generated/prisma/client.js';
import { seedUser, startSession } from '../support/auth-helpers.js';
import { createTestApp, type TestApp } from '../support/create-test-app.js';
import { createIsolatedDatabase } from '../support/isolated-database.js';
import { resetCatalog } from '../support/reset-catalog.js';
import { testConfig } from '../support/test-config.js';

const out = (...a: unknown[]) => appendFileSync(process.env.PROBE_OUT ?? 'probe.out', a.join(' ') + '\n');
const csv = (rows: string[], headers: string) => Buffer.from([headers, ...rows].join('\r\n'), 'utf8');

describe('review probes: pipeline', () => {
  let ctx: TestApp;
  let content: ContentService;
  let actorId: string;
  let token: string;
  const auth = () => ({ Authorization: `Bearer ${token}` });
  const write = <T>(lemma: string, pos: string, action: (tx: Prisma.TransactionClient) => Promise<T>) =>
    ctx.prisma.$transaction(async (tx) => {
      await content.lockEntryKey(tx, lemma, pos);
      return action(tx);
    }, { timeout: 10_000, maxWait: 5_000 });
  const importFile = async (bytes: Buffer, sourceId: string | null = OWNER_SOURCE_ID) => {
    const parsed = parseUploadFile(bytes, { maxRows: 100, maxBytes: 10_240 });
    const id = await ctx.prisma.$transaction(async (tx) => {
      const jobId = await ctx.app.get(BackgroundJobsService).create(tx, {
        queue: 'content-import', createdBy: actorId, operationId: randomUUID(),
        ...(sourceId ? { exclusiveKey: `content-import:${sourceId}` } : {}),
      });
      await tx.importBatch.create({ data: {
        id: jobId, levelSourceId: sourceId, fileName: 'fixture.csv', fileSha256: createHash('sha256').update(bytes).digest('hex'),
        fileSize: bytes.length, rowCount: parsed.rows.length, rawHeaders: parsed.rawHeaders,
        warnings: classifyColumns(parsed.headers).problems, counters: {},
      } });
      await tx.importBatchFile.create({ data: { batchId: jobId, content: Buffer.from(bytes) } });
      return jobId;
    });
    const jobs = ctx.app.get(BackgroundJobsService);
    const lease = await jobs.acquire(id, randomUUID());
    const context = makeJobContext(ctx.prisma, id, lease!.attempts, lease!.epoch);
    const status = await ctx.app.get(ImportBatchHandler).run(context);
    await jobs.finish(id, context.epoch, status);
    const outcomes = await ctx.prisma.importRowOutcome.findMany({ where: { batchId: id }, select: { rowNumber: true, outcome: true } });
    return { id, status, outcomes };
  };

  beforeAll(async () => {
    const config = testConfig();
    config.limits['user.write'].max = 10_000;
    ctx = await createTestApp({ databaseUrl: await createIsolatedDatabase(), config });
    content = ctx.app.get(ContentService);
  });
  beforeEach(async () => {
    await ctx.prisma.backgroundJob.deleteMany();
    await resetCatalog(ctx.prisma);
    await ctx.prisma.idempotencyKey.deleteMany();
    await ctx.prisma.rateLimitCounter.deleteMany();
    await ctx.prisma.user.deleteMany();
    ctx.clock.set(new Date('2026-10-18T12:00:00Z'));
    actorId = (await seedUser(ctx.prisma, { verified: true, staffRole: 'editor' })).userId;
    token = (await startSession(ctx, actorId)).accessToken;
  });
  afterAll(async () => { await ctx?.close(); });

  it('PL1: the header of a second-round rejected.csv (round-1 headers + _row,_error) is refused by the upload parser', () => {
    const round1 = parseUploadFile(csv(['bad,nonu,3,Unknown pos'], 'headword,pos,_row,_error'), { maxRows: 100, maxBytes: 10_240 });
    out('PL1 round-1 rejected.csv re-uploads: rows', round1.rows.length, 'rawHeaders', JSON.stringify(round1.rawHeaders));
    const round2Headers = [...round1.rawHeaders, '_row', '_error'].join(','); // what uploads-read.controller.ts:62 builds
    try {
      parseUploadFile(csv(['bad,noun,3,x,3,y'], round2Headers), { maxRows: 100, maxBytes: 10_240 });
      out('PL1 round-2 rejected.csv re-upload: accepted');
    } catch (e) {
      out('PL1 round-2 rejected.csv re-upload refused:', (e as { code?: string }).code, (e as Error).message);
    }
  });

  it('PL2: an unchanged old file uploaded again after an API edit of a column the file also has', async () => {
    const original = csv(['edited,noun,gốc,Original example.,business'], 'headword,pos,gloss_vi,example_en_1,topics');
    const first = await importFile(original);
    const entry = await ctx.prisma.entry.findFirstOrThrow({ where: { lemma: 'edited', scope: 'catalog' }, include: { senses: true } });
    const senseId = entry.senses[0].id;
    await write('edited', 'noun', (tx) => content.setEditorialLevel(tx, entry.id, 'A1'));
    out('PL2 import 1:', first.status, JSON.stringify(first.outcomes), 'publish rev1',
      JSON.stringify(await content.publishItem({ senseId, revision: 1 }, actorId)));
    const edit = await ctx.http().put(`/v1/admin/content/senses/${senseId}/draft`).set(auth())
      .send({ revision: 1, content: { examples_en: ['Edited example.'] } });
    const pub = await ctx.http().post('/v1/admin/content/senses/publish').set(auth()).send({ items: [{ sense_id: senseId, revision: 2 }] });
    out('PL2 API edit rev2', edit.status, 'publish rev2', pub.status, JSON.stringify(pub.body));
    const again = await importFile(original);
    const revs = await ctx.prisma.senseRevision.findMany({ where: { senseId }, orderBy: { revisionNo: 'asc' },
      select: { revisionNo: true, status: true, draftSource: true, examples: true } });
    out('PL2 import 2 of the same bytes:', again.status, 'row outcomes', JSON.stringify(again.outcomes));
    out('PL2 revisions now:', JSON.stringify(revs));
  });

  it('PL3: reverting batch A deletes entries a later batch and a learner still use', async () => {
    const a = await importFile(csv(['go,verb,A1', 'pork,noun,A1', 'deploy,verb,B1'], 'headword,pos,CEFR'));
    const b = await importFile(csv(['pork,noun,-'], 'headword,pos,inflections'), null);
    const c = await importFile(csv(['went,verb,đã đi,He went.,go/verb:past'], 'headword,pos,gloss_vi,example_en_1,form_of'), null);
    out('PL3 batches A/B/C:', a.status, b.status, c.status, JSON.stringify(b.outcomes), JSON.stringify(c.outcomes));
    const deploy = await ctx.prisma.entry.findFirstOrThrow({ where: { lemma: 'deploy', scope: 'catalog' } });
    const learner = randomUUID();
    const priv = await ctx.prisma.$transaction((tx) => content.createPrivateSense(tx, {
      ownerId: learner, lemma: 'deployed', pos: 'verb', meaning: { text: 'đã triển khai', language: 'vi' }, level: null, topicCodes: [],
      formOf: { entryId: deploy.id, kind: 'past' },
    } as Parameters<ContentService['createPrivateSense']>[1]), { timeout: 10_000, maxWait: 5_000 });
    const before = {
      porkReviewedAt: (await ctx.prisma.entry.findFirst({ where: { lemma: 'pork', scope: 'catalog' } }))?.inflectionsReviewedAt ?? null,
      wentFormOf: (await ctx.prisma.senseRevision.findFirst({ where: { sense: { entry: { lemma: 'went' } } } }))?.formOfEntryId ?? null,
      privateFormOf: (await ctx.prisma.senseRevision.findFirst({ where: { sense: { entry: { lemma: 'deployed', scope: 'private' } } } }))
        ?.formOfEntryId ?? null,
    };
    out('PL3 before revert:', JSON.stringify(before), 'private sense created', JSON.stringify(priv).slice(0, 120));
    const r = await ctx.http().post(`/v1/admin/content/uploads/${a.id}/revert`).set(auth()).set('Idempotency-Key', randomUUID()).send({});
    out('PL3 revert A:', r.status, JSON.stringify(r.body).slice(0, 400));
    const after = {
      entries: (await ctx.prisma.entry.findMany({ where: { lemma: { in: ['go', 'pork', 'deploy'] }, scope: 'catalog' }, select: { lemma: true } }))
        .map((e) => e.lemma),
      wentRevision: await ctx.prisma.senseRevision.findFirst({ where: { sense: { entry: { lemma: 'went' } } },
        select: { formOfEntryId: true, formKind: true } }),
      privateRevision: await ctx.prisma.senseRevision.findFirst({ where: { sense: { entry: { lemma: 'deployed', scope: 'private' } } },
        select: { formOfEntryId: true, formKind: true } }),
    };
    out('PL3 after revert:', JSON.stringify(after));
    expect(true).toBe(true);
  });
});
