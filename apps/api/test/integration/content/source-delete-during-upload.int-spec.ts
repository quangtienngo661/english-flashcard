import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { SystemClock } from '../../../src/common/clock/clock.js';
import type { AppConfig } from '../../../src/common/config/app-config.js';
import { ProblemDetailsException } from '../../../src/common/problem-details/problem-details.exception.js';
import { BackgroundJobsService } from '../../../src/content-pipeline/jobs/background-jobs.service.js';
import type { JobQueueService } from '../../../src/content-pipeline/jobs/job-queue.service.js';
import { UploadsService } from '../../../src/content-pipeline/upload/uploads.service.js';
import type { ContentService } from '../../../src/content/content.service.js';
import { SourcesService, isSourceComplete } from '../../../src/content/sources/sources.service.js';
import { createIntegrationPrisma, type IntegrationPrisma } from '../support/integration-prisma.js';

describe('ARC-02: source delete during upload batch creation', () => {
  let db: IntegrationPrisma;
  let sources: SourcesService;

  beforeAll(async () => {
    db = await createIntegrationPrisma();
    sources = new SourcesService(db.prisma);
  });

  afterAll(async () => {
    await db.close();
  });

  it('throws 404 not-found and creates 0 import_batches when the source is deleted before the batch transaction', async () => {
    const created = await sources.create({
      name: `Test Source ${randomUUID().slice(0, 8)}`,
      version: '1.0',
      license: 'CC BY-SA 4.0',
      display_priority: 10,
    });
    const cachedSource = await sources.getSource(created.id);
    expect(cachedSource).not.toBeNull();

    // Delete the source to simulate the TOCTOU window after UploadsService.accept()'s initial getSource() check.
    await sources.remove(created.id);

    const contentFacade = {
      getSource: vi.fn(async () => cachedSource),
      isSourceComplete,
      lockSourceForBatch: (tx: Parameters<SourcesService['lockSourceForBatch']>[0], id: string) =>
        sources.lockSourceForBatch(tx, id),
    } as unknown as ContentService;

    const config = {
      pipeline: { importMaxRows: 1000, importMaxBytes: 1024 * 1024, jobLeaseSeconds: 60 },
    } as unknown as AppConfig;
    const jobs = new BackgroundJobsService(db.prisma, new SystemClock(), config);
    const queue = { enqueue: vi.fn(async () => {}) } as unknown as JobQueueService;
    const uploads = new UploadsService(db.prisma, config, contentFacade, jobs, queue);

    const csv = Buffer.from('lemma,pos,cefr\napple,noun,A1\n', 'utf8');
    const file = {
      originalname: 'words.csv',
      buffer: csv,
      size: csv.length,
    } as Express.Multer.File;

    await expect(
      uploads.accept({ userId: randomUUID() }, file, created.id, randomUUID()),
    ).rejects.toMatchObject({
      problemType: 'not-found',
    });

    const batches = await db.prisma.importBatch.count({ where: { levelSourceId: created.id } });
    expect(batches).toBe(0);
  });

  it('blocks SourcesService.remove while lockSourceForBatch holds FOR KEY SHARE and rejects delete as source-in-use after batch commit', async () => {
    const created = await sources.create({
      name: `Concurrent Source ${randomUUID().slice(0, 8)}`,
      version: '1.0',
      license: 'CC BY-SA 4.0',
      display_priority: 10,
    });

    const config = {
      pipeline: { importMaxRows: 1000, importMaxBytes: 1024 * 1024, jobLeaseSeconds: 60 },
    } as unknown as AppConfig;
    const jobs = new BackgroundJobsService(db.prisma, new SystemClock(), config);

    let releaseLock!: () => void;
    const lockAcquired = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    const txPromise = db.prisma.$transaction(async (tx) => {
      try {
        const locked = await sources.lockSourceForBatch(tx, created.id);
        expect(locked).toBe(true);
      } finally {
        releaseLock();
      }
      await delay(1000);
      const id = await jobs.create(tx, {
        queue: 'content-import',
        createdBy: randomUUID(),
        operationId: randomUUID(),
        exclusiveKey: `content-import:${created.id}`,
      });
      await tx.importBatch.create({
        data: {
          id,
          levelSourceId: created.id,
          fileName: 'words.csv',
          fileSha256: '0'.repeat(64),
          fileSize: 20,
          rowCount: 1,
          rawHeaders: ['lemma', 'pos', 'cefr'],
          warnings: [],
          counters: {},
        },
      });
    }, { timeout: 10_000, maxWait: 5_000 });

    await lockAcquired;

    let removeErr: unknown;
    const removePromise = sources.remove(created.id).catch((err) => {
      removeErr = err;
    });

    await Promise.all([txPromise, removePromise]);

    expect(removeErr).toBeInstanceOf(ProblemDetailsException);
    expect((removeErr as ProblemDetailsException).getStatus()).toBe(409);
    expect((removeErr as ProblemDetailsException).problemType).toBe('source-in-use');

    const stillExists = await db.prisma.dataSource.findUnique({ where: { id: created.id } });
    expect(stillExists).not.toBeNull();
  });
});
