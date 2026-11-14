import type { Prisma } from '../../generated/prisma/client.js';

export type PublishCounters = { processed: number; pending: number; published: number; already_published: number; refused: number };

/** Derives `publish_jobs.counters` from the job's items and stores them; the job's own report and a cancel both use it. */
export async function recountPublishJob(tx: Prisma.TransactionClient, jobId: string): Promise<PublishCounters> {
  const outcomes = await tx.publishJobItem.groupBy({ by: ['outcome'], where: { jobId }, _count: { _all: true } });
  const counts = { processed: 0, pending: 0, published: 0, already_published: 0, refused: 0 };
  for (const { outcome, _count } of outcomes) {
    if (outcome === 'pending' || outcome === 'published' || outcome === 'already_published' || outcome === 'refused') {
      counts[outcome] = _count._all;
    }
  }
  counts.processed = counts.published + counts.already_published + counts.refused;
  await tx.publishJob.update({ where: { id: jobId }, data: { counters: counts } });
  return counts;
}
