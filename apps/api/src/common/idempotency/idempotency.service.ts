import { and, eq, sql, type SQL } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { idempotencyKeys } from './idempotency.schema.js';

export type RunIdempotentResult<T> =
  | { kind: 'proceed'; status: number; body: T }
  | { kind: 'replay'; status: number; body: unknown }
  | { kind: 'conflict'; retryAfterSeconds: number }
  | { kind: 'reject' };

export function lockKeyFor(key: string, userId: string, endpoint: string): SQL<bigint> {
  return sql<bigint>`hashtext(${key} || ':' || ${userId} || ':' || ${endpoint})::bigint`;
}

export async function runIdempotent<T>(
  db: NodePgDatabase,
  params: { key: string; userId: string; endpoint: string; payloadHash: string },
  handler: () => Promise<{ status: number; body: T }>,
  options?: { timeoutSeconds?: number },
): Promise<RunIdempotentResult<T>> {
  const { key, userId, endpoint, payloadHash } = params;
  const timeoutSeconds = options?.timeoutSeconds ?? 30;
  const lockKey = lockKeyFor(key, userId, endpoint);
  const scope = and(
    eq(idempotencyKeys.key, key),
    eq(idempotencyKeys.userId, userId),
    eq(idempotencyKeys.endpoint, endpoint),
  );

  // Application-level bound, not a Postgres-side one: SET LOCAL transaction_timeout /
  // idle_in_transaction_session_timeout would bound the handler's idle time too (e.g. while
  // awaiting an external AI provider call, which statement_timeout alone does not cover), but
  // Postgres enforces both by terminating the whole connection, and that termination was observed
  // in testing to surface as an unhandled process-level exception through this exact drizzle +
  // node-postgres pooling setup — a crash risk strictly worse than the slow-handler problem this is
  // meant to solve. A client-side race is used instead: it never touches the connection, so it can
  // never crash the process, at the cost of not truly cancelling the abandoned transaction — if the
  // handler eventually finishes after we've already reported a timeout, it still commits normally.
  const timeout = new Promise<RunIdempotentResult<T>>((_, reject) => {
    setTimeout(() => reject(new Error(`runIdempotent timed out after ${timeoutSeconds}s`)), timeoutSeconds * 1000);
  });

  const transaction = db.transaction(async (tx): Promise<RunIdempotentResult<T>> => {
    const result = await tx.execute<{ locked: boolean }>(
      sql`SELECT pg_try_advisory_xact_lock(${lockKey}) AS locked`,
    );
    if (!result.rows[0].locked) {
      return { kind: 'conflict', retryAfterSeconds: 2 };
    }

    let row: typeof idempotencyKeys.$inferSelect | undefined = (
      await tx.select().from(idempotencyKeys).where(scope)
    )[0];

    if (row?.createdAt && row.createdAt.getTime() < Date.now() - 24 * 3600 * 1000) {
      await tx.delete(idempotencyKeys).where(scope);
      row = undefined;
    }

    if (row?.status === 'succeeded' || row?.status === 'failed_permanent') {
      if (row.payloadHash !== payloadHash) {
        return { kind: 'reject' };
      }
      return { kind: 'replay', status: row.responseStatus!, body: row.responseBody };
    }

    if (!row) {
      await tx.insert(idempotencyKeys).values({
        key,
        userId,
        endpoint,
        status: 'in_progress',
        payloadHash,
      });
    } else if (row.status === 'in_progress') {
      await tx.update(idempotencyKeys).set({ payloadHash, updatedAt: new Date() }).where(scope);
    } else {
      throw new Error(`Unexpected idempotency status: ${row.status}`);
    }

    const response = await handler();
    await tx.update(idempotencyKeys).set({
      status: 'succeeded',
      responseStatus: response.status,
      responseBody: response.body,
      updatedAt: new Date(),
    }).where(scope);

    return { kind: 'proceed', status: response.status, body: response.body };
  });

  return Promise.race([transaction, timeout]);
}
