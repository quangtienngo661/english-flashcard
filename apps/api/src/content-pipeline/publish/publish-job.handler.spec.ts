import { describe, expect, it, vi } from 'vitest';
import type { AppConfig } from '../../common/config/app-config.js';
import type { AppLogger } from '../../common/logging/app-logger.js';
import type { ContentService } from '../../content/index.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type { BackgroundJobsService } from '../jobs/background-jobs.service.js';
import type { JobHandlerRegistry } from '../jobs/job-handler.registry.js';
import type { JobContext } from '../jobs/job-types.js';
import { PublishJobHandler } from './publish-job.handler.js';

const JOB = '00000000-0000-4000-8000-0000000000c1';
const ACTOR = '00000000-0000-4000-8000-0000000000a1';

describe('PublishJobHandler', () => {
  it('FE21: the job publishes each item with skipUnpublished, so a sense staff hid stays hidden', async () => {
    const item = { jobId: JOB, senseId: 's1', revisionNo: 3, outcome: 'pending' };
    const tx = {
      publishJobItem: {
        findUniqueOrThrow: vi.fn(async () => item),
        update: vi.fn(async () => ({})),
        groupBy: vi.fn(async () => [{ outcome: 'published', _count: { _all: 1 } }]),
      },
      backgroundJob: { findUniqueOrThrow: vi.fn(async () => ({ createdBy: ACTOR })) },
      publishJob: { update: vi.fn(async () => ({})) },
    };
    const prisma = {
      publishJob: { findUniqueOrThrow: vi.fn(async () => ({ id: JOB })) },
      publishJobItem: { findMany: vi.fn(async () => [{ senseId: 's1' }]) },
    } as unknown as PrismaClient;
    const content = { publishItem: vi.fn(async () => ({ outcome: 'published' })) } as unknown as ContentService;
    const jobs = { get: vi.fn(async () => ({ operationId: '00000000-0000-4000-8000-0000000000d1' })) } as unknown as BackgroundJobsService;
    const config = { pipeline: { rowRetries: 0, rowRetryBaseMs: 1 } } as unknown as AppConfig;
    const logger = { info: vi.fn(), warn: vi.fn() } as unknown as AppLogger;
    const handler = new PublishJobHandler(prisma, config, content, jobs, {} as JobHandlerRegistry, logger);
    const ctx: JobContext = { jobId: JOB, attempt: 1, epoch: 1, tx: (fn) => fn(tx as never) };

    await expect(handler.run(ctx)).resolves.toBe('succeeded');
    expect(content.publishItem).toHaveBeenCalledWith({ senseId: 's1', revision: 3 }, ACTOR, { skipUnpublished: true });
  });
});
