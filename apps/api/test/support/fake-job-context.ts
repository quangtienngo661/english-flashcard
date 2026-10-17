import { randomUUID } from 'node:crypto';
import type { JobContext } from '../../src/content-pipeline/jobs/job-types.js';
import type { Prisma, PrismaClient } from '../../src/generated/prisma/client.js';

/** Real transactions without the production FOR SHARE lease/epoch check. Tests using this
 * stand-in do not need a leased background_jobs row; its metadata is intentionally arbitrary.
 */
export function makeFakeJobContext(prisma: PrismaClient): JobContext {
  return {
    jobId: randomUUID(),
    attempt: 1,
    epoch: 1,
    tx<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
      return prisma.$transaction(fn, { timeout: 30_000, maxWait: 5_000 });
    },
  };
}
