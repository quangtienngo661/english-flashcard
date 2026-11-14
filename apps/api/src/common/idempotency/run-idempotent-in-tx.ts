import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import { ProblemDetailsException } from '../problem-details/problem-details.exception.js';
import { decideClaim } from './claim-decision.js';

const RETENTION_MS = 24 * 3600 * 1000;

/** Use only when all business writes can share the receipt's transaction. */
export async function runIdempotentInTx<T>(
  prisma: PrismaClient,
  input: { key: string; userId: string; endpoint: string; payloadHash: string },
  handler: (tx: Prisma.TransactionClient, save: (body: T) => Promise<void>) => Promise<T>,
  { now = () => new Date() }: { now?: () => Date } = {},
): Promise<T> {
  const { payloadHash, ...scope } = input;
  return prisma.$transaction(async (tx) => {
    const [{ locked }] = await tx.$queryRaw<Array<{ locked: boolean }>>(Prisma.sql`
      SELECT pg_try_advisory_xact_lock(hashtext(${scope.key}::text || ':' || ${scope.userId}::text || ':' || ${scope.endpoint}::text)::bigint) AS locked`);
    const inProgress = () => new ProblemDetailsException({ status: 409, title: 'Request already in progress', retryAfterSeconds: 2 });
    if (!locked) throw inProgress();

    const startedAt = now();
    let row = await tx.idempotencyKey.findFirst({ where: scope });
    if (row && row.createdAt.getTime() < startedAt.getTime() - RETENTION_MS) {
      await tx.idempotencyKey.delete({ where: { key_userId_endpoint: scope } });
      row = null;
    }
    const decision = decideClaim(row, { payloadHash, now: startedAt, leaseSeconds: 30 });
    if (decision.kind === 'replay') return decision.body as T;
    if (decision.kind === 'reject') {
      throw new ProblemDetailsException({ status: 400, title: 'Idempotency-Key reused with a different payload' });
    }
    if (decision.kind === 'conflict') throw inProgress();
    if (decision.kind === 'abandoned') {
      throw new ProblemDetailsException({ status: 409, type: 'idempotency-key-abandoned', title: 'Previous attempt was interrupted' });
    }

    let saved = false;
    const result = await handler(tx, async (body) => {
      if (saved) throw new Error('Idempotent write saved two receipts');
      await tx.idempotencyKey.create({ data: {
        ...scope, status: 'succeeded', payloadHash, responseStatus: 200,
        responseBody: body === null ? Prisma.JsonNull : body as Prisma.InputJsonValue, createdAt: startedAt, updatedAt: now(),
      } });
      saved = true;
    });
    if (!saved) throw new Error('Idempotent write did not save a receipt');
    return result;
  }, { timeout: 30_000, maxWait: 5_000 });
}
