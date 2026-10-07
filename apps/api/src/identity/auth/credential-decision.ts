import type { Clock } from '../../common/clock/clock.js';
import type { Prisma } from '../../generated/prisma/client.js';

export type CredentialOutcome = 'ok' | 'wrong' | 'locked' | 'stale';

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
  await tx.user.update({ where: { id: input.userId }, data: { failedLoginCount: 0 } });
  return 'ok';
}
