import type { Prisma } from '../../generated/prisma/client.js';

export type JobQueueName = 'content-import' | 'content-publish' | 'content-inflections';

/**
 * `error_summary` of a job staff stopped. The status CHECK has no `cancelled`, so a stopped job is `failed` with this
 * summary; real failures read `<Name>: <message>` or a fixed phrase, so none can equal it.
 */
export const CANCELLED_SUMMARY = 'cancelled';

export class LeaseLostError extends Error {
  constructor(jobId: string) {
    super(`Lease lost for job ${jobId}`);
    this.name = 'LeaseLostError';
  }
}

export interface JobContext {
  jobId: string;
  attempt: number;
  epoch: number;
  tx<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}

export interface JobHandler {
  readonly queue: JobQueueName;
  run(ctx: JobContext): Promise<'succeeded' | 'partial'>;
}
