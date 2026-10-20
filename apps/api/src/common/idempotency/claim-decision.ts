export type ClaimDecision =
  | { kind: 'claim' }
  | { kind: 'replay'; status: number; body: unknown }
  | { kind: 'reject' }
  | { kind: 'conflict'; retryAfterSeconds: 2 }
  | { kind: 'abandoned' };

/**
 * What to do with a request given the stored row for its (key, user, endpoint), read under the advisory lock.
 * An `in_progress` row is a claim held by a running handler while it is younger than the lease; past the lease the earlier
 * attempt is treated as interrupted (B0E1, owner 07/10/2026): the client starts over with a new key.
 */
export function decideClaim(
  row: { status: string; payloadHash: string; createdAt: Date; responseStatus: number | null; responseBody: unknown } | null,
  input: { payloadHash: string; now: Date; leaseSeconds: number },
): ClaimDecision {
  if (!row) {
    return { kind: 'claim' };
  }
  if (row.status === 'in_progress') {
    const leaseStart = input.now.getTime() - input.leaseSeconds * 1000;
    return row.createdAt.getTime() > leaseStart ? { kind: 'conflict', retryAfterSeconds: 2 } : { kind: 'abandoned' };
  }
  if (row.status === 'succeeded' || row.status === 'failed_permanent') {
    if (row.payloadHash !== input.payloadHash) {
      return { kind: 'reject' };
    }
    return { kind: 'replay', status: row.responseStatus!, body: row.responseBody };
  }
  throw new Error(`Unexpected idempotency status: ${row.status}`);
}
