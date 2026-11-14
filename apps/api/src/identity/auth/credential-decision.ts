import type { Clock } from '../../common/clock/clock.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { Prisma } from '../../generated/prisma/client.js';

export type CredentialOutcome = 'ok' | 'wrong' | 'locked' | 'stale' | 'account_locked';

/** 403 for a locked account; only a caller who proved the password ever sees it (design §4.5). */
export function accountLocked(): ProblemDetailsException {
  return new ProblemDetailsException({ status: 403, title: 'Account locked', type: 'account-locked' });
}

export type CredentialDecision = { kind: CredentialOutcome; lockedUntil: Date | null; newlyLocked: boolean };

/**
 * Caller holds withUserLock; Argon2 verification has already completed outside the transaction.
 * The ten-wrong lock is kept per (account, client ip key), so a lock from one ip never blocks another (F4).
 */
export async function decideCredential(
  tx: Prisma.TransactionClient,
  input: { userId: string; verifiedHash: string; passwordMatched: boolean; ipKey: string },
  clock: Clock,
): Promise<CredentialDecision> {
  const outcome = (kind: CredentialOutcome): CredentialDecision => ({ kind, lockedUntil: null, newlyLocked: false });
  const user = await tx.user.findUnique({
    where: { id: input.userId }, include: { passwordCredential: true },
  });
  const now = clock.now();
  // IE11: a deleting account looks like any other failed login, whatever the password.
  if (user?.status === 'deleting') return outcome('stale');
  const key = { userId_ipKey: { userId: input.userId, ipKey: input.ipKey } };
  const failure = await tx.loginFailure.findUnique({ where: key });
  if (failure?.lockedUntil && failure.lockedUntil > now) return { kind: 'locked', lockedUntil: failure.lockedUntil, newlyLocked: false };
  if (!user?.passwordCredential || user.passwordCredential.hash !== input.verifiedHash) return outcome('stale');
  if (!input.passwordMatched) {
    const updated = await tx.loginFailure.upsert({ where: key,
      create: { userId: input.userId, ipKey: input.ipKey, failedCount: 1, updatedAt: now },
      update: { failedCount: { increment: 1 }, updatedAt: now } });
    if (updated.failedCount >= 10) {
      const lockedUntil = new Date(now.getTime() + 900_000);
      await tx.loginFailure.update({ where: key, data: { failedCount: 0, lockedUntil, updatedAt: now } });
      return { kind: 'locked', lockedUntil, newlyLocked: true };
    }
    return outcome('wrong');
  }
  // Read under the caller's user lock, so a lock committed while this request waited is seen here (FE10).
  if (user.status === 'locked') return outcome('account_locked');
  await tx.loginFailure.deleteMany({ where: { userId: input.userId, ipKey: input.ipKey } });
  return outcome('ok');
}
