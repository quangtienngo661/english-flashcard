import { Prisma, type PrismaClient } from '../../generated/prisma/client.js';
import { tryAdvisoryLock } from '../../generated/prisma/sql.js';
import { decideClaim, type ClaimDecision } from './claim-decision.js';

export type RunIdempotentResult<T> =
  | { kind: 'proceed'; status: number; body: T }
  | { kind: 'replay'; status: number; body: unknown }
  | { kind: 'conflict'; retryAfterSeconds: number }
  | { kind: 'reject' }
  | { kind: 'abandoned' };

const RETENTION_MS = 24 * 3600 * 1000;

const isUniqueViolation = (error: unknown) =>
  error !== null && typeof error === 'object' && 'code' in error && error.code === 'P2002';

/**
 * C1: claim the key in a short transaction, run the handler outside any transaction, then record the result in a
 * separate write, so a request holds at most one connection at a time. `leaseSeconds` only decides whether a retry that
 * finds the key still `in_progress` is told "running" (conflict) or "interrupted" (abandoned); it never cuts the handler short.
 */
export async function runIdempotent<T>(
  prisma: PrismaClient,
  params: { key: string; userId: string; endpoint: string; payloadHash: string },
  handler: () => Promise<{ status: number; body: T }>,
  options?: { leaseSeconds?: number; now?: () => Date; onReleaseFailed?: (error: unknown) => void },
): Promise<RunIdempotentResult<T>> {
  const { key, userId, endpoint, payloadHash } = params;
  const leaseSeconds = options?.leaseSeconds ?? 30;
  const now = options?.now ?? (() => new Date());
  const scope = { key, userId, endpoint };

  let decision: ClaimDecision;
  try {
    decision = await prisma.$transaction(async (tx): Promise<ClaimDecision> => {
      const [{ locked }] = await tx.$queryRawTyped(tryAdvisoryLock(key, userId, endpoint));
      if (!locked) {
        return { kind: 'conflict', retryAfterSeconds: 2 };
      }

      const claimedAt = now();
      let row = await tx.idempotencyKey.findFirst({ where: scope });
      if (row && row.createdAt.getTime() < claimedAt.getTime() - RETENTION_MS) {
        await tx.idempotencyKey.delete({ where: { key_userId_endpoint: scope } });
        row = null;
      }

      const claim = decideClaim(row, { payloadHash, now: claimedAt, leaseSeconds });
      if (claim.kind === 'claim') {
        await tx.idempotencyKey.create({
          data: { ...scope, status: 'in_progress', payloadHash, createdAt: claimedAt, updatedAt: claimedAt },
        });
      }
      return claim;
    }, { maxWait: 10_000 });
  } catch (error) {
    // Two first requests with the same key: the advisory lock serializes their claims, but if both still reach the
    // insert, the loser is told the request is running.
    if (isUniqueViolation(error)) {
      return { kind: 'conflict', retryAfterSeconds: 2 };
    }
    throw error;
  }

  if (decision.kind !== 'claim') {
    return decision;
  }

  const claimed = { ...scope, status: 'in_progress' };
  let response: { status: number; body: T };
  try {
    response = await handler();
  } catch (error) {
    // The handler's error is what the client must see; if releasing the key fails too, the row stays in_progress and a
    // retry past the lease is told the key was abandoned.
    await prisma.idempotencyKey.deleteMany({ where: claimed }).catch((releaseError: unknown) => options?.onReleaseFailed?.(releaseError));
    throw error;
  }

  // If this write fails the row stays in_progress, and a retry past the lease is told the key was abandoned (FE31).
  await prisma.idempotencyKey.updateMany({
    where: claimed,
    data: {
      status: 'succeeded',
      responseStatus: response.status,
      responseBody: response.body === null ? Prisma.JsonNull : (response.body as Prisma.InputJsonValue),
      updatedAt: now(),
    },
  });

  return { kind: 'proceed', status: response.status, body: response.body };
}
