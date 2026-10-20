import type { Clock } from '../../common/clock/clock.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import type { Prisma } from '../../generated/prisma/client.js';

export type CredentialOutcome = 'ok' | 'wrong' | 'locked' | 'stale' | 'account_locked';

/** 403 for a locked account; only a caller who proved the password ever sees it (design §4.5). */
export function accountLocked(): ProblemDetailsException {
  return new ProblemDetailsException({ status: 403, title: 'Account locked', type: 'account-locked' });
}

/** Caller holds withUserLock; Argon2 verification has already completed outside the transaction. */
export async function decideCredential(
  tx: Prisma.TransactionClient,
  input: { userId: string; verifiedHash: string; passwordMatched: boolean },
  clock: Clock,
): Promise<CredentialOutcome> {
  const user = await tx.user.findUnique({
    where: { id: input.userId }, include: { passwordCredential: true },
  });
  const now = clock.now();
  if (user?.loginLockedUntil && user.loginLockedUntil > now) return 'locked';
  if (!user?.passwordCredential || user.passwordCredential.hash !== input.verifiedHash) return 'stale';
  if (!input.passwordMatched) {
    const updated = await tx.user.update({
      where: { id: input.userId }, data: { failedLoginCount: { increment: 1 } },
    });
    if (updated.failedLoginCount >= 10) {
      await tx.user.update({ where: { id: input.userId }, data: {
        failedLoginCount: 0, loginLockedUntil: new Date(now.getTime() + 900_000),
      } });
      return 'locked';
    }
    return 'wrong';
  }
  // Read under the caller's user lock, so a lock committed while this request waited is seen here (FE10).
  if (user.status === 'locked') return 'account_locked';
  await tx.user.update({ where: { id: input.userId }, data: { failedLoginCount: 0 } });
  return 'ok';
}
