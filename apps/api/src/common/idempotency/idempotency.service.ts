import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import { tryAdvisoryLock } from '../../generated/prisma/sql.js';

export type RunIdempotentResult<T> =
  | { kind: 'proceed'; status: number; body: T }
  | { kind: 'replay'; status: number; body: unknown }
  | { kind: 'conflict'; retryAfterSeconds: number }
  | { kind: 'reject' };

export async function runIdempotent<T>(
  prisma: PrismaClient,
  params: { key: string; userId: string; endpoint: string; payloadHash: string },
  handler: () => Promise<{ status: number; body: T }>,
  options?: { timeoutSeconds?: number },
): Promise<RunIdempotentResult<T>> {
  const { key, userId, endpoint, payloadHash } = params;
  const timeoutSeconds = options?.timeoutSeconds ?? 30;
  const scope = { key, userId, endpoint };
  const where = { key_userId_endpoint: scope };

  // Keep the client-side bound: Postgres transaction/session timeouts terminate the connection,
  // which previously surfaced as an unhandled process-level exception through the pg pool.
  // The race does not cancel the handler; Prisma also gets the same explicit transaction bound
  // below so its own 5s default cannot cut a handler short before our configured timeout.
  const timeout = new Promise<RunIdempotentResult<T>>((_, reject) => {
    setTimeout(() => reject(new Error(`runIdempotent timed out after ${timeoutSeconds}s`)), timeoutSeconds * 1000);
  });

  const transaction = prisma.$transaction(async (tx): Promise<RunIdempotentResult<T>> => {
    const [{ locked }] = await tx.$queryRawTyped(tryAdvisoryLock(key, userId, endpoint));
    if (!locked) {
      return { kind: 'conflict', retryAfterSeconds: 2 };
    }

    let row = await tx.idempotencyKey.findFirst({ where: scope });

    if (row?.createdAt && row.createdAt.getTime() < Date.now() - 24 * 3600 * 1000) {
      await tx.idempotencyKey.delete({ where });
      row = null;
    }

    if (row?.status === 'succeeded' || row?.status === 'failed_permanent') {
      if (row.payloadHash !== payloadHash) {
        return { kind: 'reject' };
      }
      return { kind: 'replay', status: row.responseStatus!, body: row.responseBody };
    }

    if (!row) {
      await tx.idempotencyKey.create({
        data: {
          key,
          userId,
          endpoint,
          status: 'in_progress',
          payloadHash,
        },
      });
    } else if (row.status === 'in_progress') {
      await tx.idempotencyKey.update({ where, data: { payloadHash, updatedAt: new Date() } });
    } else {
      throw new Error(`Unexpected idempotency status: ${row.status}`);
    }

    const response = await handler();
    await tx.idempotencyKey.update({
      where,
      data: {
        status: 'succeeded',
        responseStatus: response.status,
        responseBody: response.body === null ? Prisma.JsonNull : (response.body as Prisma.InputJsonValue),
        updatedAt: new Date(),
      },
    });

    return { kind: 'proceed', status: response.status, body: response.body };
  }, { timeout: timeoutSeconds * 1000, maxWait: 10_000 });

  return Promise.race([transaction, timeout]);
}
